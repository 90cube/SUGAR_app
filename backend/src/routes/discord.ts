import { Env } from '../index';

const DISCORD_PUBLIC_KEY = '6f225eca9ab56e39c31f1a35b899d2bda7723a5340314fd2f993d9ac9f2bbb9e';
const APP_ID = '1372841428325236816';
const DISCORD_API = 'https://discord.com/api/v10';

// Discord Interaction Types
const PING = 1;
const APPLICATION_COMMAND = 2;

// Discord Response Types
const PONG = 1;
const CHANNEL_MESSAGE = 4;
const DEFERRED_CHANNEL_MESSAGE = 5;

// Ed25519 서명 검증
async function verifyDiscordSignature(request: Request, body: string): Promise<boolean> {
	const signature = request.headers.get('X-Signature-Ed25519');
	const timestamp = request.headers.get('X-Signature-Timestamp');
	if (!signature || !timestamp) return false;

	const key = await crypto.subtle.importKey(
		'raw',
		hexToUint8Array(DISCORD_PUBLIC_KEY),
		{ name: 'Ed25519', namedCurve: 'Ed25519' },
		false,
		['verify'],
	);

	const encoder = new TextEncoder();
	const message = encoder.encode(timestamp + body);
	const sig = hexToUint8Array(signature);

	return crypto.subtle.verify('Ed25519', key, sig, message);
}

function hexToUint8Array(hex: string): Uint8Array {
	const bytes = new Uint8Array(hex.length / 2);
	for (let i = 0; i < hex.length; i += 2) {
		bytes[i / 2] = parseInt(hex.substring(i, i + 2), 16);
	}
	return bytes;
}

// Discord followup 메시지 전송 (deferred 응답 후 실제 내용 전달)
async function sendFollowup(env: Env, interactionToken: string, content: string): Promise<void> {
	await fetch(`${DISCORD_API}/webhooks/${APP_ID}/${interactionToken}`, {
		method: 'POST',
		headers: {
			'Content-Type': 'application/json',
			'User-Agent': 'DiscordBot (https://suddenlab.app, 1.0)',
		},
		body: JSON.stringify({ content }),
	});
}

// Vectorize에서 관련 게시물 검색
async function searchContext(env: Env, query: string): Promise<string> {
	try {
		const embeddingResult = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
			text: [query],
		});
		const vector = embeddingResult.data[0];
		const results = await env.VECTOR_INDEX.query(vector, { topK: 3, returnMetadata: 'all' });

		if (!results.matches || results.matches.length === 0) return '';

		const ids = results.matches.map(m => m.metadata?.updateId).filter(Boolean);
		if (ids.length === 0) return '';

		const placeholders = ids.map(() => '?').join(',');
		const dbResults = await env.DB.prepare(`
			SELECT u.title, u.content, a.summary FROM updates u
			LEFT JOIN analyses a ON a.update_id = u.id
			WHERE u.id IN (${placeholders})
		`).bind(...ids).all();

		return (dbResults.results || []).map((r: any) =>
			`[${r.title}] ${r.summary || r.content?.slice(0, 200)}`
		).join('\n');
	} catch {
		return '';
	}
}

// KV에서 대화 히스토리 로드
type ChatMessage = { role: 'system' | 'user' | 'assistant'; content: string };

async function loadChatHistory(env: Env, channelId: string): Promise<ChatMessage[]> {
	try {
		const data = await env.CHAT_HISTORY.get(`chat:${channelId}`, 'json');
		return (data as ChatMessage[]) || [];
	} catch {
		return [];
	}
}

// KV에 대화 히스토리 저장 (최근 20개 메시지만 유지, 1시간 TTL)
async function saveChatHistory(env: Env, channelId: string, messages: ChatMessage[]): Promise<void> {
	const trimmed = messages.slice(-20);
	await env.CHAT_HISTORY.put(`chat:${channelId}`, JSON.stringify(trimmed), { expirationTtl: 3600 });
}

// ── 웹 검색 (DuckDuckGo HTML, API 키 불필요) ──────────
async function searchWeb(query: string): Promise<string> {
	try {
		const url = `https://html.duckduckgo.com/html/?q=${encodeURIComponent(query)}`;
		const res = await fetch(url, {
			headers: {
				'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36',
			},
		});
		const html = await res.text();

		// DuckDuckGo HTML 결과에서 snippet 추출
		const snippets: string[] = [];
		const resultRegex = /<a class="result__snippet"[^>]*>([\s\S]*?)<\/a>/gi;
		let match;
		while ((match = resultRegex.exec(html)) !== null && snippets.length < 5) {
			const text = match[1].replace(/<[^>]*>/g, '').replace(/&amp;/g, '&').replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&quot;/g, '"').replace(/&#x27;/g, "'").trim();
			if (text.length > 20) snippets.push(text);
		}

		// snippet이 없으면 result__a (제목) 추출 시도
		if (snippets.length === 0) {
			const titleRegex = /<a class="result__a"[^>]*>([\s\S]*?)<\/a>/gi;
			while ((match = titleRegex.exec(html)) !== null && snippets.length < 5) {
				const text = match[1].replace(/<[^>]*>/g, '').trim();
				if (text.length > 5) snippets.push(text);
			}
		}

		return snippets.length > 0 ? snippets.join('\n') : '';
	} catch (err) {
		console.error('[WebSearch Error]', err);
		return '';
	}
}

// Nemotron 멀티턴 채팅
async function chatWithAI(env: Env, userMessage: string, userName: string, channelId?: string): Promise<string> {
	// DB 벡터 검색 + 웹 검색 병렬 실행
	const [context, webResults] = await Promise.all([
		searchContext(env, userMessage),
		searchWeb(userMessage),
	]);

	const systemPrompt = `당신은 "MumbleCUBE"라는 이름의 FPS 게임 '서든어택' 전문 디스코드 봇입니다.
서든어택 게임, 밸런스, 메타, 무기, 맵, 패치, 커뮤니티 동향에 대해 잘 알고 있습니다.
한국어로 친근하게 대화하세요. 디시인사이드 서든어택 갤러리 문화도 이해합니다.
일반적인 질문(IT, 시사, 상식 등)에도 웹 검색 결과를 참고해서 답변할 수 있습니다.
모르는 건 모른다고 솔직하게 말하세요. 답변은 디스코드 메시지이므로 300자 이내로 짧게.
대화하는 유저: ${userName}

${context ? `[커뮤니티 DB 참고]\n${context}` : ''}
${webResults ? `[웹 검색 결과]\n${webResults}` : ''}`;

	// 멀티턴: KV에서 이전 대화 로드
	let history: ChatMessage[] = [];
	if (channelId) {
		history = await loadChatHistory(env, channelId);
	}

	// 메시지 배열 구성
	const messages: ChatMessage[] = [
		{ role: 'system', content: systemPrompt },
		...history,
		{ role: 'user', content: `[${userName}] ${userMessage}` },
	];

	let aiResponse = '';

	// Nemotron (Workers AI)
	try {
		const result: any = await env.AI.run('@cf/nvidia/llama-3.1-nemotron-70b-instruct' as any, {
			messages,
			max_tokens: 600,
		});
		aiResponse = result.response || '';
		if (!aiResponse) throw new Error('Empty Nemotron response');
	} catch (e: any) {
		console.error('[Discord AI] Nemotron failed:', e.message);
		return '죄송해요, AI 오류가 발생했어요. 다시 시도해 주세요!';
	}

	aiResponse = aiResponse.slice(0, 1900);

	// 멀티턴: 대화 기록 업데이트
	if (channelId) {
		history.push({ role: 'user', content: `[${userName}] ${userMessage}` });
		history.push({ role: 'assistant', content: aiResponse });
		await saveChatHistory(env, channelId, history);
	}

	return aiResponse;
}

// 통계 조회
async function getStats(env: Env): Promise<string> {
	try {
		const total = await env.DB.prepare('SELECT COUNT(*) as c FROM updates').first<{ c: number }>();
		const analyzed = await env.DB.prepare('SELECT COUNT(*) as c FROM analyses').first<{ c: number }>();
		const bySrc = await env.DB.prepare('SELECT source, COUNT(*) as c FROM updates GROUP BY source').all();
		const recentLog = await env.DB.prepare('SELECT * FROM crawl_logs ORDER BY started_at DESC LIMIT 1').first<any>();

		const srcLines = (bySrc.results || []).map(r => `  - ${r.source}: ${r.c}건`).join('\n');
		const logLine = recentLog
			? `마지막 크롤링: ${recentLog.started_at} (${recentLog.status}, +${recentLog.records_added}건)`
			: '크롤링 기록 없음';

		return `📊 **서든랩 통계**\n\n전체 게시물: ${total?.c || 0}건\n분석 완료: ${analyzed?.c || 0}건\n\n소스별:\n${srcLines}\n\n${logLine}`;
	} catch (e: any) {
		return `통계 조회 오류: ${e.message}`;
	}
}

// 크롤링 상태
async function getCrawlStatus(env: Env): Promise<string> {
	try {
		const stats = await env.DB.prepare('SELECT COUNT(*) as total FROM updates').first<{ total: number }>();
		const unanalyzed = await env.DB.prepare(`
			SELECT COUNT(*) as count FROM updates u
			LEFT JOIN analyses a ON a.update_id = u.id
			WHERE a.id IS NULL
		`).first<{ count: number }>();

		return `📊 현재 상태:\n- 전체 게시물: ${stats?.total || 0}건\n- 미분석: ${unanalyzed?.count || 0}건\n\n크롤링은 N8N 스케줄 (08:05/20:05)에 자동 실행됩니다.`;
	} catch (e: any) {
		return `오류: ${e.message}`;
	}
}

export async function handleDiscordInteraction(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
	const body = await request.text();

	// 서명 검증
	const isValid = await verifyDiscordSignature(request, body);
	if (!isValid) {
		return new Response('Invalid signature', { status: 401 });
	}

	const interaction = JSON.parse(body);

	// PING → PONG
	if (interaction.type === PING) {
		return Response.json({ type: PONG });
	}

	// 슬래시 커맨드
	if (interaction.type === APPLICATION_COMMAND) {
		const commandName = interaction.data.name;
		const userName = interaction.member?.user?.username || interaction.user?.username || 'unknown';
		const token = interaction.token;

		// /chat → Deferred 응답 (3초 초과 가능하므로)
		if (commandName === 'chat') {
			const message = interaction.data.options?.[0]?.value || '';
			const channelId = interaction.channel_id || '';
			if (!message) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '메시지를 입력해주세요! `/chat 안녕하세요`' },
				});
			}

			// 즉시 "생각 중..." 응답 반환, 백그라운드에서 AI 처리
			ctx.waitUntil((async () => {
				try {
					const aiResponse = await chatWithAI(env, message, userName, channelId);
					await sendFollowup(env, token, aiResponse);
				} catch (e: any) {
					await sendFollowup(env, token, '응답 생성에 실패했어요.');
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /stats → 빠르므로 즉시 응답
		if (commandName === 'stats') {
			ctx.waitUntil((async () => {
				const msg = await getStats(env);
				await sendFollowup(env, token, msg);
			})());
			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /crawl
		if (commandName === 'crawl') {
			ctx.waitUntil((async () => {
				const msg = await getCrawlStatus(env);
				await sendFollowup(env, token, msg);
			})());
			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /write → DB에서 관련 데이터 검색 → AI가 게시글 작성 → 커뮤니티에 자동 게시
		if (commandName === 'write') {
			const topic = interaction.data.options?.[0]?.value || '';
			if (!topic) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '주제를 입력해주세요! `/write 3월 패치 요약`' },
				});
			}

			ctx.waitUntil((async () => {
				try {
					const post = await writeAndPublish(env, topic, userName);
					await sendFollowup(env, token, post);
				} catch (e: any) {
					await sendFollowup(env, token, `게시글 작성 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /poll → 밸런스 여론조사 생성
		if (commandName === 'poll') {
			const rawTopic = interaction.data.options?.[0]?.value || '';
			if (!rawTopic) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '패치 내용을 대충 적어주세요! `/poll AK 데미지 5% 너프, SG 연사속도 버프`' },
				});
			}

			ctx.waitUntil((async () => {
				try {
					// AI로 여론조사 게시글 가공 (think 모드 비활성화)
					const result: any = await env.AI.run('@cf/google/gemma-4-26b-a4b-it' as any, {
						messages: [
							{ role: 'system', content: `Do not use <think> tags or internal reasoning. Respond directly.

서든어택 커뮤니티 "서든랩"의 밸런스 여론조사 에디터입니다.
유저가 대충 적은 패치 방향성을 깔끔한 여론조사 게시글로 가공하세요.

규칙:
- 제목: "[🗳️ 밸런스 투표] ..." 형식, 25자 이내
- 본문: 마크다운, 200-400자
- 변경사항을 항목별로 정리
- 마지막에 "어떻게 생각하시나요? 아래 반응으로 투표해주세요!" 추가
- 🎉=극락 👍=괜찮음 😐=모르겠음 🤷=글쎄 👎=별로 💀=나락 설명 포함

JSON: {"title": "제목", "content": "본문"}
JSON만 출력.` },
							{ role: 'user', content: rawTopic },
						],
						max_tokens: 800,
					});

					let title = '', content = '';
					const text = result.response || '';

					// JSON 파싱
					const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
					const jsonStr = codeMatch ? codeMatch[1] : text.match(/\{[\s\S]*\}/)?.[0];
					if (jsonStr) {
						try {
							const parsed = JSON.parse(jsonStr);
							title = parsed.title || '';
							content = parsed.content || '';
						} catch {}
					}

					// fallback
					if (!title) title = `[🗳️ 밸런스 투표] ${rawTopic.slice(0, 25)}`;
					if (!content) content = `**패치 방향성**\n\n${rawTopic}\n\n---\n어떻게 생각하시나요? 아래 반응으로 투표해주세요!\n🎉 극락 | 👍 괜찮음 | 😐 모르겠음 | 🤷 글쎄 | 👎 별로 | 💀 나락`;

					// DB 저장 (source = 'poll')
					await env.DB.prepare(`
						INSERT INTO updates (source, external_id, title, content, author, url, published_at, crawled_at, visibility)
						VALUES ('poll', ?, ?, ?, ?, 'https://suddenlab.cc/#community', ?, datetime('now'), 'public')
					`).bind(
						`poll_${Date.now()}`,
						title,
						content,
						userName,
						new Date().toISOString().slice(0, 10),
					).run();

					await sendFollowup(env, token, `✅ **여론조사 발행 완료!**\n\n${title}\n\n${content.slice(0, 400)}\n\n🔗 [서든랩에서 투표하기](https://suddenlab.cc/#community)`);
				} catch (e: any) {
					await sendFollowup(env, token, `여론조사 생성 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /shorts → 유튜브 숏츠 URL 등록
		if (commandName === 'shorts') {
			const ytUrl = interaction.data.options?.[0]?.value || '';
			const title = interaction.data.options?.[1]?.value || '서든어택 숏츠';
			if (!ytUrl) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '유튜브 URL을 입력해주세요! `/shorts https://youtube.com/shorts/...`' },
				});
			}

			ctx.waitUntil((async () => {
				try {
					const ytMatch = ytUrl.match(/(?:shorts\/|v=|youtu\.be\/)([a-zA-Z0-9_-]{11})/);
					const ytId = ytMatch ? ytMatch[1] : null;
					const thumbnail = ytId ? `https://img.youtube.com/vi/${ytId}/0.jpg` : null;
					await env.DB.prepare('INSERT INTO shorts (title, youtube_url, thumbnail, added_by) VALUES (?, ?, ?, ?)')
						.bind(title, ytUrl, thumbnail, userName).run();
					await sendFollowup(env, token, `✅ **숏츠 등록 완료!**\n\n🎬 **${title}**\n🔗 ${ytUrl}\n\n[서든랩에서 보기](https://suddenlab.cc/#community)`);
				} catch (e: any) {
					await sendFollowup(env, token, `숏츠 등록 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /shorts-add → 숏츠 크롤링 채널 등록
		if (commandName === 'shorts-add') {
			const channelUrl = interaction.data.options?.[0]?.value || '';
			if (!channelUrl) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '채널 URL을 입력해주세요! `/shorts-add https://youtube.com/@채널명`' },
				});
			}

			ctx.waitUntil((async () => {
				try {
					// YouTube 채널 페이지에서 channelId 추출
					const res = await fetch(channelUrl, { redirect: 'follow' });
					const html = await res.text();
					const cidMatch = html.match(/"externalId":"([UC][a-zA-Z0-9_-]{22})"/);
					const nameMatch = html.match(/"title":"([^"]+)"/);

					if (!cidMatch) {
						await sendFollowup(env, token, '❌ 채널 ID를 찾을 수 없어요. YouTube 채널 URL인지 확인해주세요.');
						return;
					}

					const channelId = cidMatch[1];
					const channelName = nameMatch ? nameMatch[1] : channelUrl;

					await env.DB.prepare('INSERT OR IGNORE INTO shorts_channels (channel_id, channel_name, channel_url, added_by) VALUES (?, ?, ?, ?)')
						.bind(channelId, channelName, channelUrl, userName).run();

					await sendFollowup(env, token, `✅ **숏츠 채널 등록 완료!**\n\n📺 **${channelName}**\n🔗 ${channelUrl}\n🆔 \`${channelId}\`\n\n다음 크론(08:05/20:05)부터 자동으로 새 숏츠를 수집합니다.`);
				} catch (e: any) {
					await sendFollowup(env, token, `채널 등록 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /shorts-list → 등록된 숏츠 채널 목록
		if (commandName === 'shorts-list') {
			ctx.waitUntil((async () => {
				try {
					const rows = await env.DB.prepare('SELECT channel_name, channel_url, added_by, created_at FROM shorts_channels ORDER BY id').all();
					const channels = rows.results || [];

					if (channels.length === 0) {
						await sendFollowup(env, token, '📺 등록된 숏츠 채널이 없습니다.\n`/shorts-add` 로 추가하세요.');
						return;
					}

					const list = channels.map((c: any, i: number) =>
						`**${i + 1}.** ${c.channel_name} ${c.channel_url ? `([링크](${c.channel_url}))` : ''} _by ${c.added_by}_`
					).join('\n');

					await sendFollowup(env, token, `📺 **등록된 숏츠 채널 (${channels.length}개)**\n\n${list}\n\n새 채널 추가: \`/shorts-add URL\``);
				} catch (e: any) {
					await sendFollowup(env, token, `목록 조회 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /abuse → 어뷰징 리포트
		if (commandName === 'abuse') {
			ctx.waitUntil((async () => {
				try {
					const { getAbuseReport } = await import('./reactions');
					const report = await getAbuseReport(env);
					await sendFollowup(env, token, report);
				} catch (e: any) {
					await sendFollowup(env, token, `리포트 조회 실패: ${e.message}`);
				}
			})());
			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		// /help → 명령어 목록
		if (commandName === 'help') {
			return Response.json({
				type: CHANNEL_MESSAGE,
				data: { content: `📋 **서든랩 봇 명령어**\n\n💬 **대화**\n\`/chat\` — AI와 서든어택 관련 대화\n\n📊 **정보**\n\`/stats\` — 커뮤니티 통계\n\`/crawl\` — 크롤링 상태 확인\n\`/abuse\` — 투표 어뷰징 리포트\n\n📝 **게시글**\n\`/write 주제\` — AI가 주제 기반 게시글 작성 → 커뮤니티에 발행\n\`/poll 패치내용\` — 밸런스 여론조사 생성 (나락↔극락 투표)\n\n🎬 **숏츠**\n\`/shorts URL [제목]\` — 숏츠 수동 등록\n\`/shorts-add 채널URL\` — 자동 수집 채널 추가\n\`/shorts-list\` — 등록 채널 목록\n\`/shorts-remove 이름\` — 채널 제거\n\n🔗 [서든랩](https://suddenlab.cc)` },
			});
		}

		// /anomaly → KV 기반 커맨드 큐 (로컬 봇이 폴링)
		if (commandName === 'anomaly') {
			const subcommand = interaction.data.options?.[0]?.name || '';

			if (subcommand === 'start') {
				await env.CHAT_HISTORY.put('anomaly:command', JSON.stringify({
					command: 'start',
					requestedBy: userName,
					timestamp: Date.now(),
					channelId: interaction.channel_id || '',
				}), { expirationTtl: 300 });

				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '`[Anomaly]` 🔍 이벤트 어뷰징 스캔 시작 명령 전달됨. 봇이 5분 간격으로 조사합니다.' },
				});
			}

			if (subcommand === 'stop') {
				await env.CHAT_HISTORY.put('anomaly:command', JSON.stringify({
					command: 'stop',
					requestedBy: userName,
					timestamp: Date.now(),
				}), { expirationTtl: 300 });

				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '`[Anomaly]` ⏹️ 스캔 중지 명령 전달됨.' },
				});
			}

			if (subcommand === 'status') {
				const statusData = await env.CHAT_HISTORY.get('anomaly:status', 'text');
				const statusMsg = statusData || '상태 정보 없음 (봇이 아직 보고하지 않았습니다)';
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: `\`[Anomaly]\` 📊 ${statusMsg}` },
				});
			}

			return Response.json({
				type: CHANNEL_MESSAGE,
				data: { content: '`[Anomaly]` 사용법: `/anomaly start`, `/anomaly stop`, `/anomaly status`' },
			});
		}

		// /shorts-remove → 채널 이름으로 제거
		if (commandName === 'shorts-remove') {
			const name = interaction.data.options?.[0]?.value || '';
			if (!name) {
				return Response.json({
					type: CHANNEL_MESSAGE,
					data: { content: '채널 이름을 입력해주세요! `/shorts-remove 혜성`\n`/shorts-list`로 목록 확인 가능' },
				});
			}

			ctx.waitUntil((async () => {
				try {
					// 이름에 포함된 채널 찾기 (부분 매칭)
					const found = await env.DB.prepare('SELECT id, channel_name FROM shorts_channels WHERE channel_name LIKE ?')
						.bind(`%${name}%`).all();
					const matches = found.results || [];

					if (matches.length === 0) {
						await sendFollowup(env, token, `❌ "${name}"과 일치하는 채널을 찾을 수 없어요.\n\`/shorts-list\`로 목록을 확인해주세요.`);
						return;
					}

					if (matches.length > 1) {
						const list = matches.map((m: any) => `• ${m.channel_name}`).join('\n');
						await sendFollowup(env, token, `⚠️ "${name}"에 일치하는 채널이 ${matches.length}개 있어요. 더 정확한 이름을 입력해주세요:\n\n${list}`);
						return;
					}

					const target = matches[0] as any;
					await env.DB.prepare('DELETE FROM shorts_channels WHERE id = ?').bind(target.id).run();
					await sendFollowup(env, token, `✅ **${target.channel_name}** 채널이 숏츠 수집 목록에서 제거되었습니다.`);
				} catch (e: any) {
					await sendFollowup(env, token, `제거 실패: ${e.message}`);
				}
			})());

			return Response.json({ type: DEFERRED_CHANNEL_MESSAGE });
		}

		return Response.json({
			type: CHANNEL_MESSAGE,
			data: { content: `알 수 없는 명령어: \`/${commandName}\`` },
		});
	}

	return Response.json({ type: PONG });
}

// 메시지 분류: 봇이 답해야 하는 질문인지 판단 (일반 질문도 허용)
export async function handleClassify(request: Request, env: Env): Promise<Response> {
	let body: { message: string };
	try {
		body = await request.json() as any;
	} catch {
		return Response.json({ respond: false });
	}

	const msg = body.message?.trim();
	if (!msg) return Response.json({ respond: false });

	const lower = msg.toLowerCase();

	// 무시할 패턴: 순수 일상 잡담 (짧은 인사/감탄사)
	const ignorePatterns = ['ㅋㅋ', 'ㅎㅎ', 'ㅇㅇ', 'ㄴㄴ', 'ㄹㅇ', 'ㅇㅋ', 'ㅊㅊ'];
	if (msg.length <= 4 && ignorePatterns.some(p => lower.includes(p))) {
		return Response.json({ respond: false, reason: 'noise' });
	}

	// 물음표가 있으면 → 질문이므로 응답
	if (msg.includes('?') || msg.includes('？')) {
		return Response.json({ respond: true, reason: 'question' });
	}

	// 질문/요청 패턴 감지
	const questionPatterns = ['뭐야', '뭔가', '알려', '설명', '어때', '어떻게', '왜', '언제', '누가',
		'얼마', '있어', '없어', '해줘', '해주세요', '알아', '모르', '궁금', '추천', '비교',
		'차이', '방법', '어디', '몇', '할까', '될까', '인가', '건가', '나요', '까요', '가요'];
	const hasQuestion = questionPatterns.some(p => lower.includes(p));
	if (hasQuestion) {
		return Response.json({ respond: true, reason: 'question_pattern' });
	}

	// 게임 키워드
	const gameKeywords = ['서든', '메타', '패치', '업데이트', '밸런스', '무기', '맵', '핵', '치트',
		'넥슨', '점검', '이벤트', '버그', '데미지', '총', '클랜', 'ak', 'sr', 'sg', '저격',
		'스나', '샷건', '돌격', '폭파', '팀데스', '솔랭', '랭크', '티어', '매칭', '서버',
		'렉', '프레임', '옵션', '설정', '스킨', '캐릭터', '모드', '대회', '겜', '게임', 'fps'];
	if (gameKeywords.some(k => lower.includes(k))) {
		return Response.json({ respond: true, reason: 'game_keyword' });
	}

	// 길이가 충분하면 (10자 이상) 일반 질문으로 간주
	if (msg.length >= 10) {
		return Response.json({ respond: true, reason: 'general_message' });
	}

	return Response.json({ respond: false, reason: 'too_short' });
}

// N8N에서 호출: 채팅 메시지에 AI 답변 생성 (멀티턴 지원)
export async function handleChatAPI(request: Request, env: Env): Promise<Response> {
	let body: { message: string; username?: string; channelId?: string };
	try {
		body = await request.json() as any;
	} catch {
		return Response.json({ error: 'Invalid JSON' }, { status: 400 });
	}

	const response = await chatWithAI(env, body.message, body.username || 'user', body.channelId);
	return Response.json({ response });
}

// /write: DB에서 관련 데이터 검색 → AI가 커뮤니티 게시글 작성 → DB에 저장
async function writeAndPublish(env: Env, topic: string, author: string): Promise<string> {
	// 1. Vectorize로 관련 게시물 검색
	const context = await searchContext(env, topic);

	// 2. DB에서 최근 게시물도 가져오기
	const recent = await env.DB.prepare(`
		SELECT u.title, u.content, a.summary, u.published_at, u.source
		FROM updates u LEFT JOIN analyses a ON a.update_id = u.id
		ORDER BY u.id DESC LIMIT 10
	`).all();

	const recentContext = (recent.results || []).map((r: any) =>
		`[${r.source}] ${r.title} (${r.published_at || '날짜불명'}): ${r.summary || r.content?.slice(0, 200) || ''}`
	).join('\n');

	// 3. AI로 게시글 작성
	const systemPrompt = `당신은 서든어택 커뮤니티 "서든랩"의 에디터입니다.
주어진 데이터를 기반으로 커뮤니티 게시글을 작성하세요.

규칙:
- 제목은 눈에 띄고 간결하게 (30자 이내)
- 본문은 마크다운 형식, 300-500자
- 데이터에 기반한 팩트만 작성
- 커뮤니티에 도움되는 정보 위주
- 마지막에 출처(넥슨 공식/디시인사이드) 표기
- 톤: 친근하지만 정보성

JSON으로 출력: {"title": "제목", "content": "본문 마크다운", "source": "nexon 또는 dcinside 또는 editorial"}`;

	const userPrompt = `주제: ${topic}

[벡터 검색 관련 데이터]
${context || '관련 데이터 없음'}

[최근 게시물]
${recentContext}

위 데이터를 참고해서 "${topic}" 주제의 커뮤니티 게시글을 작성하세요. JSON만 출력.`;

	// JSON 파싱 헬퍼
	function tryParseJSON(text: string): any {
		if (!text) return null;
		// 1. ```json 블록
		const codeMatch = text.match(/```(?:json)?\s*([\s\S]*?)```/);
		if (codeMatch) try { return JSON.parse(codeMatch[1]); } catch {}
		// 2. {} 매칭
		const jsonMatch = text.match(/\{[\s\S]*\}/);
		if (jsonMatch) try { return JSON.parse(jsonMatch[0]); } catch {}
		return null;
	}

	let aiResult: any = null;
	let rawText = '';

	// Nemotron (Workers AI)
	try {
		const result: any = await env.AI.run('@cf/nvidia/llama-3.1-nemotron-70b-instruct' as any, {
			messages: [
				{ role: 'system', content: systemPrompt },
				{ role: 'user', content: userPrompt },
			],
			max_tokens: 1500,
		});
		rawText = result.response || '';
		aiResult = tryParseJSON(rawText);
	} catch (e: any) {
		console.error('[Write] Nemotron failed:', e.message);
	}

	// 2차: 텍스트 fallback - JSON 파싱 실패해도 텍스트 그대로 게시
	if (!aiResult?.title && rawText) {
		const lines = rawText.split('\n').filter((l: string) => l.trim());
		aiResult = {
			title: topic.slice(0, 30),
			content: rawText.slice(0, 1500),
			source: 'editorial',
		};
	}

	if (!aiResult?.title) throw new Error('AI 응답을 받지 못했습니다');

	// 4. DB에 게시글 저장
	const externalId = `editorial_${Date.now()}`;
	await env.DB.prepare(`
		INSERT INTO updates (source, external_id, title, content, author, url, published_at, crawled_at, visibility)
		VALUES (?, ?, ?, ?, ?, ?, ?, datetime('now'), 'public')
	`).bind(
		aiResult.source || 'editorial',
		externalId,
		aiResult.title,
		aiResult.content,
		author,
		`https://suddenlab.cc/#community`,
		new Date().toISOString().slice(0, 10),
	).run();

	return `✅ **게시글 발행 완료!**\n\n📝 **${aiResult.title}**\n\n${aiResult.content.slice(0, 500)}\n\n🔗 [서든랩에서 보기](https://suddenlab.cc/#community)`;
}

// 슬래시 커맨드 등록
export async function registerDiscordCommands(env: Env): Promise<Response> {
	const commands = [
		{
			name: 'chat',
			description: 'MumbleCUBE AI와 대화합니다',
			options: [{ name: 'message', description: '대화 내용', type: 3, required: true }],
		},
		{ name: 'stats', description: '서든랩 커뮤니티 통계를 확인합니다' },
		{ name: 'crawl', description: '크롤링 상태를 확인합니다' },
		{
			name: 'write',
			description: '주제를 지정하면 AI가 커뮤니티 게시글을 작성합니다',
			options: [{ name: 'topic', description: '게시글 주제 (예: 3월 패치 요약)', type: 3, required: true }],
		},
		{
			name: 'shorts',
			description: '유튜브 숏츠를 서든랩 커뮤니티에 등록합니다',
			options: [
				{ name: 'url', description: '유튜브 숏츠 URL', type: 3, required: true },
				{ name: 'title', description: '제목 (선택)', type: 3, required: false },
			],
		},
		{
			name: 'shorts-add',
			description: '숏츠 자동 수집할 유튜브 채널을 등록합니다',
			options: [{ name: 'url', description: '유튜브 채널 URL (예: https://youtube.com/@채널명)', type: 3, required: true }],
		},
		{ name: 'shorts-list', description: '등록된 숏츠 채널 목록을 확인합니다' },
		{
			name: 'shorts-remove',
			description: '숏츠 수집 채널을 제거합니다 (이름 부분 매칭)',
			options: [{ name: 'name', description: '채널 이름 (예: 혜성)', type: 3, required: true }],
		},
		{
			name: 'poll',
			description: '밸런스 여론조사를 생성합니다 (나락↔극락 투표)',
			options: [{ name: 'topic', description: '패치 내용 대충 적기', type: 3, required: true }],
		},
	];

	const response = await fetch(`${DISCORD_API}/applications/${APP_ID}/commands`, {
		method: 'PUT',
		headers: {
			'Authorization': `Bot ${env.DISCORD_BOT_TOKEN}`,
			'Content-Type': 'application/json',
			'User-Agent': 'DiscordBot (https://suddenlab.app, 1.0)',
		},
		body: JSON.stringify(commands),
	});

	const result = await response.json();
	return Response.json({ registered: true, commands: result });
}
