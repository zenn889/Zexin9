import { getGatewaySecret } from '@/lib/config';
import { db } from '@/lib/db';
import { routeChatCompletion } from '@/lib/router';
import { ChatCompletionRequest, ChatMessage } from '@/lib/types';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 120;

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
    const gatewaySecret = getGatewaySecret() || db.getMasterKey();
    let clientKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';

    if (!clientKey) {
      const cookieHeader = req.headers.get('cookie') || '';
      const match = cookieHeader.match(/(?:zexin9_auth|9router_auth|9router_session)=([^;]+)/);
      if (match) {
        clientKey = decodeURIComponent(match[1]).trim();
      }
    }

    const hasSecretConfigured = Boolean(gatewaySecret && gatewaySecret.trim().length > 0);

    if (hasSecretConfigured) {
      const isValid = db.verifyToken(clientKey);
      if (!isValid) {
        return new Response(
          JSON.stringify({
            type: 'error',
            error: { type: 'authentication_error', message: 'Invalid API Key / Bearer Token' },
          }),
          { status: 401, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
        );
      }
    }

    const body = await req.json();
    const model = body.model || 'claude-3-5-sonnet-20241022';
    const isStream = Boolean(body.stream);

    // Convert Anthropic messages to standard ChatMessage array
    const messages: ChatMessage[] = [];

    if (body.system) {
      messages.push({
        role: 'system',
        content: typeof body.system === 'string' ? body.system : JSON.stringify(body.system),
      });
    }

    if (Array.isArray(body.messages)) {
      for (const m of body.messages) {
        messages.push({
          role: m.role === 'assistant' ? 'assistant' : 'user',
          content: m.content,
        });
      }
    }

    const openAIRequest: ChatCompletionRequest = {
      model,
      messages,
      temperature: body.temperature,
      max_tokens: body.max_tokens || 4096,
      stream: isStream,
    };

    const headerKeys: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-')) {
        headerKeys[lower] = val;
      }
    });

    const result = await routeChatCompletion(openAIRequest, headerKeys);
    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.round(JSON.stringify(messages).length / 4);

    // Log request
    db.addLog({
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      client: clientKey ? clientKey.slice(0, 16) + '...' : 'Claude Code CLI',
      requestedModel: model,
      servedProvider: result.servedBy,
      servedModel: result.servedModel,
      fallbackCount: result.fallbackCount,
      failoverNote:
        result.fallbackCount > 0
          ? `Failover to ${result.servedBy}`
          : 'Claude Code Direct Route',
      promptTokens,
      completionTokens: 40,
      tokensSaved: result.tokensSaved,
      latencyMs,
      status: result.response.status,
    });

    // Return the response directly
    const responseHeaders = new Headers(result.response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
    responseHeaders.set('x-router-provider', result.servedBy);
    responseHeaders.set('x-router-model', result.servedModel);

    // Strip compression headers so client decoder does not fail
    responseHeaders.delete('content-encoding');
    responseHeaders.delete('content-length');

    return new Response(result.response.body, {
      status: result.response.status,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return new Response(
      JSON.stringify({
        type: 'error',
        error: { type: 'api_error', message: err.message || 'Gateway Internal Error' },
      }),
      { status: 500, headers: { 'Content-Type': 'application/json', ...CORS_HEADERS } }
    );
  }
}
