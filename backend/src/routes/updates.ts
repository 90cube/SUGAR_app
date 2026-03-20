import { Env } from '../index';
import { validateIngestAuth } from '../utils/auth';
import { jsonResponse, errorResponse } from '../utils/cors';

interface IngestPost {
	external_id: string;
	title: string;
	content: string;
	author?: string;
	url?: string;
	published_at?: string;
}

interface IngestBody {
	source: 'dcinside' | 'nexon';
	posts: IngestPost[];
}

// POST /api/updates/ingest - N8N에서 크롤링 데이터 수신
export async function handleIngest(request: Request, env: Env): Promise<Response> {
	if (!validateIngestAuth(request, env)) {
		return errorResponse('Unauthorized', 401);
	}

	let body: IngestBody;
	try {
		body = await request.json() as IngestBody;
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (!body.source || !['dcinside', 'nexon'].includes(body.source)) {
		return errorResponse('Invalid source. Must be "dcinside" or "nexon"', 400);
	}
	if (!Array.isArray(body.posts) || body.posts.length === 0) {
		return errorResponse('posts array is required and must not be empty', 400);
	}

	let inserted = 0;
	let duplicates = 0;
	let errors = 0;

	for (const post of body.posts) {
		if (!post.external_id || !post.title || !post.content) {
			errors++;
			continue;
		}

		try {
			await env.DB.prepare(
				`INSERT INTO updates (source, external_id, title, content, author, url, published_at)
				 VALUES (?, ?, ?, ?, ?, ?, ?)
				 ON CONFLICT(source, external_id) DO NOTHING`
			)
				.bind(
					body.source,
					post.external_id,
					post.title,
					post.content,
					post.author || null,
					post.url || null,
					post.published_at || null,
				)
				.run();

			// Check if row was actually inserted (changes > 0) or was a duplicate
			const check = await env.DB.prepare(
				`SELECT id FROM updates WHERE source = ? AND external_id = ? AND crawled_at >= datetime('now', '-5 seconds')`
			).bind(body.source, post.external_id).first();

			if (check) {
				inserted++;
			} else {
				duplicates++;
			}
		} catch (e: any) {
			console.error(`[Ingest] Error inserting post ${post.external_id}:`, e.message);
			errors++;
		}
	}

	// Log the ingest
	await env.DB.prepare(
		`INSERT INTO crawl_logs (trigger_type, source, status, records_added)
		 VALUES ('n8n_push', ?, ?, ?)`
	).bind(body.source, errors > 0 ? 'partial' : 'success', inserted).run();

	return jsonResponse({ inserted, duplicates, errors });
}

// GET /api/updates?page=1&source=&limit=20
export async function handleList(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const page = Math.max(1, parseInt(url.searchParams.get('page') || '1'));
	const limit = Math.min(50, Math.max(1, parseInt(url.searchParams.get('limit') || '20')));
	const source = url.searchParams.get('source');
	const offset = (page - 1) * limit;

	let query = `
		SELECT u.*, a.summary, a.sentiment, a.key_changes, a.community_reaction, a.analyzed_at
		FROM updates u
		LEFT JOIN analyses a ON a.update_id = u.id
	`;
	const params: any[] = [];

	if (source && ['dcinside', 'nexon'].includes(source)) {
		query += ' WHERE u.source = ?';
		params.push(source);
	}

	query += ' ORDER BY u.published_at DESC, u.crawled_at DESC LIMIT ? OFFSET ?';
	params.push(limit, offset);

	const results = await env.DB.prepare(query).bind(...params).all();

	// Get total count
	let countQuery = 'SELECT COUNT(*) as total FROM updates';
	const countParams: any[] = [];
	if (source && ['dcinside', 'nexon'].includes(source)) {
		countQuery += ' WHERE source = ?';
		countParams.push(source);
	}
	const countResult = await env.DB.prepare(countQuery).bind(...countParams).first<{ total: number }>();

	const updates = (results.results || []).map(formatUpdateRow);

	return jsonResponse({
		updates,
		pagination: {
			page,
			limit,
			total: countResult?.total || 0,
			totalPages: Math.ceil((countResult?.total || 0) / limit),
		},
	});
}

// GET /api/updates/:id
export async function handleGetOne(request: Request, env: Env, id: string): Promise<Response> {
	const result = await env.DB.prepare(`
		SELECT u.*, a.summary, a.sentiment, a.key_changes, a.community_reaction, a.analyzed_at
		FROM updates u
		LEFT JOIN analyses a ON a.update_id = u.id
		WHERE u.id = ?
	`).bind(id).first();

	if (!result) {
		return errorResponse('Update not found', 404);
	}

	return jsonResponse(formatUpdateRow(result));
}

// POST /api/updates/search - Vectorize 시맨틱 검색
export async function handleSearch(request: Request, env: Env): Promise<Response> {
	let body: { query: string; source?: string; limit?: number };
	try {
		body = await request.json() as any;
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (!body.query || body.query.trim().length === 0) {
		return errorResponse('query is required', 400);
	}

	const limit = Math.min(20, Math.max(1, body.limit || 10));

	// Generate embedding for search query
	const embeddingResult = await env.AI.run('@cf/baai/bge-large-en-v1.5', {
		text: [body.query],
	});

	const queryVector = embeddingResult.data[0];

	// Search Vectorize
	const filter: Record<string, any> = {};
	if (body.source && ['dcinside', 'nexon'].includes(body.source)) {
		filter.source = body.source;
	}

	const searchResults = await env.VECTOR_INDEX.query(queryVector, {
		topK: limit,
		filter: Object.keys(filter).length > 0 ? filter : undefined,
		returnMetadata: 'all',
	});

	if (!searchResults.matches || searchResults.matches.length === 0) {
		return jsonResponse({ results: [] });
	}

	// Fetch full update data for matched IDs
	const updateIds = searchResults.matches.map(m => m.metadata?.updateId).filter(Boolean);
	if (updateIds.length === 0) {
		return jsonResponse({ results: [] });
	}

	const placeholders = updateIds.map(() => '?').join(',');
	const dbResults = await env.DB.prepare(`
		SELECT u.*, a.summary, a.sentiment, a.key_changes, a.community_reaction, a.analyzed_at
		FROM updates u
		LEFT JOIN analyses a ON a.update_id = u.id
		WHERE u.id IN (${placeholders})
	`).bind(...updateIds).all();

	const updateMap = new Map((dbResults.results || []).map(r => [r.id, r]));

	const results = searchResults.matches
		.map(match => {
			const updateId = match.metadata?.updateId;
			const row = updateMap.get(updateId);
			if (!row) return null;
			return {
				update: formatUpdateRow(row),
				score: match.score,
			};
		})
		.filter(Boolean);

	return jsonResponse({ results });
}

// GET /api/updates/stats
export async function handleStats(env: Env): Promise<Response> {
	const total = await env.DB.prepare('SELECT COUNT(*) as count FROM updates').first<{ count: number }>();
	const analyzed = await env.DB.prepare('SELECT COUNT(*) as count FROM analyses').first<{ count: number }>();
	const bySrc = await env.DB.prepare(
		`SELECT source, COUNT(*) as count FROM updates GROUP BY source`
	).all();
	const recentLogs = await env.DB.prepare(
		`SELECT * FROM crawl_logs ORDER BY started_at DESC LIMIT 10`
	).all();

	return jsonResponse({
		totalUpdates: total?.count || 0,
		totalAnalyzed: analyzed?.count || 0,
		bySource: Object.fromEntries((bySrc.results || []).map(r => [r.source, r.count])),
		recentLogs: recentLogs.results || [],
	});
}

// POST /api/updates/filter - AI로 제목 필터링 (N8N → Worker AI)
export async function handleFilter(request: Request, env: Env): Promise<Response> {
	if (!validateIngestAuth(request, env)) {
		return errorResponse('Unauthorized', 401);
	}

	let body: { titles: { external_id: string; title: string; author?: string; url?: string; published_at?: string }[] };
	try {
		body = await request.json() as any;
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (!Array.isArray(body.titles) || body.titles.length === 0) {
		return errorResponse('titles array is required', 400);
	}

	const titleList = body.titles.map((t, i) => `${i + 1}. ${t.title}`).join('\n');

	const prompt = `당신은 FPS 게임 '서든어택' 디시인사이드 갤러리 게시글 필터링 AI입니다.

**중요: 디시인사이드 문화를 이해하세요.**
디시인사이드는 거친 말투가 기본입니다. 욕설, 비속어, 은어, 줄임말이 섞여 있어도 그건 디시 특유의 표현 방식일 뿐입니다.
"찐따", "ㅅㅂ", "ㅈㄹ" 같은 표현이 있더라도 내용 자체가 서든어택과 관련되어 있으면 반드시 KEEP하세요.
말투가 아니라 "내용"으로 판단하세요.

[KEEP 기준] - 느슨하게, 애매하면 KEEP
- 서든어택 게임플레이, 밸런스, 메타, 무기, 맵, 모드 관련
- 업데이트, 패치, 버그, 이벤트, 대회, e스포츠
- 게임 내 유저/클랜 동향, 핵/치트 관련 제보
- 서든어택 추억, 복귀, 근황 등 게임 커뮤니티 토론
- 넥슨/운영팀에 대한 의견 (불만 포함)

[SKIP 기준] - 확실한 것만 제거
- 디스코드/디코/오픈채팅 서버 홍보, SP거래/밀봉거래/현금거래/아이템 거래글
- 유튜브 프리미엄, 넷플릭스 등 서든어택과 무관한 광고
- 서든어택과 완전히 관계없는 글 (날씨, 정치, 연예, 음식 등)

[제목 목록]
${titleList}

반드시 아래 JSON 배열 형식으로만 응답하세요:
[{"index": 1, "keep": true}, {"index": 2, "keep": false}, ...]`;

	try {
		// Gemini로 필터링 (Workers AI보다 한국어 이해도가 높음)
		const geminiUrl = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${env.GEMINI_API_KEY}`;
		const geminiResponse = await fetch(geminiUrl, {
			method: 'POST',
			headers: { 'Content-Type': 'application/json' },
			body: JSON.stringify({
				contents: [{ parts: [{ text: prompt }] }],
			}),
		});

		const result = await geminiResponse.json() as any;
		const text = result.candidates?.[0]?.content?.parts?.[0]?.text || '';

		// JSON 파싱
		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			return jsonResponse({ filtered: body.titles, error: 'AI parse failed, returning all' });
		}

		const decisions: { index: number; keep: boolean }[] = JSON.parse(jsonMatch[0]);
		const keepIndices = new Set(decisions.filter(d => d.keep).map(d => d.index));

		const filtered = body.titles.filter((_, i) => keepIndices.has(i + 1));

		return jsonResponse({
			original: body.titles.length,
			filtered: filtered.length,
			removed: body.titles.length - filtered.length,
			posts: filtered,
		});
	} catch (e: any) {
		console.error('[Filter] AI error:', e.message);
		// AI 실패 시 전부 반환
		return jsonResponse({ filtered: body.titles.length, posts: body.titles, error: e.message });
	}
}

function formatUpdateRow(row: any) {
	let keyChanges: string[] = [];
	try {
		if (row.key_changes) keyChanges = JSON.parse(row.key_changes);
	} catch { }

	return {
		id: row.id,
		source: row.source,
		external_id: row.external_id,
		title: row.title,
		content: row.content,
		author: row.author,
		url: row.url,
		published_at: row.published_at,
		crawled_at: row.crawled_at,
		analysis: row.summary ? {
			summary: row.summary,
			sentiment: row.sentiment,
			key_changes: keyChanges,
			community_reaction: row.community_reaction,
			analyzed_at: row.analyzed_at,
		} : null,
	};
}
