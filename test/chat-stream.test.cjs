/**
 * Unit test for lib/chat-stream.ts — verifies that a cut-off ("putus-putus")
 * answer is continued automatically and stitched into one complete text.
 * Run:  npx tsc lib/chat-stream.ts --outDir .ztest --module commonjs --target es2022 \
 *         --skipLibCheck --esModuleInterop && node .ztest/run-chat-stream-test.cjs
 */
const assert = require('assert');
const { streamChatOnce, streamWithAutoContinue, needsContinuation } = require('./chat-stream.js');

function sse(chunks, { done = true } = {}) {
  const parts = chunks.map(
    (c) => `data: ${JSON.stringify({ choices: [{ delta: { content: c } }] })}\n\n`
  );
  if (done) parts.push('data: [DONE]\n\n');
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      for (const p of parts) controller.enqueue(encoder.encode(p));
      controller.close();
    },
  });
  return new Response(stream, {
    status: 200,
    headers: { 'content-type': 'text/event-stream', 'x-router-provider': 'mock' },
  });
}

function sseFinish(reason) {
  const encoder = new TextEncoder();
  const stream = new ReadableStream({
    start(controller) {
      controller.enqueue(
        encoder.encode(
          `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: reason }] })}\n\n` +
            'data: [DONE]\n\n'
        )
      );
      controller.close();
    },
  });
  return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
}

let calls = 0;
const seenBodies = [];

async function fakeFetchCut(url, init) {
  calls++;
  seenBodies.push(JSON.parse(init.body));
  if (calls === 1) {
    // First round: answer is cut by the token cap (finish_reason: length).
    const body =
      `data: ${JSON.stringify({ choices: [{ delta: { content: 'export function sum(a,b){' } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: { content: '\n  return a+b;' } }] })}\n\n` +
      `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'length' }] })}\n\n`;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(controller) {
        controller.enqueue(encoder.encode(body));
        controller.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  }
  // Continuation round: rest of the file, finished properly.
  return sse(['\n}\n', '\nmodule.exports = sum;\n'], { done: true });
}

(async () => {
  // --- T1: token-capped answer is auto-continued and stitched together.
  calls = 0;
  const t1 = await streamWithAutoContinue({
    url: '/v1/chat/completions',
    headers: { 'Content-Type': 'application/json' },
    model: 'test-model',
    messages: [{ role: 'user', content: 'buatkan file sum.js' }],
    maxTokens: 'auto',
    maxRounds: 3,
    fetchImpl: fakeFetchCut,
  });
  assert.strictEqual(t1.ok, true, 'first round ok');
  assert.strictEqual(t1.rounds, 1, 'should auto-continue exactly once');
  assert.ok(t1.text.includes('export function sum'), 'contains part 1');
  assert.ok(t1.text.includes('module.exports = sum'), 'contains part 2');
  assert.strictEqual(t1.stillTruncated, false, 'answer is complete after continue');
  assert.strictEqual(seenBodies.length, 2, 'two provider calls');
  assert.ok(
    seenBodies[1].messages.some((m) => m.role === 'user' && /Lanjutkan PERSIS/i.test(m.content)),
    'continuation prompt sent'
  );
  assert.ok(
    seenBodies[1].messages.some((m) => m.role === 'assistant' && m.content.includes('export function sum')),
    'assistant tail echoed for continuity'
  );
  assert.strictEqual(seenBodies[0].max_tokens, undefined, '"auto" must NOT force a max_tokens');
  console.log('T1 auto-continue on token cap: OK');

  // --- T2: dropped stream (no finish_reason, no [DONE]) also continues.
  calls = 0;
  let round = 0;
  const fakeDrop = async (url, init) => {
    round++;
    if (round === 1) return sse(['bagian pertama'], { done: false });
    return sse([' bagian kedua'], { done: true });
  };
  const t2 = await streamWithAutoContinue({
    url: '/v1/chat/completions',
    headers: {},
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    maxRounds: 2,
    fetchImpl: fakeDrop,
  });
  assert.strictEqual(t2.rounds, 1, 'dropped stream should continue');
  assert.strictEqual(t2.text, 'bagian pertama bagian kedua');
  assert.strictEqual(t2.stillTruncated, false);
  console.log('T2 auto-continue on dropped stream: OK');

  // --- T3: a normal finished answer is NOT continued.
  round = 0;
  const fakeFinish = async () => sseFinish('stop');
  const t3 = await streamWithAutoContinue({
    url: '/v1/chat/completions',
    headers: {},
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    maxRounds: 3,
    fetchImpl: fakeFinish,
  });
  assert.strictEqual(t3.rounds, 0, 'no continuation needed');
  assert.strictEqual(t3.stillTruncated, false);
  console.log('T3 no needless continuation: OK');

  // --- T4: maxRounds=0 (user turned auto-lanjut off) never continues.
  round = 0;
  let callsT4 = 0;
  const fakeCap = async () => {
    callsT4++;
    const encoder = new TextEncoder();
    const stream = new ReadableStream({
      start(c) {
        c.enqueue(
          encoder.encode(
            `data: ${JSON.stringify({ choices: [{ delta: { content: 'cut' } }] })}\n\n` +
              `data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'length' }] })}\n\n`
          )
        );
        c.close();
      },
    });
    return new Response(stream, { status: 200, headers: { 'content-type': 'text/event-stream' } });
  };
  const t4 = await streamWithAutoContinue({
    url: '/v1/chat/completions',
    headers: {},
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    maxRounds: 0,
    fetchImpl: fakeCap,
  });
  assert.strictEqual(callsT4, 1, 'auto-lanjut off means exactly one call');
  assert.strictEqual(t4.rounds, 0);
  assert.strictEqual(t4.stillTruncated, true, 'still flagged as cut so UI can offer Lanjutkan');
  console.log('T4 auto-lanjut off still flags truncation: OK');

  // --- T5: HTTP error surfaces the upstream message (no crash, no retry loop).
  let callsT5 = 0;
  const fakeErr = async () => {
    callsT5++;
    return new Response(JSON.stringify({ error: { message: 'invalid api key' } }), {
      status: 401,
      headers: { 'content-type': 'application/json' },
    });
  };
  const t5 = await streamWithAutoContinue({
    url: '/v1/chat/completions',
    headers: {},
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    maxRounds: 3,
    fetchImpl: fakeErr,
  });
  assert.strictEqual(t5.ok, false);
  assert.strictEqual(t5.status, 401);
  assert.strictEqual(t5.errorJson.error.message, 'invalid api key');
  assert.strictEqual(callsT5, 1, 'no continuation attempts after a hard error');
  console.log('T5 upstream error surfaced cleanly: OK');

  // --- T6: explicit numeric maxTokens IS sent through.
  seenBodies.length = 0;
  await streamChatOnce({
    url: '/v1/chat/completions',
    headers: {},
    model: 'm',
    messages: [{ role: 'user', content: 'hi' }],
    maxTokens: 32000,
    fetchImpl: async (url, init) => {
      seenBodies.push(JSON.parse(init.body));
      return sseFinish('stop');
    },
  });
  assert.strictEqual(seenBodies[0].max_tokens, 32000);
  console.log('T6 explicit max_tokens forwarded: OK');

  // --- T7: needsContinuation guards empty answers.
  assert.strictEqual(
    needsContinuation({ ok: true, status: 200, text: '   ', finishReason: 'length', completed: true }),
    false
  );
  console.log('T7 empty answer is not continued: OK');

  console.log('\nALL CHAT-STREAM TESTS PASSED');
})().catch((err) => {
  console.error('TEST FAILED:', err && err.message ? err.message : err);
  process.exit(1);
});
