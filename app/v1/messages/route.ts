import { getGatewaySecret } from '@/lib/config';
import { routeChatCompletion } from '@/lib/router';
import { ChatCompletionRequest, ChatMessage } from '@/lib/types';
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
  try {
    const gatewaySecret = getGatewaySecret();
    const clientKey =
      req.headers.get('x-api-key') ||
      req.headers.get('authorization')?.replace(/^Bearer\s+/i, '') ||
      '';

    if (gatewaySecret && gatewaySecret.trim().length > 0) {
      if (clientKey.trim() !== gatewaySecret.trim()) {
        return new Response(
          JSON.stringify({
            type: 'error',
            error: { type: 'authentication_error', message: 'Invalid API Key' },
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

    // Return the response directly
    const responseHeaders = new Headers(result.response.headers);
    Object.entries(CORS_HEADERS).forEach(([k, v]) => responseHeaders.set(k, v));
    responseHeaders.set('x-router-provider', result.servedBy);
    responseHeaders.set('x-router-model', result.servedModel);

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
