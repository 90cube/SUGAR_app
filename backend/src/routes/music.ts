import { jsonResponse, errorResponse } from '../utils/cors';
import type { Env } from '../index';

// POST /api/music/upload - 관리자 MP3 업로드
export async function handleMusicUpload(request: Request, env: Env): Promise<Response> {
	const auth = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
	if (auth !== env.INGEST_API_KEY) return errorResponse('Unauthorized', 401);

	const contentType = request.headers.get('content-type') || '';

	// multipart/form-data 처리
	if (contentType.includes('multipart/form-data')) {
		const formData = await request.formData();
		const file = formData.get('file') as File | null;
		const title = (formData.get('title') as string) || '';
		const artist = (formData.get('artist') as string) || '';

		if (!file || !file.name.endsWith('.mp3')) {
			return errorResponse('MP3 file required', 400);
		}

		const filename = file.name;
		const r2Key = `music/${Date.now()}_${filename}`;

		// R2에 업로드
		await env.MUSIC_BUCKET.put(r2Key, file.stream(), {
			httpMetadata: { contentType: 'audio/mpeg' },
			customMetadata: { title: title || filename, artist },
		});

		// D1에 메타데이터 저장
		const result = await env.DB.prepare(
			'INSERT INTO music (title, artist, filename, r2_key) VALUES (?, ?, ?, ?)'
		).bind(title || filename.replace('.mp3', ''), artist, filename, r2Key).run();

		return jsonResponse({
			ok: true,
			id: result.meta.last_row_id,
			title: title || filename,
			r2_key: r2Key,
		});
	}

	return errorResponse('multipart/form-data required', 400);
}

// GET /api/music - 전체 트랙 목록
export async function handleMusicList(env: Env): Promise<Response> {
	const rows = await env.DB.prepare(
		'SELECT id, title, artist, filename, r2_key, duration, uploaded_at FROM music ORDER BY uploaded_at DESC'
	).all();

	return jsonResponse({
		tracks: rows.results || [],
		total: rows.results?.length || 0,
	});
}

// GET /api/music/:id/stream - MP3 스트리밍
export async function handleMusicStream(request: Request, env: Env, id: string): Promise<Response> {
	const row = await env.DB.prepare('SELECT r2_key, title FROM music WHERE id = ?').bind(id).first();
	if (!row) return errorResponse('Track not found', 404);

	const object = await env.MUSIC_BUCKET.get(row.r2_key as string);
	if (!object) return errorResponse('File not found in storage', 404);

	const headers = new Headers();
	headers.set('Content-Type', 'audio/mpeg');
	headers.set('Accept-Ranges', 'bytes');
	headers.set('Cache-Control', 'public, max-age=86400');
	headers.set('Access-Control-Allow-Origin', '*');
	headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');

	// Range 요청 처리 (시크 지원)
	const range = request.headers.get('Range');
	if (range && object.size) {
		const match = range.match(/bytes=(\d+)-(\d*)/);
		if (match) {
			const start = parseInt(match[1]);
			const end = match[2] ? parseInt(match[2]) : object.size - 1;
			const chunk = await env.MUSIC_BUCKET.get(row.r2_key as string, {
				range: { offset: start, length: end - start + 1 },
			});
			if (chunk) {
				headers.set('Content-Range', `bytes ${start}-${end}/${object.size}`);
				headers.set('Content-Length', String(end - start + 1));
				return new Response(chunk.body, { status: 206, headers });
			}
		}
	}

	if (object.size) headers.set('Content-Length', String(object.size));
	return new Response(object.body, { status: 200, headers });
}

// DELETE /api/music/:id - 관리자 트랙 삭제
export async function handleMusicDelete(request: Request, env: Env, id: string): Promise<Response> {
	const auth = request.headers.get('x-api-key') || request.headers.get('authorization')?.replace('Bearer ', '');
	if (auth !== env.INGEST_API_KEY) return errorResponse('Unauthorized', 401);

	const row = await env.DB.prepare('SELECT r2_key FROM music WHERE id = ?').bind(id).first();
	if (!row) return errorResponse('Track not found', 404);

	// R2에서 삭제
	await env.MUSIC_BUCKET.delete(row.r2_key as string);
	// D1에서 삭제
	await env.DB.prepare('DELETE FROM music WHERE id = ?').bind(id).run();

	return jsonResponse({ ok: true, deleted: id });
}
