import { getGatewaySecret } from '@/lib/config';
import { db } from '@/lib/db';
import { routeChatCompletion } from '@/lib/router';
import { extractClientToken } from '@/lib/auth';
import {
  anthropicToOpenAIRequest,
  openAIToAnthropicResponse,
  createAnthropicSSEStreamFromOpenAI,
  anthropicErrorResponse,
} from '@/lib/anthropic-compat';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 300;

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

/**
 * Anthropic-native endpoint (/v1/messages) for Claude Code CLI and the
 * Anthropic SDK. Requests are translated into the internal OpenAI-style format
 * for routing/fallback, and responses (JSON and SSE) are translated back into
 * the Anthropic Messages format — including tool_use blocks.
 */
export async function POST(req: NextRequest) {
  const startTime = Date.now();

  try {
    // 0. Cold serverless instances start with an empty local store — hydrate the
    //    configuration (provider accounts, keys, master key) from the cloud
    //    database before auth/routing.
    await db.ensureCloudConfigLoaded();

    // 1. Gateway authentication (master key, client token, or dashboard cookie)
    const gatewaySecret = getGatewaySecret() || db.getMasterKey();
    const clientKey = extractClientToken(req);
    const hasSecretConfigured = Boolean(gatewaySecret && gatewaySecret.trim().length > 0);

    if (hasSecretConfigured) {
      const isValid = db.verifyToken(clientKey);
      if (!isValid) {
        return anthropicErrorResponse(401, 'Invalid API Key / Bearer Token');
      }
    }

    // 2. Convert the Anthropic Messages request into the internal OpenAI format
    const body = await req.json();
    const openAIRequest = anthropicToOpenAIRequest(body);
    const isStream = openAIRequest.stream === true;

    const headerKeys: Record<string, string> = {};
    req.headers.forEach((val, key) => {
      const lower = key.toLowerCase();
      if (lower.startsWith('x-')) {
        headerKeys[lower] = val;
      }
    });

    // 3. Route with multi-tier fallback
    const result = await routeChatCompletion(openAIRequest, headerKeys);
    const latencyMs = Date.now() - startTime;
    const promptTokens = Math.round(JSON.stringify(openAIRequest.messages).length / 4);

    // 4. Log request
    db.addLog({
      id: `req-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      timestamp: new Date().toISOString(),
      client: db.describeClient(clientKey),
      requestedModel: openAIRequest.model,
      servedProvider: result.servedBy,
      servedModel: result.servedModel,
      fallbackCount: result.fallbackCount,
      failoverNote:
        result.fallbackCount > 0
          ? `Failover to ${result.servedBy}`
          : 'Claude Code Direct Route',
      promptTokens,
      completionTokens: 0,
      tokensSaved: result.tokensSaved,
      latencyMs,
      status: result.response.status,
    });

    // 5. Translate the response back into Anthropic Messages format
    if (!result.response.ok) {
      const errText = await result.response.text().catch(() => '');
      let message = errText.slice(0, 300);
      try {
        const parsed = JSON.parse(errText);
        message = parsed?.error?.message || parsed?.message || message;
      } catch {
        // keep raw text
      }
      const status =
        result.response.status >= 400 && result.response.status < 600
          ? result.response.status
          : 502;
      return anthropicErrorResponse(status, message || `Gateway upstream error (${result.response.status})`);
    }

    if (isStream) {
      if (!result.response.body) {
        return anthropicErrorResponse(502, 'Upstream returned an empty stream');
      }
      const anthropicStream = createAnthropicSSEStreamFromOpenAI(
        result.response.body,
        openAIRequest.model
      );
      const responseHeaders = new Headers();
      Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
      responseHeaders.set('Content-Type', 'text/event-stream; charset=utf-8');
      responseHeaders.set('Cache-Control', 'no-cache, no-transform');
      responseHeaders.set('Connection', 'keep-alive');
      responseHeaders.set('x-router-provider', result.servedBy);
      responseHeaders.set('x-router-model', result.servedModel);
      responseHeaders.set('x-router-fallback-count', String(result.fallbackCount));
      if (result.fallbackCount > 0 && result.failureLogs && result.failureLogs.length > 0) {
        responseHeaders.set(
          'x-router-failures',
          result.failureLogs.slice(0, 3).join(' | ').slice(0, 500)
        );
      }
      return new Response(anthropicStream, { status: 200, headers: responseHeaders });
    }

    const data = await result.response.json().catch(() => null);
    if (!data) {
      return anthropicErrorResponse(502, 'Invalid upstream response payload');
    }

    const responseHeaders = new Headers();
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
    responseHeaders.set('Content-Type', 'application/json');
    responseHeaders.set('x-router-provider', result.servedBy);
    responseHeaders.set('x-router-model', result.servedModel);
    responseHeaders.set('x-router-fallback-count', String(result.fallbackCount));
    if (result.fallbackCount > 0 && result.failureLogs && result.failureLogs.length > 0) {
      responseHeaders.set(
        'x-router-failures',
        result.failureLogs.slice(0, 3).join(' | ').slice(0, 500)
      );
    }
    return new Response(JSON.stringify(openAIToAnthropicResponse(data)), {
      status: 200,
      headers: responseHeaders,
    });
  } catch (err: any) {
    return anthropicErrorResponse(500, err?.message || 'Gateway Internal Error');
  }
}
