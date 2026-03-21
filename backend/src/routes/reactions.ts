import { Env } from '../index';
import { jsonResponse, errorResponse } from '../utils/cors';

const VALID_REACTIONS = ['cheer', 'good', 'meh', 'so_what', 'dislike', 'worst'] as const;

// POST /api/updates/:id/react - 감정 반응 추가
export async function handleReact(request: Request, env: Env, updateId: string): Promise<Response> {
	let body: { reaction: string };
	try {
		body = await request.json() as any;
	} catch {
		return errorResponse('Invalid JSON body', 400);
	}

	if (!body.reaction || !VALID_REACTIONS.includes(body.reaction as any)) {
		return errorResponse(`Invalid reaction. Must be one of: ${VALID_REACTIONS.join(', ')}`, 400);
	}

	// 게시물 존재 확인
	const exists = await env.DB.prepare('SELECT id FROM updates WHERE id = ?').bind(updateId).first();
	if (!exists) {
		return errorResponse('Update not found', 404);
	}

	// UPSERT: 없으면 INSERT, 있으면 count +1
	await env.DB.prepare(`
		INSERT INTO reactions (update_id, reaction_type, count)
		VALUES (?, ?, 1)
		ON CONFLICT(update_id, reaction_type) DO UPDATE SET count = count + 1
	`).bind(updateId, body.reaction).run();

	// 업데이트된 전체 반응 반환
	const reactions = await env.DB.prepare(
		'SELECT reaction_type, count FROM reactions WHERE update_id = ?'
	).bind(updateId).all();

	const result: Record<string, number> = {};
	for (const r of reactions.results || []) {
		result[r.reaction_type as string] = r.count as number;
	}

	return jsonResponse({ reactions: result });
}

// GET /api/updates/:id/reactions - 반응 조회
export async function handleGetReactions(env: Env, updateId: string): Promise<Response> {
	const reactions = await env.DB.prepare(
		'SELECT reaction_type, count FROM reactions WHERE update_id = ?'
	).bind(updateId).all();

	const result: Record<string, number> = {};
	for (const r of reactions.results || []) {
		result[r.reaction_type as string] = r.count as number;
	}

	return jsonResponse({ reactions: result });
}

// GET /api/reactions/batch?ids=1,2,3 - 여러 게시물 반응 한번에 조회
export async function handleBatchReactions(request: Request, env: Env): Promise<Response> {
	const url = new URL(request.url);
	const idsParam = url.searchParams.get('ids') || '';
	const ids = idsParam.split(',').map(Number).filter(n => n > 0);

	if (ids.length === 0) {
		return jsonResponse({ reactions: {} });
	}

	const placeholders = ids.map(() => '?').join(',');
	const reactions = await env.DB.prepare(
		`SELECT update_id, reaction_type, count FROM reactions WHERE update_id IN (${placeholders})`
	).bind(...ids).all();

	const result: Record<number, Record<string, number>> = {};
	for (const r of reactions.results || []) {
		const uid = r.update_id as number;
		if (!result[uid]) result[uid] = {};
		result[uid][r.reaction_type as string] = r.count as number;
	}

	return jsonResponse({ reactions: result });
}
