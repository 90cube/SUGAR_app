export const corsHeaders: Record<string, string> = {
	'Access-Control-Allow-Origin': '*',
	'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
	'Access-Control-Allow-Headers': 'Content-Type, Authorization, x-nxopen-api-key',
};

export function jsonResponse(data: unknown, status = 200): Response {
	return new Response(JSON.stringify(data), {
		status,
		headers: { ...corsHeaders, 'Content-Type': 'application/json' },
	});
}

export function errorResponse(message: string, status = 500): Response {
	return jsonResponse({ error: message }, status);
}

export function corsPreflightResponse(): Response {
	return new Response(null, { headers: corsHeaders });
}
