import { getGatewaySecret } from '@/lib/config';
import { db } from '@/lib/db';
import { routeChatCompletion } from '@/lib/router';
import { ChatCompletionRequest } from '@/lib/types';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 60;

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
  const startTime = Date.now();

  try {
    // 1. Gateway Authentication Check (via master key, client token, or web session cookie)
    const authHeader = req.headers.get('authorization') || '';
    const xApiKey = req.headers.get('x-api-key') || '';
    let clientToken = authHeader.replace(/^Bearer\s+/i, '').trim() || xApiKey.trim();

    // Support browser auth cookie so web Playground is always authenticated
    if (!clientToken) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:9router_auth|9router_session)=([^;]+)/);
      if (match) {
        clientToken = decodeURIComponent(match[1]).trim();
      }
    }

    const gatewaySecret = getGatewaySecret() || db.getMasterKey();
    const hasSecretConfigured = Boolean(gatewaySecret && gatewaySecret.trim().length > 0);

    if (hasSecretConfigured) {
      const isValid = db.verifyToken(clientToken);
      if (!isValid) {
        return new Response(
          JSON.stringify({
            error: {
              message: 'Unauthorized: Invalid or missing Router Gateway API Key / Bearer Token.',
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
      body.stream !== false;

    const cavemanMode =
      req.headers.get('x-caveman-mode') === 'true' ||
      req.headers.get('x-router-caveman') === 'true';

    // 4. Route with multi-tier fallback
    const result = await routeChatCompletion(
      body,
      headerKeys,
      { enableCompression, cavemanMode }
    );

    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.round(JSON.stringify(body.messages).length / 4);

    // 5. Record request in database
    db.addLog({
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      client: clientToken ? clientToken.slice(0, 16) + '...' : 'Open Client',
      requestedModel: body.model,
      servedProvider: result.servedBy,
      servedModel: result.servedModel,
      fallbackCount: result.fallbackCount,
      failoverNote:
        result.fallbackCount > 0
          ? `Auto-failover tier ${result.fallbackCount} triggered`
          : 'Direct route (Tier 1)',
      promptTokens,
      completionTokens: 35, // average initial estimate
      tokensSaved: result.tokensSaved,
      latencyMs,
      status: result.response.status,
    });

    // 6. Build response headers
    const responseHeaders = new Headers(result.response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
    responseHeaders.set('x-router-provider', result.servedBy);
    responseHeaders.set('x-router-model', result.servedModel);
    responseHeaders.set('x-router-fallback-count', String(result.fallbackCount));
    responseHeaders.set('x-router-tokens-saved', String(result.tokensSaved));

    // Strip upstream compression headers because Node.js fetch already decompresses the stream!
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

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
