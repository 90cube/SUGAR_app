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

// GLM-4.7-Flash 멀티턴 채팅 (fallback: Gemini)
async function chatWithAI(env: Env, userMessage: string, userName: string, channelId?: string): Promise<string> {
	const context = await searchContext(env, userMessage);

	const systemPrompt = `당신은 "MumbleCUBE"라는 이름의 FPS 게임 '서든어택' 전문 디스코드 봇입니다.
서든어택 게임, 밸런스, 메타, 무기, 맵, 패치, 커뮤니티 동향에 대해 잘 알고 있습니다.
한국어로 친근하게 대화하세요. 디시인사이드 서든어택 갤러리 문화도 이해합니다.
모르는 건 모른다고 솔직하게 말하세요. 답변은 디스코드 메시지이므로 300자 이내로 짧게.
대화하는 유저: ${userName}

${context ? `[최근 커뮤니티 게시물 참고]\n${context}` : ''}`;

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

	// 1차: GLM-4.7-Flash (Workers AI)
	try {
		const result: any = await env.AI.run('@cf/zai-org/glm-4.7-flash' as any, {
			messages,
			max_tokens: 600,
		});
		aiResponse = result.response || '';
		if (!aiResponse) throw new Error('Empty GLM response');
	} catch (e: any) {
		console.error('[Discord AI] GLM failed, trying Gemini:', e.message);
		// 2차 fallback: Gemini
		try {
			const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
			const response = await fetch(geminiUrl, {
				method: 'POST',
				headers: { 'Content-Type': 'application/json' },
				body: JSON.stringify({
					contents: messages.filter(m => m.role !== 'system').map(m => ({
						role: m.role === 'assistant' ? 'model' : 'user',
						parts: [{ text: m.role === 'system' ? systemPrompt : m.content }],
					})),
					systemInstruction: { parts: [{ text: systemPrompt }] },
				}),
			});

			if (!response.ok) throw new Error(`Gemini ${response.status}`);
			const result = await response.json() as any;
			aiResponse = result.candidates?.[0]?.content?.parts?.[0]?.text || '';
			if (!aiResponse) throw new Error('Empty Gemini response');
		} catch (e2: any) {
			return '죄송해요, AI 오류가 발생했어요. 다시 시도해 주세요!';
		}
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

		return Response.json({
			type: CHANNEL_MESSAGE,
			data: { content: `알 수 없는 명령어: \`/${commandName}\`` },
		});
	}

	return Response.json({ type: PONG });
}

// 메시지 분류: 봇이 답해야 하는 질문인지 판단
export async function handleClassify(request: Request, env: Env): Promise<Response> {
	let body: { message: string };
	try {
		body = await request.json() as any;
	} catch {
		return Response.json({ respond: false });
	}

	const msg = body.message?.trim();
	if (!msg) return Response.json({ respond: false });

	// 1차: 물음표 없으면 무시
	if (!msg.includes('?') && !msg.includes('？')) {
		return Response.json({ respond: false, reason: 'no_question_mark' });
	}

	// 2차: 키워드 기반 스마트 필터 (AI 비용 0)
	const gameKeywords = ['서든', '메타', '패치', '업데이트', '밸런스', '무기', '맵', '핵', '치트',
		'넥슨', '점검', '이벤트', '버그', '데미지', '총', '클랜', 'ak', 'sr', 'sg', '저격',
		'스나', '샷건', '돌격', '폭파', '팀데스', '솔랭', '랭크', '티어', '매칭', '서버',
		'렉', '프레임', '옵션', '설정', '스킨', '캐릭터', '모드', '대회', '겜', '게임'];
	const casualKeywords = ['뭐먹', '뭐함', '뭐해', '밥', '치킨', '피자', '잠', '피곤',
		'출근', '퇴근', '학교', '회사', '날씨'];

	const lower = msg.toLowerCase();
	const hasCasual = casualKeywords.some(k => lower.includes(k));
	const hasGame = gameKeywords.some(k => lower.includes(k));

	// 일상 대화 키워드만 있으면 무시
	if (hasCasual && !hasGame) {
		return Response.json({ respond: false, reason: 'casual_chat' });
	}

	// 게임 키워드가 있으면 응답
	if (hasGame) {
		return Response.json({ respond: true, reason: 'game_keyword' });
	}

	// 둘 다 없는 애매한 경우: 물음표가 있으니 응답
	return Response.json({ respond: true, reason: 'unknown_question' });
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
