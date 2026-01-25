
export interface Env {
	NEXON_API_KEY: string;
	// Cloudflare AI Gateway 설정
	CF_ACCOUNT_ID: string;
	CF_GATEWAY_NAME: string; // "sugar"
}

export default {
	async fetch(request: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
		const url = new URL(request.url);

		// CORS Headers
		const corsHeaders = {
			'Access-Control-Allow-Origin': '*',
			'Access-Control-Allow-Methods': 'GET, POST, PUT, DELETE, OPTIONS',
			'Access-Control-Allow-Headers': 'Content-Type, x-nxopen-api-key',
		};

		if (request.method === 'OPTIONS') {
			return new Response(null, { headers: corsHeaders });
		}

		try {
			// 1. Nexon API Proxy
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

			// 2. Gemini API via Cloudflare AI Gateway
			if (url.pathname.startsWith('/gemini/')) {
				// AI Gateway URL 형식: https://gateway.ai.cloudflare.com/v1/{account_id}/{gateway_name}/google-ai-studio
				const gatewayBaseUrl = `https://gateway.ai.cloudflare.com/v1/${env.CF_ACCOUNT_ID}/${env.CF_GATEWAY_NAME}/google-ai-studio`;

				// /gemini/v1beta/models/gemini-xxx:generateContent -> v1beta/models/gemini-xxx:generateContent
				const apiPath = url.pathname.replace('/gemini/', '');
				const geminiUrl = `${gatewayBaseUrl}/${apiPath}${url.search}`;

				const geminiResponse = await fetch(geminiUrl, {
					method: request.method,
					headers: {
						'Content-Type': 'application/json',
					},
					body: request.method === 'POST' ? await request.arrayBuffer() : null,
				});

				const response = new Response(geminiResponse.body, geminiResponse);
				Object.entries(corsHeaders).forEach(([k, v]) => response.headers.set(k, v));
				return response;
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error: any) {
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
};
