'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleComment } = require('../scripts/lib/comment');

function mockResponse(status, body, headers = {}, statusText = 'OK') {
  return {
    ok: status >= 200 && status < 300,
    status,
    statusText,
    headers,
    async arrayBuffer() {
      return Buffer.from(typeof body === 'string' ? body : JSON.stringify(body));
    },
  };
}

test('comment send resolves oid and submits message without raw payload in default output', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const requests = [];
  global.fetch = async (url, options = {}) => {
    requests.push({
      url: String(url),
      options,
    });

    if (String(url).includes('/x/web-interface/view')) {
      return mockResponse(200, {
        code: 0,
        data: {
          aid: 123456,
          bvid: 'BV1xx411c7mD',
          title: 'demo',
        },
      });
    }

    if (String(url).includes('/x/v2/reply/add')) {
      return mockResponse(200, {
        code: 0,
        data: {
          rpid: 9988,
        },
      });
    }

    throw new Error(`unexpected url: ${url}`);
  };

  const result = await handleComment(
    'send',
    {
      id: 'BV1xx411c7mD',
      message: 'hello world',
      cookie: 'SESSDATA=session; bili_jct=csrf-token',
    },
    { userAgent: 'test-agent' }
  );

  assert.equal(result.command, 'comment.send');
  assert.equal(result.data.success, true);
  assert.equal(result.data.oid, '123456');
  assert.equal(result.data.raw, undefined);
  assert.equal(String(requests[1].options.body).includes('oid=123456'), true);
  assert.equal(String(requests[1].options.body).includes('message=hello+world'), true);
  assert.equal(String(requests[1].options.body).includes('csrf=csrf-token'), true);
});
