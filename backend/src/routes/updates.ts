import { Env } from '../index';
import { validateIngestAuth } from '../utils/auth';
import { jsonResponse, errorResponse } from '../utils/cors';
import { sendComplaintAlert, sendHotIssueAlert, sendOfficialUpdate } from '../utils/discord';

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
		if (!post.external_id || !post.title) {
			console.error(`[Ingest] Skip: missing external_id or title`, JSON.stringify({ external_id: post.external_id?.slice(0, 50), title: post.title?.slice(0, 30) }));
			errors++;
			continue;
		}

		try {
			const result = await env.DB.prepare(
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

			// D1 meta.changes로 실제 삽입 여부 판별 (기존 5초 시간창 체크 대체)
			const wasInserted = result.meta?.changes > 0;

			if (wasInserted) {
				inserted++;
				// 넥슨 공식글은 디스코드로 알림
				if (body.source === 'nexon') {
					await sendOfficialUpdate(env, {
						title: post.title,
						summary: post.content.slice(0, 200),
						url: post.url,
					});
				}
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

	query += ' ORDER BY DATE(u.crawled_at) DESC, u.published_at DESC, u.id ASC LIMIT ? OFFSET ?';
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
[{"index": 1, "keep": true, "complaint": false}, {"index": 2, "keep": false, "complaint": false}, ...]

complaint 필드: 서든어택/넥슨에 대한 불만, 비판, 항의, 버그 신고 등이면 true (KEEP이면서 complaint일 수 있음)`;

	try {
		// Workers AI로 필터링 (Gemma 4 — think 모드 비활성화)
		const aiResult = await env.AI.run('@cf/google/gemma-4-26b-a4b-it' as any, {
			messages: [
				{ role: 'system', content: 'Do not use <think> tags or internal reasoning. Respond directly.\n\n당신은 JSON만 출력하는 분류 AI입니다. 지시에 따라 JSON 배열만 응답하세요.' },
				{ role: 'user', content: prompt },
			],
			max_tokens: 4000,
			temperature: 0,
		});
		let text = (aiResult as any).response || '';
		text = text.replace(/<think>[\s\S]*?<\/think>/g, '').trim();

		// JSON 파싱
		const jsonMatch = text.match(/\[[\s\S]*\]/);
		if (!jsonMatch) {
			return jsonResponse({ original: body.titles.length, filtered: body.titles.length, removed: 0, complaints: 0, posts: body.titles, error: 'AI parse failed, returning all' });
		}

		const decisions: { index: number; keep: boolean; complaint?: boolean }[] = JSON.parse(jsonMatch[0]);
		const keepIndices = new Set(decisions.filter(d => d.keep).map(d => d.index));
		const complaintIndices = new Set(decisions.filter(d => d.complaint).map(d => d.index));

		const filtered = body.titles
			.map((t, i) => ({ ...t, isComplaint: complaintIndices.has(i + 1) }))
			.filter((_, i) => keepIndices.has(i + 1));

		// 불만글 디스코드 전송
		const complaints = decisions.filter(d => d.complaint);
		for (const c of complaints) {
			const post = body.titles[c.index - 1];
			if (post) {
				await sendComplaintAlert(env, {
					title: post.title,
					author: post.author,
					url: post.url,
					published_at: post.published_at,
					reason: '디씨 갤러리 불만/비판 게시글 감지',
				});
			}
		}

		return jsonResponse({
			original: body.titles.length,
			filtered: filtered.length,
			removed: body.titles.length - filtered.length,
			complaints: complaints.length,
			posts: filtered,
		});
	} catch (e: any) {
		console.error('[Filter] AI error:', e.message);
		// AI 실패 시 전부 반환
		return jsonResponse({ original: body.titles.length, filtered: body.titles.length, removed: 0, complaints: 0, posts: body.titles, error: e.message });
	}
}

// POST /api/updates/admin/cleanup - 테스트/오류 데이터 삭제 (인증 필요)
export async function handleAdminCleanup(request: Request, env: Env): Promise<Response> {
	if (!validateIngestAuth(request, env)) {
		return errorResponse('Unauthorized', 401);
	}

	let body: { pattern?: string; ids?: number[] };
	try {
		body = await request.json() as any;
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	let deleted = 0;

	// external_id 패턴으로 삭제 (LIKE)
	if (body.pattern) {
		// 관련 analyses, reactions 먼저 삭제 (FK)
		await env.DB.prepare(
			`DELETE FROM analyses WHERE update_id IN (SELECT id FROM updates WHERE external_id LIKE ?)`
		).bind(body.pattern).run();
		await env.DB.prepare(
			`DELETE FROM reactions WHERE update_id IN (SELECT id FROM updates WHERE external_id LIKE ?)`
		).bind(body.pattern).run();
		const result = await env.DB.prepare(
			`DELETE FROM updates WHERE external_id LIKE ?`
		).bind(body.pattern).run();
		deleted += result.meta?.changes || 0;
	}

	// ID 배열로 삭제
	if (body.ids && body.ids.length > 0) {
		for (const id of body.ids) {
			await env.DB.prepare('DELETE FROM analyses WHERE update_id = ?').bind(id).run();
			await env.DB.prepare('DELETE FROM reactions WHERE update_id = ?').bind(id).run();
			const r = await env.DB.prepare('DELETE FROM updates WHERE id = ?').bind(id).run();
			deleted += r.meta?.changes || 0;
		}
	}

	return jsonResponse({ deleted });
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
