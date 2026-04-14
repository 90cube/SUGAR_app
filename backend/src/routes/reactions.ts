import { Env } from '../index';
import { jsonResponse, errorResponse } from '../utils/cors';

const VALID_REACTIONS = ['cheer', 'good', 'meh', 'so_what', 'dislike', 'worst'] as const;

// IP → SHA256 해시 (개인정보 보호)
async function hashIP(ip: string): Promise<string> {
	const data = new TextEncoder().encode(ip + '_suddenlab_salt');
	const hash = await crypto.subtle.digest('SHA-256', data);
	return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, '0')).join('').slice(0, 32);
}

// Cloudflare Workers에서 클라이언트 IP 가져오기
function getClientIP(request: Request): string {
	return request.headers.get('CF-Connecting-IP')
		|| request.headers.get('X-Forwarded-For')?.split(',')[0]?.trim()
		|| '0.0.0.0';
}

// ── 2단계: 속도 제한 (1분 내 5개 이상 투표 차단) ──
async function checkRateLimit(env: Env, ipHash: string): Promise<boolean> {
	const oneMinuteAgo = new Date(Date.now() - 60000).toISOString();
	const recent = await env.DB.prepare(
		'SELECT COUNT(*) as c FROM reaction_votes WHERE ip_hash = ? AND voted_at > ?'
	).bind(ipHash, oneMinuteAgo).first<{ c: number }>();
	return (recent?.c || 0) >= 5;
}

// ── 3단계: 이상 패턴 감지 (같은 게시글에 짧은 시간 내 다른 IP에서 같은 반응 폭주) ──
async function checkAbusePattern(env: Env, updateId: string, reaction: string, ipHash: string): Promise<boolean> {
	const fiveMinutesAgo = new Date(Date.now() - 300000).toISOString();

	// 5분 내 같은 게시글 + 같은 반응에 다른 IP가 5개 이상 → 의심
	const burst = await env.DB.prepare(`
		SELECT COUNT(DISTINCT ip_hash) as c FROM reaction_votes
		WHERE update_id = ? AND reaction_type = ? AND voted_at > ? AND ip_hash != ?
	`).bind(updateId, reaction, fiveMinutesAgo, ipHash).first<{ c: number }>();

	if ((burst?.c || 0) >= 5) {
		// 어뷰징 로그 기록
		await env.DB.prepare(`
			INSERT INTO crawl_logs (trigger_type, source, status, error_message, started_at)
			VALUES ('abuse_detect', ?, 'warning', ?, datetime('now'))
		`).bind(
			`update_${updateId}`,
			`[어뷰징 의심] 게시물#${updateId} ${reaction}반응 5분내 ${(burst?.c || 0) + 1}개 IP 폭주 (차단된 IP: ${ipHash.slice(0, 8)}...)`
		).run();
		return true;
	}

	return false;
}

// POST /api/updates/:id/react - IP당 게시글당 1개 반응만 (변경 가능)
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

	const ip = getClientIP(request);
	const ipHash = await hashIP(ip);

	// 2단계: 속도 제한
	const rateLimited = await checkRateLimit(env, ipHash);
	if (rateLimited) {
		return jsonResponse({
			error: 'rate_limited',
			message: '너무 빠르게 투표하고 있습니다. 잠시 후 다시 시도해주세요.',
			reactions: await getReactions(env, updateId),
		});
	}

	// 3단계: 어뷰징 패턴 감지
	const abused = await checkAbusePattern(env, updateId, body.reaction, ipHash);
	if (abused) {
		return jsonResponse({
			error: 'abuse_detected',
			message: '비정상적인 투표 패턴이 감지되었습니다.',
			reactions: await getReactions(env, updateId),
		});
	}

	// 이미 투표했는지 확인
	const existing = await env.DB.prepare(
		'SELECT reaction_type FROM reaction_votes WHERE update_id = ? AND ip_hash = ?'
	).bind(updateId, ipHash).first<{ reaction_type: string }>();

	if (existing) {
		if (existing.reaction_type === body.reaction) {
			return jsonResponse({
				error: 'already_voted',
				message: '이미 투표했습니다',
				reactions: await getReactions(env, updateId),
				voted: existing.reaction_type,
			});
		}

		// 다른 반응으로 변경
		await env.DB.batch([
			env.DB.prepare('UPDATE reactions SET count = MAX(count - 1, 0) WHERE update_id = ? AND reaction_type = ?')
				.bind(updateId, existing.reaction_type),
			env.DB.prepare(`
				INSERT INTO reactions (update_id, reaction_type, count) VALUES (?, ?, 1)
				ON CONFLICT(update_id, reaction_type) DO UPDATE SET count = count + 1
			`).bind(updateId, body.reaction),
			env.DB.prepare("UPDATE reaction_votes SET reaction_type = ?, voted_at = datetime('now') WHERE update_id = ? AND ip_hash = ?")
				.bind(body.reaction, updateId, ipHash),
		]);
	} else {
		// 첫 투표
		await env.DB.batch([
			env.DB.prepare(`
				INSERT INTO reactions (update_id, reaction_type, count) VALUES (?, ?, 1)
				ON CONFLICT(update_id, reaction_type) DO UPDATE SET count = count + 1
			`).bind(updateId, body.reaction),
			env.DB.prepare('INSERT INTO reaction_votes (update_id, ip_hash, reaction_type) VALUES (?, ?, ?)')
				.bind(updateId, ipHash, body.reaction),
		]);
	}

	const reactions = await getReactions(env, updateId);
	return jsonResponse({ reactions, voted: body.reaction });
}

// 반응 집계 헬퍼
async function getReactions(env: Env, updateId: string): Promise<Record<string, number>> {
	const rows = await env.DB.prepare(
		'SELECT reaction_type, count FROM reactions WHERE update_id = ?'
	).bind(updateId).all();

	const result: Record<string, number> = {};
	for (const r of rows.results || []) {
		const count = r.count as number;
		if (count > 0) result[r.reaction_type as string] = count;
	}
	return result;
}

// GET /api/updates/:id/reactions - 반응 조회 + 내 투표 여부
export async function handleGetReactions(env: Env, updateId: string, request?: Request): Promise<Response> {
	const reactions = await getReactions(env, updateId);

	let myVote: string | null = null;
	if (request) {
		const ip = getClientIP(request);
		const ipHash = await hashIP(ip);
		const vote = await env.DB.prepare(
			'SELECT reaction_type FROM reaction_votes WHERE update_id = ? AND ip_hash = ?'
		).bind(updateId, ipHash).first<{ reaction_type: string }>();
		if (vote) myVote = vote.reaction_type;
	}

	return jsonResponse({ reactions, myVote });
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
		`SELECT update_id, reaction_type, count FROM reactions WHERE update_id IN (${placeholders}) AND count > 0`
	).bind(...ids).all();

	const result: Record<number, Record<string, number>> = {};
	for (const r of reactions.results || []) {
		const uid = r.update_id as number;
		if (!result[uid]) result[uid] = {};
		result[uid][r.reaction_type as string] = r.count as number;
	}

	// 내 투표 정보
	const ip = getClientIP(request);
	const ipHash = await hashIP(ip);
	const myVotes = await env.DB.prepare(
		`SELECT update_id, reaction_type FROM reaction_votes WHERE update_id IN (${placeholders}) AND ip_hash = ?`
	).bind(...ids, ipHash).all();

	const voted: Record<number, string> = {};
	for (const v of myVotes.results || []) {
		voted[v.update_id as number] = v.reaction_type as string;
	}

	return jsonResponse({ reactions: result, voted });
}

// ── 어뷰징 일일 리포트 (크론에서 호출) ──
export async function getAbuseReport(env: Env): Promise<string> {
	const today = new Date().toISOString().slice(0, 10);

	// 오늘 어뷰징 로그
	const logs = await env.DB.prepare(
		"SELECT error_message, started_at FROM crawl_logs WHERE trigger_type = 'abuse_detect' AND started_at > ? ORDER BY started_at DESC LIMIT 10"
	).bind(today).all();

	// 오늘 투표 수 상위 IP
	const topVoters = await env.DB.prepare(`
		SELECT ip_hash, COUNT(*) as vote_count FROM reaction_votes
		WHERE voted_at > ? GROUP BY ip_hash ORDER BY vote_count DESC LIMIT 5
	`).bind(today).all();

	const abuseLogs = (logs.results || []).map((l: any) => `⚠️ ${l.error_message}`).join('\n') || '없음';
	const topList = (topVoters.results || []).map((v: any, i: number) =>
		`${i + 1}. ${(v.ip_hash as string).slice(0, 8)}... → ${v.vote_count}표`
	).join('\n') || '없음';

	return `📊 **어뷰징 일일 리포트** (${today})\n\n**감지된 이상 패턴:**\n${abuseLogs}\n\n**투표 상위 IP:**\n${topList}`;
}
