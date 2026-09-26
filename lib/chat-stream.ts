/**
 * Streaming chat transport for the Playground (and anything else that talks to
 * /v1/chat/completions from the browser).
 *
 * Why this exists as its own module: heavy-coding answers get cut off in two
 * ways — a token cap (finish_reason "length") or a stream that drops mid-way.
 * The fix is to detect that and CONTINUE the answer automatically, exactly like
 * a user typing "lanjutkan". Keeping the logic here (instead of inline in the
 * component) means it can be unit-tested against a fake fetch.
 */

export interface ChatMessage {
  role: string;
  content: string;
}

export interface StreamRoundResult {
  ok: boolean;
  status: number;
  text: string;
  finishReason: string | null;
  /** True when the provider signalled a real end (finish_reason or [DONE]). */
  completed: boolean;
  errorJson: any;
  servedBy: string;
  servedModel: string;
  fallbackCount: number;
  failures: string;
  tokensSaved: number;
}

export interface AutoContinueResult {
  /** False only when the FIRST round failed (HTTP error / network). */
  ok: boolean;
  status: number;
  errorJson: any;
  /** Full answer, including every auto-continued part. */
  text: string;
  /** How many times the answer was auto-continued. */
  rounds: number;
  /** True when the answer still looks cut off after all rounds. */
  stillTruncated: boolean;
  first: StreamRoundResult;
}

export const CONTINUE_PROMPT =
  'Jawaban sebelumnya terpotong di tengah. Lanjutkan PERSIS dari titik terakhir: tulis HANYA lanjutannya saja, tanpa mengulang bagian sebelumnya, tanpa kalimat pembuka baru, dan pastikan blok kode ditutup dengan rapi.';

function emptyRound(model: string): StreamRoundResult {
  return {
    ok: false,
    status: 0,
    text: '',
    finishReason: null,
    completed: false,
    errorJson: null,
    servedBy: 'unknown',
    servedModel: model,
    fallbackCount: 0,
    failures: '',
    tokensSaved: 0,
  };
}

/** True when this answer looks cut off and should be continued. */
export function needsContinuation(result: StreamRoundResult): boolean {
  if (!result.text.trim()) return false;
  return result.finishReason === 'length' || !result.completed;
}

/** One streaming round-trip. Never throws on HTTP errors — inspect `ok`. */
export async function streamChatOnce(opts: {
  url: string;
  headers: Record<string, string>;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number | string;
  onDelta?: (fullTextSoFar: string) => void;
  fetchImpl?: typeof fetch;
}): Promise<StreamRoundResult> {
  const doFetch = opts.fetchImpl || fetch;
  const out = emptyRound(opts.model);

  const payload: Record<string, any> = {
    model: opts.model,
    messages: opts.messages,
    stream: true,
  };
  if (opts.maxTokens !== undefined && opts.maxTokens !== 'auto' && Number(opts.maxTokens) > 0) {
    payload.max_tokens = Number(opts.maxTokens);
  }

  const res = await doFetch(opts.url, {
    method: 'POST',
    headers: opts.headers,
    credentials: 'include',
    body: JSON.stringify(payload),
  });

  out.status = res.status;
  out.servedBy = res.headers.get('x-router-provider') || 'unknown';
  out.servedModel = res.headers.get('x-router-model') || opts.model;
  out.fallbackCount = parseInt(res.headers.get('x-router-fallback-count') || '0', 10) || 0;
  out.failures = res.headers.get('x-router-failures') || '';
  out.tokensSaved = parseInt(res.headers.get('x-router-tokens-saved') || '0', 10) || 0;

  if (!res.ok) {
    out.errorJson = await res.json().catch(() => null);
    return out;
  }
  out.ok = true;

  const contentType = res.headers.get('content-type') || '';
  if (contentType.includes('application/json')) {
    const json = await res.json().catch(() => null);
    out.text = json?.choices?.[0]?.message?.content || json?.choices?.[0]?.text || '';
    out.finishReason = json?.choices?.[0]?.finish_reason || null;
    out.completed = true;
    if (out.text) opts.onDelta?.(out.text);
    return out;
  }

  const reader = res.body?.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let acc = '';

  const handleLine = (line: string) => {
    const trimmed = line.trim();
    if (!trimmed.startsWith('data:')) return;
    const dataStr = trimmed.slice(5).trim();
    if (!dataStr) return;
    if (dataStr === '[DONE]') {
      out.completed = true;
      return;
    }
    try {
      const chunk = JSON.parse(dataStr);
      const choice = chunk.choices?.[0];
      const delta = choice?.delta?.content ?? choice?.delta?.reasoning_content ?? choice?.text;
      if (typeof delta === 'string' && delta) {
        acc += delta;
        opts.onDelta?.(acc);
      }
      if (choice?.finish_reason) {
        out.finishReason = choice.finish_reason;
        out.completed = true;
      }
    } catch {
      // ignore malformed individual SSE lines
    }
  };

  while (reader) {
    const { done, value } = await reader.read();
    if (done) {
      const remaining = decoder.decode(undefined, { stream: false });
      if (remaining) buffer += remaining;
    } else {
      buffer += decoder.decode(value, { stream: true });
    }
    const lines = buffer.split('\n');
    buffer = done ? '' : lines.pop() || '';
    for (const line of lines) handleLine(line);
    if (done) break;
  }
  if (buffer.trim()) handleLine(buffer);

  out.text = acc;
  return out;
}

/**
 * Run one round; while the answer keeps getting cut (token cap or dropped
 * stream) send a "continue from the last character" follow-up automatically,
 * up to `maxRounds` times. This is what turns "putus-putus" answers into one
 * complete file a Claude-style UI can package as a .zip.
 */
export async function streamWithAutoContinue(opts: {
  url: string;
  headers: Record<string, string>;
  model: string;
  messages: ChatMessage[];
  maxTokens?: number | string;
  maxRounds?: number;
  /** Tail of the answer echoed back to give the model continuity. */
  contextChars?: number;
  onDelta?: (fullTextSoFar: string) => void;
  onRoundStart?: (round: number, maxRounds: number, textSoFar: string) => void;
  fetchImpl?: typeof fetch;
}): Promise<AutoContinueResult> {
  const maxRounds = Math.max(0, opts.maxRounds ?? 3);
  const contextChars = Math.max(200, opts.contextChars ?? 4000);

  let text = '';
  let rounds = 0;
  let latest: StreamRoundResult | null = null;

  const first = await streamChatOnce({
    ...opts,
    onDelta: (partial) => opts.onDelta?.(partial),
  });
  latest = first;
  if (!first.ok) {
    return {
      ok: false,
      status: first.status,
      errorJson: first.errorJson,
      text: '',
      rounds: 0,
      stillTruncated: false,
      first,
    };
  }
  text = first.text;

  while (rounds < maxRounds && needsContinuation(latest)) {
    rounds++;
    opts.onRoundStart?.(rounds, maxRounds, text);

    const followup: ChatMessage[] = [
      ...opts.messages,
      { role: 'assistant', content: text.slice(-contextChars) },
      { role: 'user', content: CONTINUE_PROMPT },
    ];

    const next = await streamChatOnce({
      ...opts,
      messages: followup,
      onDelta: (partial) => opts.onDelta?.(text + partial),
    });
    if (!next.ok || !next.text.trim()) break;

    text += next.text;
    latest = next;
    opts.onDelta?.(text);
  }

  return {
    ok: true,
    status: first.status,
    errorJson: null,
    text,
    rounds,
    stillTruncated: needsContinuation(latest as StreamRoundResult),
    first,
  };
}
