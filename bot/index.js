const { Client, GatewayIntentBits, Events } = require('discord.js');

// ── Config ──────────────────────────────────────────────
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WORKER_URL = 'https://sugarbackend.dudgh4141.workers.dev';
const OLLAMA_URL = 'http://localhost:11434';
const OLLAMA_MODEL = 'qwen2.5:1.5b';

const CLASSIFY_PROMPT = `You are a message classifier for a gaming Discord server (FPS game: Sudden Attack). If the Korean message is a GAME-RELATED question/request (weapons, patches, updates, meta, balance, servers, events, bugs, hacks, clans, maps, maintenance), answer "YES". If casual/everyday chat, answer "NO". Output ONLY one word.`;

// ── Discord Client ──────────────────────────────────────
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// ── Ollama 분류 ─────────────────────────────────────────
async function classifyMessage(content) {
	try {
		const res = await fetch(`${OLLAMA_URL}/api/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				model: OLLAMA_MODEL,
				messages: [
					{ role: 'system', content: CLASSIFY_PROMPT },
					{ role: 'user', content },
				],
				stream: false,
				options: { num_predict: 3, temperature: 0 },
			}),
		});
		const data = await res.json();
		const answer = (data.message?.content || '').trim().toUpperCase();
		return answer.includes('YES');
	} catch (err) {
		console.error('[Classify Error]', err.message);
		return false;
	}
}

// ── Worker AI 채팅 ──────────────────────────────────────
async function chatWithWorker(message, username, channelId) {
	try {
		const res = await fetch(`${WORKER_URL}/api/discord/chat`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message, username, channelId }),
		});
		const data = await res.json();
		return data.response || null;
	} catch (err) {
		console.error('[Chat Error]', err.message);
		return null;
	}
}

// ── 메시지 핸들러 ───────────────────────────────────────
client.on(Events.MessageCreate, async (msg) => {
	// 봇 메시지 무시
	if (msg.author.bot) return;

	const content = msg.content.trim();
	if (!content) return;

	// 1단계: 물음표 필터 (비용 0)
	if (!content.includes('?') && !content.includes('？')) return;

	// 2단계: 로컬 Ollama 분류
	const isGameQuestion = await classifyMessage(content);
	if (!isGameQuestion) return;

	console.log(`[Q] ${msg.author.username}: ${content}`);

	try {
		// 🤔 반응 추가
		await msg.react('🤔');

		// 3단계: Worker AI에 채팅 요청
		const response = await chatWithWorker(content, msg.author.username, msg.channelId);

		// 🤔 제거 → ✅ 추가
		const thinkingReaction = msg.reactions.cache.get('🤔');
		if (thinkingReaction) await thinkingReaction.users.remove(client.user.id).catch(() => {});
		await msg.react('✅');

		// 응답 전송 (원본 메시지에 답장)
		if (response) {
			await msg.reply(response);
			console.log(`[A] ${response.slice(0, 80)}...`);
		} else {
			await msg.reply('응답을 생성하지 못했어요. 다시 시도해 주세요!');
		}
	} catch (err) {
		console.error('[Handler Error]', err.message);
		try {
			await msg.react('❌');
		} catch {}
	}
});

// ── 봇 시작 ─────────────────────────────────────────────
client.once(Events.ClientReady, (c) => {
	console.log(`[BOT] ${c.user.tag} 온라인!`);
	console.log(`[BOT] 서버: ${c.guilds.cache.size}개`);
	console.log(`[BOT] Ollama: ${OLLAMA_MODEL}`);
	console.log(`[BOT] Worker: ${WORKER_URL}`);
	console.log('[BOT] 메시지 감지 시작...');
});

if (!BOT_TOKEN) {
	console.error('[ERROR] DISCORD_BOT_TOKEN 환경변수가 설정되지 않았습니다.');
	console.error('실행: DISCORD_BOT_TOKEN="토큰" node index.js');
	process.exit(1);
}

client.login(BOT_TOKEN);
