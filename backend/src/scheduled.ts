import { Env } from './index';

const ANALYSIS_BATCH_SIZE = 5;

interface UnanalyzedUpdate {
	id: number;
	source: string;
	title: string;
	content: string;
	author: string | null;
	published_at: string | null;
}

export async function handleScheduled(env: Env): Promise<void> {
	// 1단계: 숏츠 수집
	await collectShorts(env);

	// 2단계: 미분석 업데이트 분석
	console.log('[Cron] Starting scheduled analysis job');

	const logId = await startLog(env);

	try {
		// 1. 미분석 업데이트 조회 (3회 이상 실패한 항목 제외)
		const unanalyzed = await env.DB.prepare(`
			SELECT u.id, u.source, u.title, u.content, u.author, u.published_at
			FROM updates u
			LEFT JOIN analyses a ON a.update_id = u.id
			WHERE a.id IS NULL AND (u.analysis_retries IS NULL OR u.analysis_retries < 3)
			ORDER BY u.crawled_at ASC
			LIMIT 20
		`).all<UnanalyzedUpdate>();

		const rows = unanalyzed.results || [];

		if (rows.length === 0) {
			console.log('[Cron] No unanalyzed updates found');
			await finishLog(env, logId, 'success', 0);
			return;
		}

		console.log(`[Cron] Found ${rows.length} unanalyzed updates`);

		let processed = 0;

		// 2. 배치 처리
		for (let i = 0; i < rows.length; i += ANALYSIS_BATCH_SIZE) {
			const batch = rows.slice(i, i + ANALYSIS_BATCH_SIZE);

			for (const update of batch) {
				try {
					// 2a. Workers AI 분석
					const analysis = await analyzeWithWorkersAI(env, update);

					// 2b. D1에 분석 결과 저장
					await env.DB.prepare(`
						INSERT INTO analyses (update_id, summary, sentiment, key_changes, community_reaction)
						VALUES (?, ?, ?, ?, ?)
					`).bind(
						update.id,
						analysis.summary,
						analysis.sentiment,
						JSON.stringify(analysis.key_changes),
						analysis.community_reaction,
					).run();

					// 2c. Workers AI로 임베딩 생성
					const textToEmbed = `${update.title}\n${analysis.summary}`;
					const embeddingResult = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
						text: [textToEmbed],
					});

					const vector = embeddingResult.data[0];

					// 2d. Vectorize에 upsert
					await env.VECTOR_INDEX.upsert([{
						id: `update-${update.id}`,
						values: vector,
						metadata: {
							updateId: update.id,
							source: update.source,
							title: update.title,
							publishedAt: update.published_at || '',
						},
					}]);

					processed++;
					console.log(`[Cron] Processed update #${update.id}: ${update.title.slice(0, 50)}`);
				} catch (e: any) {
					console.error(`[Cron] Error processing update #${update.id}:`, e.message);
					// 에러 상세를 DB에 기록
					try {
						await env.DB.prepare(
							`UPDATE updates SET analysis_error = ?, analysis_retries = COALESCE(analysis_retries, 0) + 1 WHERE id = ?`
						).bind(e.message?.slice(0, 500) || 'Unknown error', update.id).run();
					} catch { }
				}
			}
		}

		await finishLog(env, logId, processed === rows.length ? 'success' : 'partial', processed);
		console.log(`[Cron] Completed: ${processed}/${rows.length} updates processed`);
	} catch (e: any) {
		console.error('[Cron] Fatal error:', e.message);
		await finishLog(env, logId, 'error', 0, e.message);
	}
}

function buildAnalysisPrompt(update: UnanalyzedUpdate): string {
	const sourceLabel = update.source === 'nexon' ? '넥슨 공식' : '디시인사이드';
	return `당신은 FPS 게임 '서든어택'의 전문 분석가입니다.
다음은 ${sourceLabel}에서 수집된 게시물입니다. 분석해주세요.

[제목] ${update.title}
[작성자] ${update.author || '알 수 없음'}
[날짜] ${update.published_at || '알 수 없음'}
[내용]
${update.content.slice(0, 3000)}

다음 JSON 형식으로만 응답하세요 (다른 텍스트 없이):
{
  "summary": "3-5문장으로 핵심 내용 요약",
  "sentiment": "positive/negative/neutral/mixed 중 하나",
  "key_changes": ["주요 변경사항1", "주요 변경사항2"],
  "community_reaction": "커뮤니티 반응 요약 (해당하는 경우)"
}`;
}

function parseAnalysisResponse(rawText: unknown) {
	const text = typeof rawText === 'string' ? rawText : JSON.stringify(rawText || '');
	try {
		// 코드블록 안의 JSON 먼저 추출
		const codeBlock = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		const cleanText = codeBlock ? codeBlock[1] : text;
		const jsonMatch = cleanText.match(/\{[\s\S]*\}/);
		if (jsonMatch) {
			const parsed = JSON.parse(jsonMatch[0]);
			return {
				summary: parsed.summary || '분석 실패',
				sentiment: ['positive', 'negative', 'neutral', 'mixed'].includes(parsed.sentiment) ? parsed.sentiment : 'neutral',
				key_changes: Array.isArray(parsed.key_changes) ? parsed.key_changes : [],
				community_reaction: parsed.community_reaction || '',
			};
		}
	} catch { }
	return {
		summary: text.slice(0, 500) || '분석 실패',
		sentiment: 'neutral' as const,
		key_changes: [] as string[],
		community_reaction: '',
	};
}

async function analyzeWithWorkersAI(env: Env, update: UnanalyzedUpdate) {
	const prompt = buildAnalysisPrompt(update);

	const result = await env.AI.run('@cf/meta/llama-3.3-70b-instruct-fp8-fast' as any, {
		messages: [
			{ role: 'system', content: '한국어 JSON으로만 응답하라. 다른 텍스트 없이 JSON만 출력하라.' },
			{ role: 'user', content: prompt },
		],
		max_tokens: 1024,
	}) as any;

	let text = '';
	try {
		const obj = JSON.parse(JSON.stringify(result));
		text = obj.response || obj.choices?.[0]?.message?.content || '';
	} catch { }

	return parseAnalysisResponse(text);
}

// ─── 숏츠 자동 수집 ───

async function collectShorts(env: Env): Promise<void> {
	console.log('[Shorts] Starting shorts collection');

	try {
		const channels = await env.DB.prepare(
			'SELECT id, channel_id, channel_name FROM shorts_channels'
		).all<{ id: number; channel_id: string; channel_name: string }>();

		const rows = channels.results || [];
		if (rows.length === 0) return;

		let totalAdded = 0;

		for (const channel of rows) {
			try {
				// YouTube RSS 피드에서 최근 영상 가져오기
				const feedUrl = `https://www.youtube.com/feeds/videos.xml?channel_id=${channel.channel_id}`;
				const response = await fetch(feedUrl);
				if (!response.ok) {
					console.error(`[Shorts] Feed fetch failed for ${channel.channel_name}: ${response.status}`);
					continue;
				}

				const xml = await response.text();

				// XML에서 videoId 추출
				const videoIds = [...xml.matchAll(/<yt:videoId>([^<]+)<\/yt:videoId>/g)].map(m => m[1]);
				const titles = [...xml.matchAll(/<media:title>([^<]+)<\/media:title>/g)].map(m => m[1]);

				for (let i = 0; i < videoIds.length; i++) {
					const videoId = videoIds[i];
					const title = titles[i] || '';
					const youtubeUrl = `https://www.youtube.com/shorts/${videoId}`;

					// 숏츠인지 확인 (oEmbed로 체크 — shorts URL이 리다이렉트 안 되면 숏츠)
					try {
						const checkRes = await fetch(`https://www.youtube.com/oembed?url=https://www.youtube.com/shorts/${videoId}&format=json`, {
							redirect: 'follow',
						});
						if (!checkRes.ok) continue; // 숏츠가 아님
					} catch {
						continue;
					}

					// 중복 체크
					const existing = await env.DB.prepare(
						'SELECT id FROM shorts WHERE youtube_url LIKE ? OR youtube_url LIKE ?'
					).bind(`%${videoId}%`, `%${videoId}%`).first();

					if (existing) continue;

					// 저장
					const thumbnail = `https://img.youtube.com/vi/${videoId}/0.jpg`;
					await env.DB.prepare(
						'INSERT INTO shorts (title, youtube_url, thumbnail, added_by) VALUES (?, ?, ?, ?)'
					).bind(title, youtubeUrl, thumbnail, channel.channel_name).run();

					totalAdded++;
					console.log(`[Shorts] Added: ${title} from ${channel.channel_name}`);
				}

				// last_checked_at 갱신
				await env.DB.prepare(
					'UPDATE shorts_channels SET last_checked_at = datetime("now") WHERE id = ?'
				).bind(channel.id).run();
			} catch (e: any) {
				console.error(`[Shorts] Error for ${channel.channel_name}:`, e.message);
			}
		}

		console.log(`[Shorts] Completed: ${totalAdded} new shorts added`);
	} catch (e: any) {
		console.error('[Shorts] Fatal error:', e.message);
	}
}

async function startLog(env: Env): Promise<number> {
	const result = await env.DB.prepare(
		`INSERT INTO crawl_logs (trigger_type, status) VALUES ('cron', 'started') RETURNING id`
	).first<{ id: number }>();
	return result?.id || 0;
}

async function finishLog(env: Env, logId: number, status: string, recordsAdded: number, errorMessage?: string): Promise<void> {
	await env.DB.prepare(
		`UPDATE crawl_logs SET status = ?, records_added = ?, error_message = ?, finished_at = datetime('now') WHERE id = ?`
	).bind(status, recordsAdded, errorMessage || null, logId).run();
}
