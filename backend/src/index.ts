import { GoogleGenAI } from "@google/genai";

export interface Env {
	NEXON_API_KEY: string;
	GEMINI_API_KEY: string;
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

			// 2. Gemini API via SDK
			if (url.pathname.startsWith('/gemini/')) {
				if (request.method !== 'POST') {
					return new Response('Method Not Allowed', { status: 405, headers: corsHeaders });
				}

				const body = await request.json() as { model?: string; contents: any[] };

				// Extract model from path or body
				// Path format: /gemini/v1beta/models/{model}:generateContent
				const pathMatch = url.pathname.match(/models\/([^:\/]+)/);
				const model = pathMatch ? pathMatch[1] : (body.model || 'gemini-2.0-flash');

				// Initialize SDK
				const ai = new GoogleGenAI({ apiKey: env.GEMINI_API_KEY });

				// Extract text from contents
				let prompt = '';
				if (body.contents && Array.isArray(body.contents)) {
					for (const content of body.contents) {
						if (content.parts && Array.isArray(content.parts)) {
							for (const part of content.parts) {
								if (part.text) {
									prompt += part.text;
								}
							}
						}
					}
				}

				// Call Gemini via SDK
				const response = await ai.models.generateContent({
					model: model,
					contents: prompt,
				});

				// Format response to match REST API structure
				const result = {
					candidates: [{
						content: {
							parts: [{ text: response.text }],
							role: 'model'
						},
						finishReason: 'STOP'
					}]
				};

				return new Response(JSON.stringify(result), {
					headers: { ...corsHeaders, 'Content-Type': 'application/json' }
				});
			}

			return new Response('Not Found', { status: 404, headers: corsHeaders });
		} catch (error: any) {
			console.error('Worker Error:', error);
			return new Response(JSON.stringify({ error: error.message }), {
				status: 500,
				headers: { ...corsHeaders, 'Content-Type': 'application/json' }
			});
		}
	},
};
