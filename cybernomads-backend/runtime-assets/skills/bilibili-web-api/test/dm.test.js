'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { handleDm } = require('../scripts/lib/dm');

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

test('dm send constructs request body and returns default protocol without raw payload', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  let capturedBody = '';
  global.fetch = async (url, options = {}) => {
    capturedBody = String(options.body || '');
    assert.equal(String(url).includes('/web_im/v1/web_im/send_msg'), true);
    return mockResponse(200, {
      code: 0,
      data: {
        msg_key: 'msg-key-1',
      },
    });
  };

  const result = await handleDm(
    'send',
    {
      'receiver-id': '44556677',
      message: '你好',
      cookie: 'SESSDATA=session; bili_jct=csrf-token',
      'dev-id': 'dev-1',
      timestamp: '1710000000',
    },
    { userAgent: 'test-agent' }
  );

  assert.equal(result.ok, true);
  assert.equal(result.command, 'dm.send');
  assert.equal(result.data.success, true);
  assert.equal(result.data.raw, undefined);
  assert.equal(capturedBody.includes('receiver_id=44556677'), true);
  assert.equal(capturedBody.includes('dev_id=dev-1'), true);
  assert.equal(capturedBody.includes('csrf=csrf-token'), true);
});
