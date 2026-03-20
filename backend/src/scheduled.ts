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
	console.log('[Cron] Starting scheduled analysis job');

	const logId = await startLog(env);

	try {
		// 1. 미분석 업데이트 조회
		const unanalyzed = await env.DB.prepare(`
			SELECT u.id, u.source, u.title, u.content, u.author, u.published_at
			FROM updates u
			LEFT JOIN analyses a ON a.update_id = u.id
			WHERE a.id IS NULL
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
					// 2a. Gemini 분석
					const analysis = await analyzeWithGemini(env, update);

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

async function analyzeWithGemini(env: Env, update: UnanalyzedUpdate) {
	const sourceLabel = update.source === 'nexon' ? '넥슨 공식' : '디시인사이드';

	const prompt = `당신은 FPS 게임 '서든어택'의 전문 분석가입니다.
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

	const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;

	const response = await fetch(geminiUrl, {
		method: 'POST',
		headers: { 'Content-Type': 'application/json' },
		body: JSON.stringify({
			contents: [{ parts: [{ text: prompt }] }],
		}),
	});

	if (!response.ok) {
		throw new Error(`Gemini API error: ${response.status}`);
	}

	const result = await response.json() as any;
	const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

	// JSON 파싱 시도
	try {
		const jsonMatch = text.match(/\{[\s\S]*\}/);
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

	// 파싱 실패 시 기본값
	return {
		summary: text.slice(0, 500) || '분석 실패',
		sentiment: 'neutral',
		key_changes: [],
		community_reaction: '',
	};
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
