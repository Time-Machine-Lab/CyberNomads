'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { BilibiliClient } = require('../scripts/lib/client');
const { handleVideo } = require('../scripts/lib/video');

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

test('video search uses anonymous cookie context instead of managed session cookie', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      headers: options.headers || {},
    });

    if (String(url) === 'https://www.bilibili.com/') {
      return mockResponse(200, '<html></html>', {
        getSetCookie() {
          return ['buvid3=anon-cookie; Path=/; HttpOnly', 'b_nut=anon-nut; Path=/; HttpOnly'];
        },
      });
    }

    return mockResponse(200, {
      code: 0,
      data: {
        result: [
          {
            result_type: 'video',
            data: [
              {
                aid: 1,
                bvid: 'BV1xx411c7mD',
                title: '<em class="keyword">AI</em> 编程',
                author: 'tester',
                mid: 10001,
                typeid: '1',
                typename: '知识',
                play: 123,
                like: 45,
                favorites: 6,
                review: 7,
                danmaku: 8,
                duration: '10:00',
                pubdate: 1710000000,
                description: 'demo',
                rank_index: '1',
                tag: 'AI,编程',
                arcurl: 'http://www.bilibili.com/video/BV1xx411c7mD',
              },
            ],
          },
        ],
      },
    });
  };

  const client = new BilibiliClient({
    cookie: 'SESSDATA=managed-session; bili_jct=managed-csrf',
    userAgent: 'test-agent',
  });
  const items = await client.searchVideosAnonymous({
    keyword: 'AI 编程',
    limit: 1,
  });

  assert.equal(items.length, 1);
  assert.equal(calls.length, 2);
  assert.equal(calls[0].url, 'https://www.bilibili.com/');
  assert.equal(calls[1].url.includes('/x/web-interface/search/all/v2?'), true);
  assert.equal(String(calls[1].headers.cookie || '').includes('SESSDATA=managed-session'), false);
  assert.equal(String(calls[1].headers.cookie || '').includes('buvid3=anon-cookie'), true);
});

test('video search falls back to explicit cookie when anonymous search is rejected', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  const calls = [];
  global.fetch = async (url, options = {}) => {
    calls.push({
      url: String(url),
      headers: options.headers || {},
    });

    if (String(url) === 'https://www.bilibili.com/') {
      return mockResponse(200, '<html></html>', {
        getSetCookie() {
          return ['buvid3=anon-cookie; Path=/; HttpOnly'];
        },
      });
    }

    if (String(url).includes('/x/web-interface/search/all/v2?') && String(options.headers?.cookie || '').includes('anon-cookie')) {
      return mockResponse(200, {
        code: -403,
        message: 'forbidden',
      });
    }

    return mockResponse(200, {
      code: 0,
      data: {
        result: [
          {
            result_type: 'video',
            data: [
              {
                aid: 2,
                bvid: 'BV-cookie-fallback',
                title: 'Cookie fallback hit',
                author: 'tester',
                mid: 10001,
                typeid: '1',
                typename: '知识',
                play: 123,
                like: 45,
                favorites: 6,
                review: 7,
                danmaku: 8,
                duration: '10:00',
                pubdate: 1710000000,
                description: 'demo',
                rank_index: '1',
                tag: 'AI,编程',
                arcurl: 'https://www.bilibili.com/video/BV-cookie-fallback',
              },
            ],
          },
        ],
      },
    });
  };

  const result = await handleVideo(
    'search',
    {
      keyword: 'AI 编程',
      limit: '1',
      cookie: 'SESSDATA=managed-session; bili_jct=managed-csrf',
      verbose: true,
    },
    { userAgent: 'test-agent' }
  );

  assert.equal(result.ok, true);
  assert.equal(result.data.items.length, 1);
  assert.equal(result.data.items[0].bvid, 'BV-cookie-fallback');
  assert.equal(result.data.verbose.searchMode, 'cookie');
  assert.equal(result.data.verbose.fallbackApplied, true);
  assert.equal(String(calls.at(-1).headers.cookie || '').includes('SESSDATA=managed-session'), true);
});
