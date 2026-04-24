'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { request } = require('../scripts/lib/http');

function mockResponse(status, body, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers: {},
    async arrayBuffer() {
      return Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    },
  };
}

test('request retries transient GET failures', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return calls === 1
      ? mockResponse(503, { message: 'busy' }, 'Service Unavailable')
      : mockResponse(200, { ok: true });
  };

  const result = await request('https://example.com/demo', {
    retryDelayMs: 1,
  });

  assert.equal(result.body.ok, true);
  assert.equal(calls, 2);
});

test('request does not retry non-idempotent POST failures', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  let calls = 0;
  global.fetch = async () => {
    calls += 1;
    return mockResponse(503, { message: 'busy' }, 'Service Unavailable');
  };

  await assert.rejects(
    () =>
      request('https://example.com/demo', {
        method: 'POST',
        json: { hello: 'world' },
      }),
    /503/
  );
  assert.equal(calls, 1);
});

test('request surfaces timeout errors cleanly', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (_url, options = {}) =>
    new Promise((_resolve, reject) => {
      options.signal?.addEventListener('abort', () => {
        const error = new Error('aborted');
        error.name = 'AbortError';
        reject(error);
      });
    });

  await assert.rejects(
    () =>
      request('https://example.com/slow', {
        timeoutMs: 5,
        maxRetries: 0,
      }),
    /timed out/
  );
});
