import { Env } from '../index';

export function validateIngestAuth(request: Request, env: Env): boolean {
	const authHeader = request.headers.get('Authorization');
	if (!authHeader || !authHeader.startsWith('Bearer ')) return false;
	const token = authHeader.slice(7);
	return token === env.INGEST_API_KEY;
}
