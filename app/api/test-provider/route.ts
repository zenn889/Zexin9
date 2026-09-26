import { executeProviderCall } from '@/lib/router';
import { db } from '@/lib/db';
import { ChatCompletionRequest, ProviderAccount, ProviderId } from '@/lib/types';
import { requireAuth } from '@/lib/auth';
import { getProviderApiKey, getProviderBaseUrl, getEffectiveProviderAccounts, getCloudflareApiBase } from '@/lib/config';
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
  /** Upstream protocol that actually served the call (e.g. 'anthropic-messages'). */
  protocol?: string;
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
    const protocol = res.headers.get('x-router-upstream-protocol') || '';
    let errorText = '';
    if (!res.ok) {
      errorText = (await res.text().catch(() => '')).slice(0, 400);
    }
    return { ok: res.ok, status: res.status, latency, errorText, protocol };
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

/**
 * Cloudflare Workers AI has no OpenAI-style /models listing — the account's
 * model catalog comes from the models/search endpoint. Used so a CF account can
 * discover the full set of models available to it.
 */
async function discoverCloudflareModels(apiKey: string, accountId: string): Promise<string[]> {
  const accId = String(accountId || '').trim();
  if (!accId) return [];
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), DISCOVERY_TIMEOUT_MS);
  try {
    const url = `${getCloudflareApiBase()}/accounts/${accId}/ai/models/search?per_page=200`;
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${String(apiKey || '').trim()}` },
      signal: controller.signal,
      cache: 'no-store',
    });
    if (!res.ok) return [];
    const data = await res.json().catch(() => null);
    const list = Array.isArray(data?.result) ? data.result : [];
    const names = list
      .filter((m: any) => {
        const task = String(m?.task?.name || m?.task || '').toLowerCase();
        return !task || task.includes('text generation');
      })
      .map((m: any) => String(m?.name || '').trim())
      .filter((n: string) => n.startsWith('@cf/'));
    return Array.from(new Set<string>(names)).slice(0, 60);
  } catch {
    return [];
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

/**
 * Persist auto-detection results onto the matching provider account (server
 * side) so every surface — including the Playground model list — sees the
 * discovered/verified models even when the browser that ran the test never
 * saved them locally.
 */
function persistDetectionToAccounts(
  providerId: ProviderId,
  body: { accountId?: string; apiKey?: string; baseUrl?: string },
  modelsFound: string[],
  modelStatuses: Array<{ model: string; ok: boolean; status: number }>,
  overallOk: boolean,
  latency?: number,
  errorText?: string
) {
  try {
    const accounts = db.getProviderAccounts();
    const wantedId = (body.accountId || '').trim();
    const normUrl = (u?: string) => String(u || '').trim().replace(/\/+$/, '');
    const wantedUrl = normUrl(body.baseUrl);
    const wantedKey = (body.apiKey || '').trim();
    if (!wantedId && !wantedUrl && !wantedKey) return;

    // Prefer the exact credential: two accounts can share one endpoint URL but
    // carry different API keys, and a ping must only update its own account.
    const matchAccount = (acc: any) =>
      (Boolean(wantedId) && acc.id === wantedId) ||
      (Boolean(wantedKey) && acc.apiKey === wantedKey) ||
      (!wantedKey && Boolean(wantedUrl) && normUrl(acc.baseUrl) === wantedUrl);

    let changed = false;
    const updated = accounts.map((acc) => {
      if (acc.provider !== providerId) return acc;
      if (!matchAccount(acc)) return acc;

      const detected = new Set<string>([...(acc.detectedModels || []), ...modelsFound]);
      const verified = new Set<string>(acc.verifiedModels || []);
      modelStatuses
        .filter((s) => s.ok && s.model)
        .forEach((s) => verified.add(s.model));

      const next: ProviderAccount = {
        ...acc,
        detectedModels: Array.from(detected),
        ...(verified.size > 0 ? { verifiedModels: Array.from(verified) } : {}),
        lastDetectedAt: new Date().toISOString(),
        lastStatus: overallOk ? 'ok' : 'error',
        ...(overallOk && latency !== undefined ? { latencyMs: latency } : {}),
        ...(errorText ? { lastError: errorText } : {}),
      };
      changed = true;
      return next;
    });
    if (changed) db.saveProviderAccounts(updated);

    // Cloudflare pool accounts are a separate list — persist the discovered
    // catalog there too so the Playground/dashboard can show the full model set.
    if (providerId === 'cloudflare') {
      const settings = db.getProviderSettings();
      const cfAccounts = Array.isArray(settings.cfAccounts) ? settings.cfAccounts : [];
      if (cfAccounts.length > 0) {
        let cfChanged = false;
        const updatedCf = cfAccounts.map((cf) => {
          const matchesCf =
            (wantedId && cf.id === wantedId) ||
            (Boolean(body.accountId) && cf.accountId === String(body.accountId).trim()) ||
            (Boolean(wantedKey) && cf.apiToken === wantedKey);
          if (!matchesCf) return cf;
          const detected = new Set<string>([...(cf.detectedModels || []), ...modelsFound]);
          const verified = new Set<string>(cf.verifiedModels || []);
          modelStatuses
            .filter((s) => s.ok && s.model)
            .forEach((s) => verified.add(s.model));
          cfChanged = true;
          return {
            ...cf,
            detectedModels: Array.from(detected),
            ...(verified.size > 0 ? { verifiedModels: Array.from(verified) } : {}),
            lastTested: new Date().toISOString(),
          };
        });
        if (cfChanged) {
          db.setProviderSettings(
            settings.keys,
            settings.baseUrls,
            settings.cfAccountId,
            updatedCf,
            settings.providerAccounts
          );
        }
      }
    }
  } catch {
    // best-effort: never fail the provider test because of a persistence hiccup
  }
}

export async function OPTIONS() {
  return new Response(null, { status: 204, headers: CORS_HEADERS });
}

export async function POST(req: NextRequest) {
  const denied = requireAuth(req, CORS_HEADERS);
  if (denied) return denied;

  try {
    // Cold instances read the account list from the cloud database first.
    await db.ensureCloudConfigLoaded();

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
    let usedAttempt: AttemptResult | null = null;
    /** Per-model verification results, reported to the dashboard. */
    const attemptResults: Array<{ model: string; ok: boolean; status: number }> = [];

    const getLast = (): AttemptResult | null => last;

    const attempt = async (m: string): Promise<AttemptResult> => {
      tried.push(m);
      last = await runChatAttempt(providerId, m, headerKeys);
      attemptResults.push({ model: m, ok: last.ok, status: last.status });
      return last;
    };

    // 1. Try the model chosen in the UI first (when provided).
    if (requestedModel) {
      const r = await attempt(requestedModel);
      if (r.ok) {
        usedModel = requestedModel;
        usedAttempt = r;
      }
    }

    // 2. Built-in providers without a requested model keep the legacy default model.
    if (!usedModel && !isCustom && !requestedModel) {
      const fallback = TEST_MODELS[providerId] || 'gpt-4o-mini';
      const r = await attempt(fallback);
      if (r.ok) {
        usedModel = fallback;
        usedAttempt = r;
      }
    }

    // 3. Auto-discover models from the endpoint's /models listing. This is what
    //    makes custom providers / resellers work without knowing model names up
    //    front: the ping retries with the first models the endpoint reports.
    //    Cloudflare always refreshes its catalog (models/search) so CF accounts
    //    expose every Workers AI model the account can use.
    const prev = getLast();
    const discoveryAllowed =
      isCustom ||
      providerId === 'cloudflare' ||
      (!requestedModel && (!prev || looksLikeModelError(prev.status, prev.errorText)));

    if (discoveryAllowed) {
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
      let discovered: string[] = [];
      if (providerId === 'cloudflare') {
        discovered = await discoverCloudflareModels(effectiveKey, String(accountId || ''));
      }
      if (discovered.length === 0) {
        discovered = await discoverModels(effectiveBaseUrl, effectiveKey);
      }
      modelsFound = discovered;

      // Attempt the discovered models only when there is no working model yet —
      // for Cloudflare we want the full catalog listed even when the default
      // model already answered, without burning a request per model.
      if (!usedModel) {
        for (const cand of modelsFound) {
          if (tried.length >= MAX_CHAT_ATTEMPTS) break;
          if (cand === requestedModel) continue;
          const r = await attempt(cand);
          if (r.ok) {
            usedModel = cand;
            usedAttempt = r;
            break;
          }
          // Stop burning requests when the failure is not model-related (auth, network, ...)
          if (!looksLikeModelError(r.status, r.errorText)) break;
        }
      }
    }

    // 4. Verify the REMAINING discovered models (custom endpoints only) so a green
    //    ping cannot hide models that are listed but actually broken (429 quota,
    //    404, channel unavailable...). Bounded by the same overall attempt cap.
    if (usedModel && isCustom) {
      for (const cand of modelsFound) {
        if (cand === usedModel || tried.includes(cand)) continue;
        if (tried.length >= MAX_CHAT_ATTEMPTS) break;
        await attempt(cand);
      }
    }

    if (usedModel && usedAttempt) {
      persistDetectionToAccounts(
        providerId,
        { accountId, apiKey, baseUrl },
        modelsFound,
        attemptResults,
        true,
        usedAttempt.latency
      );
      return jsonResponse({
        success: true,
        status: usedAttempt.status,
        latency: usedAttempt.latency,
        model: usedModel,
        tried,
        modelsFound,
        modelStatuses: attemptResults,
        ...(usedAttempt.protocol ? { protocol: usedAttempt.protocol } : {}),
      });
    }

    // Failure payload — include what was tried and which models the endpoint offers,
    // so the dashboard can show actionable information instead of a raw error blob.
    const finalAttempt = getLast();
    let hint: string | undefined;
    const status409 = finalAttempt?.status === 409;
    const route404 =
      finalAttempt?.status === 404 && !/model/i.test(finalAttempt?.errorText || '');
    if (route404) {
      hint =
        'Endpoint menjawab 404 "Not found" di rute chat (bukan soal model). Gateway sudah mencoba format Anthropic (/v1/messages) juga — kalau dua-duanya gagal, cek Base URL: beberapa provider butuh path khusus, mis. https://host/api.';
    } else if (isCustom && modelsFound.length === 0) {
      hint = status409
        ? '409 Conflict: endpoint menganggap model ini sedang tidak tersedia (model belum siap atau saluran sibuk). Coba lagi beberapa saat, atau isi nama model lain.'
        : 'Endpoint tidak menyediakan daftar model (/models) atau tidak bisa diakses. Isi nama model secara manual di kolom model, lalu tes ulang.';
    } else if (modelsFound.length > 0 && !usedModel) {
      hint = status409
        ? `409 Conflict: endpoint menolak model ini (belum siap/saluran sibuk). Ada ${modelsFound.length} model lain yang tersedia — pilih salah satu dari daftar di atas.`
        : `Endpoint Anda menyediakan ${modelsFound.length} model — pilih salah satu dari daftar di atas.`;
    }

    persistDetectionToAccounts(
      providerId,
      { accountId, apiKey, baseUrl },
      modelsFound,
      attemptResults,
      false,
      undefined,
      String(finalAttempt?.errorText || '').slice(0, 200)
    );

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
      modelStatuses: attemptResults,
      ...(hint ? { hint } : {}),
    });
  } catch (err: any) {
    return jsonResponse({ success: false, error: err?.message || 'Connection failed' });
  }
}
