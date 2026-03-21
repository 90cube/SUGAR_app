import { corsHeaders, corsPreflightResponse, jsonResponse, errorResponse } from './utils/cors';
import { handleIngest, handleList, handleGetOne, handleSearch, handleStats, handleFilter } from './routes/updates';
import { handleReact, handleGetReactions, handleBatchReactions } from './routes/reactions';
import { handleDiscordInteraction, registerDiscordCommands, handleClassify, handleChatAPI } from './routes/discord';
import { handleScheduled } from './scheduled';

export interface Env {
	NEXON_API_KEY: string;
	GEMINI_API_KEY: string;
	INGEST_API_KEY: string;
	DISCORD_BOT_TOKEN: string;
	DISCORD_CH_COMPLAINTS: string;
	DISCORD_CH_HOT_ISSUES: string;
	DISCORD_CH_OFFICIAL: string;
	DISCORD_CH_SUMMARY: string;
	DISCORD_CH_SENTIMENT: string;
	DB: D1Database;
	VECTOR_INDEX: VectorizeIndex;
	AI: Ai;
	CHAT_HISTORY: KVNamespace;
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		if (request.method === 'OPTIONS') {
			return corsPreflightResponse();
		}

		try {
			// 1. Nexon API Proxy (기존)
			if (url.pathname.startsWith('/nexon/')) {
				const nexonUrl = `https://open.api.nexon.com/${url.pathname.replace('/nexon/', '')}${url.search}`;
				const nexonResponse = await fetch(nexonUrl, {
					method: request.method,
					headers: {
						'x-nxopen-api-key': env.NEXON_API_KEY,
						'accept': 'application/json',
					},
					body: request.method === 'POST' ? await request.arrayBuffer() : null,
				});

				const response = new Response(nexonResponse.body, nexonResponse);
				Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
				return response;
			}

			// 2. Gemini API Proxy (기존)
			if (url.pathname.startsWith('/gemini/')) {
				if (request.method !== 'POST') {
					return errorResponse('Method Not Allowed', 405);
				}

				const body = await request.json() as any;
				const pathMatch = url.pathname.match(/models\/([^:\/]+)/);
				const model = pathMatch ? pathMatch[1] : 'gemini-2.5-flash';
				const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/${model}:generateContent?key=${env.GEMINI_API_KEY}`;

				const geminiResponse = await fetch(geminiUrl, {
					method: 'POST',
					headers: { 'Content-Type': 'application/json' },
					body: JSON.stringify(body),
				});

				const responseData = await geminiResponse.text();
				return new Response(responseData, {
					status: geminiResponse.status,
					headers: { ...corsHeaders, 'Content-Type': 'application/json' },
				});
			}

			// 3. Updates API (신규)
			if (url.pathname.startsWith('/api/updates')) {
				const path = url.pathname.replace('/api/updates', '');

				// POST /api/updates/ingest
				if (path === '/ingest' && request.method === 'POST') {
					return handleIngest(request, env);
				}

				// POST /api/updates/search
				if (path === '/search' && request.method === 'POST') {
					return handleSearch(request, env);
				}

				// POST /api/updates/filter - AI 제목 필터링
				if (path === '/filter' && request.method === 'POST') {
					return handleFilter(request, env);
				}

				// GET /api/updates/stats
				if (path === '/stats' && request.method === 'GET') {
					return handleStats(env);
				}

				// POST /api/updates/:id/react - 감정 반응
				const reactMatch = path.match(/^\/(\d+)\/react$/);
				if (reactMatch && request.method === 'POST') {
					return handleReact(request, env, reactMatch[1]);
				}

				// GET /api/updates/:id/reactions
				const reactionsMatch = path.match(/^\/(\d+)\/reactions$/);
				if (reactionsMatch && request.method === 'GET') {
					return handleGetReactions(env, reactionsMatch[1]);
				}

				// GET /api/updates/:id
				const idMatch = path.match(/^\/(\d+)$/);
				if (idMatch && request.method === 'GET') {
					return handleGetOne(request, env, idMatch[1]);
				}

				// GET /api/updates
				if ((path === '' || path === '/') && request.method === 'GET') {
					return handleList(request, env);
				}

				return errorResponse('Not Found', 404);
			}

			// 4. Reactions batch API
			if (url.pathname === '/api/reactions/batch' && request.method === 'GET') {
				return handleBatchReactions(request, env);
			}

			// 5. Discord Interactions endpoint
			if (url.pathname === '/discord/interactions' && request.method === 'POST') {
				return handleDiscordInteraction(request, env, ctx);
			}

			// 6. Discord 슬래시 커맨드 등록 (1회용)
			if (url.pathname === '/discord/register-commands' && request.method === 'POST') {
				return registerDiscordCommands(env);
			}

			// 7. 메시지 분류 (N8N → Worker)
			if (url.pathname === '/api/discord/classify' && request.method === 'POST') {
				return handleClassify(request, env);
			}

			// 8. 채팅 응답 생성 (N8N → Worker)
			if (url.pathname === '/api/discord/chat' && request.method === 'POST') {
				return handleChatAPI(request, env);
			}

			return errorResponse('Not Found', 404);
		} catch (error: any) {
			console.error('Worker Error:', error);
			return errorResponse(error.message);
		}
	},

	// Cron handler: KST 08:00 / 20:00
	async scheduled(event: ScheduledEvent, env: Env, ctx: ExecutionContext): Promise<void> {
		ctx.waitUntil(handleScheduled(env));
	},
};
