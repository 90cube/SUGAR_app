// DNS workaround for sandbox environment - override lookup to use custom DNS
const dns = require('dns');
const { Resolver } = dns;
const resolver = new Resolver();
resolver.setServers(['1.1.1.1', '8.8.8.8']);
const origLookup = dns.lookup;
dns.lookup = function(hostname, options, callback) {
	if (typeof options === 'function') { callback = options; options = {}; }
	if (hostname === 'localhost' || hostname === '127.0.0.1') {
		return origLookup.call(dns, hostname, options, callback);
	}
	const all = options && options.all;
	resolver.resolve4(hostname, (err, addresses) => {
		if (err || !addresses || addresses.length === 0) {
			return origLookup.call(dns, hostname, options, callback);
		}
		if (all) {
			callback(null, addresses.map(a => ({ address: a, family: 4 })));
		} else {
			callback(null, addresses[0], 4);
		}
	});
};

const { Client, GatewayIntentBits, Events, REST, Routes, SlashCommandBuilder } = require('discord.js');

// ── Config ──────────────────────────────────────────────
const BOT_TOKEN = process.env.DISCORD_BOT_TOKEN;
const WORKER_URL = 'https://sugarbackend.dudgh4141.workers.dev';

const { runLoop, scanOneEvent, loadState, saveState } = require('./anomaly');

// ── Discord Client ──────────────────────────────────────
const client = new Client({
	intents: [
		GatewayIntentBits.Guilds,
		GatewayIntentBits.GuildMessages,
		GatewayIntentBits.MessageContent,
	],
});

// ── Worker 분류 (Ollama 대신 Worker classify 엔드포인트 사용) ──
async function classifyMessage(content) {
	try {
		const res = await fetch(`${WORKER_URL}/api/discord/classify`, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({ message: content }),
		});
		const data = await res.json();
		return data.respond === true;
	} catch (err) {
		console.error('[Classify Error]', err.message);
		return true; // Worker 연결 실패 시 일단 응답 (Ollama와 반대)
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
	if (content.length < 2) return; // 너무 짧은 메시지 무시

	// 1단계: 봇 멘션이면 무조건 응답
	const isMentioned = msg.mentions.has(client.user);

	// 2단계: 멘션이 아니면 Worker classify로 필터링
	if (!isMentioned) {
		const shouldRespond = await classifyMessage(content);
		if (!shouldRespond) return;
	}

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

// ── /anomaly 슬래시 커맨드 ──────────────────────────────
const APP_ID = '1372841428325236816';

const anomalyCommand = new SlashCommandBuilder()
	.setName('anomaly')
	.setDescription('이벤트 댓글 어뷰징 탐지')
	.addSubcommand(sub => sub.setName('start').setDescription('스캔 시작'))
	.addSubcommand(sub => sub.setName('stop').setDescription('스캔 중지'))
	.addSubcommand(sub => sub.setName('status').setDescription('현재 상태'));

async function registerSlashCommands() {
	const rest = new REST({ version: '10' }).setToken(BOT_TOKEN);
	try {
		await rest.put(Routes.applicationCommands(APP_ID), {
			body: [anomalyCommand.toJSON()],
		});
		console.log('[BOT] /anomaly 슬래시 커맨드 등록 완료');
	} catch (err) {
		console.error('[BOT] 슬래시 커맨드 등록 실패:', err.message);
	}
}

client.on(Events.InteractionCreate, async (interaction) => {
	if (!interaction.isChatInputCommand() || interaction.commandName !== 'anomaly') return;

	const action = interaction.options.getSubcommand();

	if (action === 'start') {
		const state = loadState();
		if (state.running) {
			await interaction.reply('`[Anomaly]` 이미 스캔 진행 중입니다. `/anomaly stop`으로 먼저 중지하세요.');
			return;
		}
		await interaction.reply('`[Anomaly]` 이벤트 어뷰징 스캔 시작. 5분 간격으로 1개씩 조사합니다.');
		runLoop(async (status) => {
			// Discord 채널로는 보내지 않음 — KV에만 상태 저장 (/anomaly status 로 확인)
			try {
				const s = loadState();
				const statusText = s.running
					? `진행 중 — 페이지: ${s.currentPage || '?'}, 큐: ${s.eventQueue?.length || 0}, 조사완료: ${s.scannedEventIds?.length || 0}건`
					: status;
				await fetch(`${WORKER_URL}/api/anomaly/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: statusText }),
				});
			} catch {}
		}).catch(err => console.error('[Anomaly]', err));

	} else if (action === 'stop') {
		const state = loadState();
		saveState({ ...state, running: false, currentPage: null, eventQueue: [] });
		await interaction.reply('`[Anomaly]` 스캔 중지 + 초기화 완료.');

	} else if (action === 'status') {
		const state = loadState();
		const msg = state.running
			? `진행 중 — 페이지: ${state.currentPage || '?'}, 큐: ${state.eventQueue?.length || 0}, 조사완료: ${state.scannedEventIds?.length || 0}건`
			: `중지됨 — 마지막: ${state.lastScan || '없음'}, 페이지: ${state.lastPageScanned || '없음'}`;
		await interaction.reply(`\`[Anomaly]\` ${msg}`);
	}
});

// ── Worker 폴링: /anomaly 커맨드 수신 ───────────────────
const ANOMALY_POLL_INTERVAL = 15 * 1000; // 15초마다 폴링
let anomalyPolling = false;

async function pollAnomalyCommand() {
	try {
		const res = await fetch(`${WORKER_URL}/api/anomaly/poll`);
		const cmd = await res.json();
		if (!cmd || !cmd.command) return;

		console.log(`[Anomaly Poll] 커맨드 수신: ${cmd.command} (by ${cmd.requestedBy})`);

		// 상태 보고 채널 찾기
		const channelId = cmd.channelId || null;
		const channel = channelId ? client.channels.cache.get(channelId) : null;

		const statusCallback = async (status) => {
			// KV에만 상태 저장 — Discord 채널로는 보내지 않음 (/anomaly status 로 확인)
			try {
				const s = loadState();
				const statusText = s.running
					? `진행 중 — 페이지: ${s.currentPage || '?'}, 큐: ${s.eventQueue?.length || 0}, 조사완료: ${s.scannedEventIds?.length || 0}건`
					: status;
				await fetch(`${WORKER_URL}/api/anomaly/status`, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify({ status: statusText }),
				});
			} catch {}
		};

		if (cmd.command === 'start') {
			const state = loadState();
			if (state.running) {
				await statusCallback('이미 스캔 진행 중입니다.');
				return;
			}
			await statusCallback('스캔 시작됨. 5분 간격으로 1개씩 조사합니다.');
			runLoop(statusCallback).catch(err => console.error('[Anomaly]', err));

		} else if (cmd.command === 'stop') {
			const state = loadState();
			saveState({ ...state, running: false, currentPage: null, eventQueue: [] });
			await statusCallback('스캔 중지 + 초기화 완료.');
		}
	} catch (err) {
		console.error('[Anomaly Poll] Error:', err.message);
	}
}

function startAnomalyPolling() {
	if (anomalyPolling) return;
	anomalyPolling = true;
	setInterval(pollAnomalyCommand, ANOMALY_POLL_INTERVAL);
	console.log('[BOT] Anomaly 폴링 시작 (15초 간격)');
}

// ── 봇 시작 ─────────────────────────────────────────────
client.once(Events.ClientReady, async (c) => {
	console.log(`[BOT] ${c.user.tag} 온라인!`);
	console.log(`[BOT] 서버: ${c.guilds.cache.size}개`);
	console.log(`[BOT] 분류: Worker AI (${WORKER_URL})`);

	console.log(`[BOT] Worker: ${WORKER_URL}`);
	await registerSlashCommands();
	startAnomalyPolling();
	console.log('[BOT] 메시지 감지 시작...');
});

if (!BOT_TOKEN) {
	console.error('[ERROR] DISCORD_BOT_TOKEN 환경변수가 설정되지 않았습니다.');
	console.error('실행: DISCORD_BOT_TOKEN="토큰" node index.js');
	process.exit(1);
}

client.login(BOT_TOKEN);
