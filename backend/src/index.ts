import { corsHeaders, corsPreflightResponse, jsonResponse, errorResponse } from './utils/cors';
import { handleIngest, handleList, handleGetOne, handleSearch, handleStats, handleFilter, handleAdminCleanup } from './routes/updates';
import { handleReact, handleGetReactions, handleBatchReactions } from './routes/reactions';
import { handleDiscordInteraction, registerDiscordCommands, handleClassify, handleChatAPI } from './routes/discord';
import { handleMusicUpload, handleMusicList, handleMusicStream, handleMusicDelete } from './routes/music';
import { handleScheduled } from './scheduled';


export interface Env {
	NEXON_API_KEY: string;

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
	MUSIC_BUCKET: R2Bucket;
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

			// 2. AI Proxy (Workers AI — Gemma)
			if (url.pathname.startsWith('/gemini/')) {
				if (request.method !== 'POST') {
					return errorResponse('Method Not Allowed', 405);
				}

				const body = await request.json() as any;
				const contents = body.contents || [];
				const userText = contents.map((c: any) => c.parts?.map((p: any) => p.text).join('\n')).join('\n') || '';
				const systemText = body.systemInstruction?.parts?.[0]?.text || '';

				try {
					// Gemma 4 think 모드 비활성화: thinking 토큰이 응답을 비우는 문제 방지
					const noThinkPrefix = 'Do not use <think> tags or internal reasoning. Respond directly.\n\n';
					const messages: any[] = [];
					if (systemText) {
						messages.push({ role: 'system', content: noThinkPrefix + systemText });
					} else {
						messages.push({ role: 'system', content: noThinkPrefix + '당신은 도움이 되는 AI 어시스턴트입니다. 한국어로 응답하세요.' });
					}
					messages.push({ role: 'user', content: userText });

					const result: any = await env.AI.run('@cf/google/gemma-4-26b-a4b-it' as any, {
						messages,
						max_tokens: body.generationConfig?.maxOutputTokens || 4096,
					});

					// Workers AI: response 또는 OpenAI choices 형식 둘 다 대응
					let aiText = result.response
						|| result.choices?.[0]?.message?.content
						|| '';

					// think 태그가 포함된 경우 제거
					aiText = aiText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

					// Gemma 호환 응답 포맷 (프론트 Gemini 형식 유지)
					const responseData = JSON.stringify({
						candidates: [{
							content: {
								parts: [{ text: aiText }],
								role: 'model',
							},
						}],
					});

					return new Response(responseData, {
						status: 200,
						headers: { ...corsHeaders, 'Content-Type': 'application/json' },
					});
				} catch (e: any) {
					return errorResponse(e.message, 500);
				}
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

				// POST /api/updates/admin/cleanup
				if (path === '/admin/cleanup' && request.method === 'POST') {
					return handleAdminCleanup(request, env);
				}

				// POST /api/updates/:id/react - 감정 반응
				const reactMatch = path.match(/^\/(\d+)\/react$/);
				if (reactMatch && request.method === 'POST') {
					return handleReact(request, env, reactMatch[1]);
				}

				// GET /api/updates/:id/reactions
				const reactionsMatch = path.match(/^\/(\d+)\/reactions$/);
				if (reactionsMatch && request.method === 'GET') {
					return handleGetReactions(env, reactionsMatch[1], request);
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

			// 4. Shorts API
			if (url.pathname === '/api/shorts' && request.method === 'GET') {
				const limit = parseInt(url.searchParams.get('limit') || '200');
				const rows = await env.DB.prepare(
					'SELECT video_id, title, creator, channel_id, types, maps, thumbnail, published_at FROM shorts ORDER BY crawled_at DESC LIMIT ?'
				).bind(limit).all();
				// types, maps는 JSON 문자열 → 파싱
				const shorts = (rows.results || []).map((r: any) => ({
					...r,
					types: JSON.parse(r.types || '[]'),
					maps: JSON.parse(r.maps || '[]'),
				}));
				return jsonResponse({ shorts, total: shorts.length });
			}

			// Shorts bulk ingest (크롤러용)
			if (url.pathname === '/api/shorts/ingest' && request.method === 'POST') {
				const { validateIngestAuth } = await import('./utils/auth');
				if (!validateIngestAuth(request, env)) return errorResponse('Unauthorized', 401);
				const body = await request.json() as any;
				const videos = body.videos || [];
				if (!Array.isArray(videos) || videos.length === 0) return errorResponse('videos array required', 400);

				let inserted = 0, duplicates = 0;
				for (const v of videos) {
					if (!v.video_id || !v.title || !v.creator) continue;
					try {
						const result = await env.DB.prepare(
							`INSERT OR IGNORE INTO shorts (video_id, title, creator, channel_id, types, maps, thumbnail, published_at)
							 VALUES (?, ?, ?, ?, ?, ?, ?, ?)`
						).bind(
							v.video_id,
							v.title,
							v.creator,
							v.channel_id || '',
							JSON.stringify(v.types || []),
							JSON.stringify(v.maps || []),
							v.thumbnail || `https://i.ytimg.com/vi/${v.video_id}/hqdefault.jpg`,
							v.published_at || ''
						).run();
						if (result.meta?.changes > 0) inserted++; else duplicates++;
					} catch (e) {
						duplicates++;
					}
				}
				return jsonResponse({ ok: true, inserted, duplicates, total: videos.length });
			}

			// 5. Music API (뮤직 플레이어)
			if (url.pathname.startsWith('/api/music')) {
				const musicPath = url.pathname.replace('/api/music', '');

				// POST /api/music/upload
				if (musicPath === '/upload' && request.method === 'POST') {
					return handleMusicUpload(request, env);
				}

				// GET /api/music/:id/stream
				const streamMatch = musicPath.match(/^\/(\d+)\/stream$/);
				if (streamMatch && request.method === 'GET') {
					return handleMusicStream(request, env, streamMatch[1]);
				}

				// DELETE /api/music/:id
				const deleteMatch = musicPath.match(/^\/(\d+)$/);
				if (deleteMatch && request.method === 'DELETE') {
					return handleMusicDelete(request, env, deleteMatch[1]);
				}

				// GET /api/music
				if ((musicPath === '' || musicPath === '/') && request.method === 'GET') {
					return handleMusicList(env);
				}
			}

			// 6. Reactions batch API
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

			// 7. Vision API (스크린샷 분석 - Workers AI)
			if (url.pathname === '/api/vision' && request.method === 'POST') {
				const body = await request.json() as any;
				if (!body.image || !body.prompt) return errorResponse('image (base64) and prompt required', 400);

				try {
					const result = await env.AI.run('@cf/google/gemma-4-26b-a4b-it' as any, {
						messages: [
							{ role: 'system', content: 'Do not use <think> tags or internal reasoning. Respond directly.' },
							{
								role: 'user',
								content: [
									{ type: 'text', text: body.prompt },
									{ type: 'image_url', image_url: { url: `data:image/png;base64,${body.image}` } },
								],
							},
						],
						max_tokens: body.max_tokens || 4000,
						temperature: 0,
					});
					let visionText = (result as any).response || '';
					visionText = visionText.replace(/<think>[\s\S]*?<\/think>/g, '').trim();
					return jsonResponse({ text: visionText });
				} catch (e: any) {
					console.error('[Vision] Error:', e.message);
					return errorResponse(e.message, 500);
				}
			}

			// 8. 메시지 분류 (N8N → Worker)
			if (url.pathname === '/api/discord/classify' && request.method === 'POST') {
				return handleClassify(request, env);
			}

			// 8. 채팅 응답 생성 (N8N → Worker)
			if (url.pathname === '/api/discord/chat' && request.method === 'POST') {
				return handleChatAPI(request, env);
			}

			// 9. Anomaly 커맨드 폴링 (로컬 봇 → Worker KV)
			if (url.pathname === '/api/anomaly/poll' && request.method === 'GET') {
				const cmd = await env.CHAT_HISTORY.get('anomaly:command', 'text');
				if (cmd) {
					await env.CHAT_HISTORY.delete('anomaly:command');
					return jsonResponse(JSON.parse(cmd));
				}
				return jsonResponse(null);
			}

			// 9b. Anomaly 상태 업데이트 (로컬 봇 → Worker KV)
			if (url.pathname === '/api/anomaly/status' && request.method === 'POST') {
				const body = await request.json() as any;
				await env.CHAT_HISTORY.put('anomaly:status', body.status || '', { expirationTtl: 3600 });
				return jsonResponse({ ok: true });
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
