import { getGatewaySecret } from '@/lib/config';
import { routeChatCompletion } from '@/lib/router';
import { ChatCompletionRequest } from '@/lib/types';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs'; // or 'edge'
export const maxDuration = 60; // Max execution time for Vercel/Netlify functions

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'GET, POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

export async function OPTIONS() {
  return new Response(null, {
    status: 204,
    headers: CORS_HEADERS,
  });
}

export async function POST(req: NextRequest) {
  try {
    // 1. Gateway Authentication Check (if ROUTER_API_KEY or GATEWAY_SECRET is set)
    const gatewaySecret = getGatewaySecret();
    const authHeader = req.headers.get('authorization') || '';
    const xApiKey = req.headers.get('x-api-key') || '';
    const clientToken = authHeader.replace(/^Bearer\s+/i, '').trim() || xApiKey.trim();

    if (gatewaySecret && gatewaySecret.trim().length > 0) {
      if (clientToken !== gatewaySecret.trim()) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Unauthorized: Invalid or missing Router Gateway API Key.',
              type: 'invalid_request_error',
              code: 'unauthorized',
            },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    // 2. Parse request body
    const body: ChatCompletionRequest = await req.json();
    if (!body || !body.messages || !Array.isArray(body.messages)) {
      return new Response(
        JSON.stringify({
          error: {
            message: 'Invalid request: "messages" array is required.',
            type: 'invalid_request_error',
          },
        }),
        { status: 400, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
      );
    }

    // 3. Extract custom routing and optimization headers
    const headerKeys: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-')) {
        headerKeys[lower] = val;
      }
    });

    const enableCompression =
      req.headers.get('x-router-optimize') === 'true' ||
      req.headers.get('x-router-compress') === 'true' ||
      body.stream !== false; // Default optimization enabled

    const cavemanMode =
      req.headers.get('x-caveman-mode') === 'true' ||
      req.headers.get('x-router-caveman') === 'true';

    // 4. Route with multi-tier fallback
    const result = await routeChatCompletion(
      body,
      headerKeys,
      { enableCompression, cavemanMode }
    );

    // 5. Build response headers
    const responseHeaders = new Headers(result.response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
    responseHeaders.set('x-router-provider', result.servedBy);
    responseHeaders.set('x-router-model', result.servedModel);
    responseHeaders.set('x-router-fallback-count', String(result.fallbackCount));
    responseHeaders.set('x-router-tokens-saved', String(result.tokensSaved));

    return new Response(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    console.error('[9router] Error handling completion:', err);
    return new Response(
      JSON.stringify({
        error: {
          message: err.message || 'Internal Router Gateway Error',
          type: 'internal_error',
        },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
