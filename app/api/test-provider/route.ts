import { executeProviderCall } from '@/lib/router';
import { ChatCompletionRequest, ProviderId } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { getProviderApiKey, getProviderBaseUrl, getEffectiveProviderAccounts } from '@/lib/config';
import { buildModelsUrl } from '@/lib/adapters/openai-compatible';
import { NextRequest } from 'next/server';

export const runtime = 'nodejs';
export const maxDuration = 30;

const CORS_HEADERS = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Access-Control-Allow-Headers': '*',
};

const CHAT_ATTEMPT_TIMEOUT_MS = 20000;
const DISCOVERY_TIMEOUT_MS = 10000;
const MAX_CHAT_ATTEMPTS = 3;
const MAX_DISCOVERED_TO_REPORT = 30;

// Known-good default models for built-in providers. The 'custom' provider is
// intentionally absent: its models get auto-discovered from the endpoint's
// /models listing instead of guessing an Ollama-style name like llama3.3:latest.
const TEST_MODELS: Partial<Record<ProviderId, string>> = {
  openai: 'gpt-4o-mini',
  anthropic: 'claude-3-5-haiku-20241022',
  gemini: 'gemini-2.0-flash',
  deepseek: 'deepseek-chat',
  groq: 'llama-3.1-8b-instant',
  openrouter: 'openai/gpt-4o-mini',
  mistral: 'mistral-small-latest',
  together: 'meta-llama/Llama-3.3-70B-Instruct-Turbo',
  cloudflare: '@cf/meta/llama-3.1-8b-instruct-fp8',
  cerebras: 'llama3.1-8b',
  siliconflow: 'Qwen/Qwen2.5-Coder-7B-Instruct',
  perplexity: 'sonar',
};

interface AttemptResult {
  ok: boolean;
  status: number;
  latency: number;
  errorText: string;
}

function jsonResponse(payload: Record<string, unknown>): Response {
  return new Response(JSON.stringify(payload), {
    status: 200,
    headers: { 'Content-Type': 'application/json', ...CORS_HEADERS },
  });
}

/** Heuristic: does this error mean "this model is not usable right now"? */
function looksLikeModelError(status: number, text: string): boolean {
  if (status === 404) return true;
  // Some reseller gateways report unavailable models/channels as 409 Conflict
  // ("model is currently unavailable / channel busy") — retrying another
  // discovered model is the right move for a test ping.
  if (status === 409) return true;
  if (!text) return false;
  const t = text.toLowerCase();
  if (!t.includes('model')) return false;
  return /(not found|does not exist|not exist|unknown|invalid|no such|unsupported|unavailable|busy|conflict|tidak ditemukan|tidak ada)/.test(t);
}

/** Runs one chat ping against the provider through the router (with timeout). */
async function runChatAttempt(
  providerId: ProviderId,
  model: string,
  headerKeys: Record<string, string>
): Promise<AttemptResult> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), CHAT_ATTEMPT_TIMEOUT_MS);
  const start = Date.now();
  const request: ChatCompletionRequest = {
    model,
    messages: [{ role: 'user', content: 'Ping' }],
    max_tokens: 5,
    stream: false,
  };

  try {
    const res = await executeProviderCall(providerId, model, request, headerKeys, controller.signal);
    const latency = Date.now() - start;
    let errorText = '';
    if (!res.ok) {
      errorText = (await res.text().catch(() => '')).slice(0, 400);
    }
    return { ok: res.ok, status: res.status, latency, errorText };
  } catch (err: any) {
    const latency = Date.now() - start;
    if (err?.name === 'AbortError') {
      return {
        ok: false,
        status: 0,
        latency,
        errorText: `Timeout: endpoint tidak merespons dalam ${CHAT_ATTEMPT_TIMEOUT_MS / 1000} detik`,
      };
    }
    return { ok: false, status: 0, latency, errorText: err?.message || 'Connection failed' };
  } finally {
    clearTimeout(timer);
  }
}

/** Fetches the model list from an OpenAI-compatible endpoint (best effort). */
async function discoverModels(baseUrl: string, apiKey: string): Promise<string[]> {
  if (!baseUrl) return [];
  const url = buildModelsUrl(baseUrl);
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const headers: Record<string, string> = {};
    if (apiKey) headers.Authorization = `Bearer ${apiKey}`;
    const res = await fetch(url, { headers, signal: controller.signal });
    if (!res.ok) return [];
    const data: any = await res.json().catch(() => null);
    const list: any[] = Array.isArray(data?.data)
      ? data.data
      : Array.isArray(data?.models)
        ? data.models
        : [];
    return list
      .map((m) => (typeof m === 'string' ? m : m?.id || m?.name || ''))
      .map((s) => String(s).trim())
      .filter((s) => s.length > 0)
      .slice(0, MAX_DISCOVERED_TO_REPORT);
  } catch {
    return [];
  } finally {
    clearTimeout(timer);
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    const { provider, apiKey, baseUrl, accountId, model } = await req.json();

    if (!provider) {
      return jsonResponse({ success: false, error: 'Provider is required' });
    }

    const providerId = provider as ProviderId;
    const isCustom = providerId === 'custom';
    const requestedModel = typeof model === 'string' && model.trim() ? model.trim() : '';
    const requestedBaseUrl = typeof baseUrl === 'string' ? baseUrl.trim() : '';

    const headerKeys: Record<string, string> = {};
    if (apiKey && String(apiKey).trim()) headerKeys[`x-${provider}-key`] = String(apiKey).trim();
    if (requestedBaseUrl) headerKeys[`x-${provider}-base-url`] = requestedBaseUrl;
    if (accountId) headerKeys['x-cloudflare-account-id'] = accountId;

    const tried: string[] = [];
    let modelsFound: string[] = [];
    let last: AttemptResult | null = null;
    let usedModel = '';

    const getLast = (): AttemptResult | null => last;

    const attempt = async (m: string): Promise<AttemptResult> => {
      tried.push(m);
      last = await runChatAttempt(providerId, m, headerKeys);
      return last;
    };

    // 1. Try the model chosen in the UI first (when provided).
    if (requestedModel) {
      const r = await attempt(requestedModel);
      if (r.ok) usedModel = requestedModel;
    }

    // 2. Built-in providers without a requested model keep the legacy default model.
    if (!usedModel && !isCustom && !requestedModel) {
      const fallback = TEST_MODELS[providerId] || 'gpt-4o-mini';
      const r = await attempt(fallback);
      if (r.ok) usedModel = fallback;
    }

    // 3. Auto-discover models from the endpoint's /models listing. This is what
    //    makes custom providers / resellers work without knowing model names up
    //    front: the ping retries with the first models the endpoint reports.
    const prev = getLast();
    const mayDiscover =
      !usedModel &&
      (isCustom || !requestedModel) &&
      (!prev || looksLikeModelError(prev.status, prev.errorText));

    if (mayDiscover) {
      const effectiveKey = getProviderApiKey(providerId, headerKeys) || '';
      // Prefer the endpoint configured on a connected account — the "Provider
      // Accounts" form stores the base URL on the account itself, not in the
      // general provider settings.
      const accountBaseUrl = getEffectiveProviderAccounts(providerId, headerKeys)
        .filter((a) => a.enabled !== false)
        .map((a) => (a.baseUrl || '').trim())
        .find((u) => u.length > 0 && !u.includes('{'));
      const effectiveBaseUrl =
        requestedBaseUrl || accountBaseUrl || getProviderBaseUrl(providerId, headerKeys);
      modelsFound = await discoverModels(effectiveBaseUrl, effectiveKey);

      for (const cand of modelsFound) {
        if (tried.length >= MAX_CHAT_ATTEMPTS) break;
        if (cand === requestedModel) continue;
        const r = await attempt(cand);
        if (r.ok) {
          usedModel = cand;
          break;
        }
        // Stop burning requests when the failure is not model-related (auth, network, ...)
        if (!looksLikeModelError(r.status, r.errorText)) break;
      }
    }

    const finalAttempt = getLast();

    if (usedModel && finalAttempt?.ok) {
      return jsonResponse({
        success: true,
        status: finalAttempt.status,
        latency: finalAttempt.latency,
        model: usedModel,
        tried,
        modelsFound,
      });
    }

    // Failure payload — include what was tried and which models the endpoint offers,
    // so the dashboard can show actionable information instead of a raw error blob.
    let hint: string | undefined;
    const status409 = finalAttempt?.status === 409;
    if (isCustom && modelsFound.length === 0) {
      hint = status409
        ? '409 Conflict: endpoint menganggap model ini sedang tidak tersedia (model belum siap atau saluran sibuk). Coba lagi beberapa saat, atau isi nama model lain.'
        : 'Endpoint tidak menyediakan daftar model (/models) atau tidak bisa diakses. Isi nama model secara manual di kolom model, lalu tes ulang.';
    } else if (modelsFound.length > 0 && !usedModel) {
      hint = status409
        ? `409 Conflict: endpoint menolak model ini (belum siap/saluran sibuk). Ada ${modelsFound.length} model lain yang tersedia — pilih salah satu dari daftar di atas.`
        : `Endpoint Anda menyediakan ${modelsFound.length} model — pilih salah satu dari daftar di atas.`;
    }

    return jsonResponse({
      success: false,
      status: finalAttempt?.status,
      latency: finalAttempt?.latency,
      error:
        finalAttempt?.errorText ||
        (tried.length === 0
          ? 'Tidak bisa mendeteksi model dari endpoint. Pastikan Base URL benar dan endpoint menyediakan daftar model (/models).'
          : 'Tidak ada model yang berhasil dites. Isi nama model secara manual di kolom model.'),
      tried,
      modelsFound,
      ...(hint ? { hint } : {}),
    });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Connection failed' });
  }
}
