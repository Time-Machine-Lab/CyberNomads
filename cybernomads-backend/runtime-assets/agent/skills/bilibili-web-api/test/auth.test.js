'use strict';

const test = require('node:test');
const assert = require('node:assert/strict');
const { pollQrCode, generateQrCode } = require('../scripts/lib/auth');

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

test('auth qr-poll returns cookie and refresh outputs without local session state', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async (url) => {
    const target = String(url);
    if (target.includes('/x/passport-login/web/qrcode/poll')) {
      return mockResponse(
        200,
        {
          data: {
            code: 0,
            message: 'success',
            refresh_token: 'refresh-token-1',
          },
        },
        {
          getSetCookie() {
            return [
              'SESSDATA=session-cookie; Path=/; HttpOnly',
              'bili_jct=csrf-token; Path=/',
              'DedeUserID=10001; Path=/',
            ];
          },
        }
      );
    }
    if (target.includes('/x/frontend/finger/spi')) {
      return mockResponse(200, {
        code: 0,
        data: {
          b_3: 'buvid3-value',
          b_4: 'buvid4-value',
        },
      });
    }
    if (target === 'https://www.bilibili.com/') {
      return mockResponse(200, '<html></html>', {
        getSetCookie() {
          return ['b_nut=bnut-value; Path=/'];
        },
      });
    }
    if (target.includes('bilibili.api.ticket.v1.Ticket/GenWebTicket')) {
      return mockResponse(200, {
        code: 0,
        data: {
          ticket: 'ticket-value',
          created_at: 1710000000,
          ttl: 3600,
          nav: {
            foo: 'bar',
          },
        },
      });
    }
    if (target.includes('/x/web-interface/nav')) {
      return mockResponse(200, {
        code: 0,
        data: {
          mid: 10001,
          uname: 'tester',
          money: 0,
          vip_status: 0,
          vipType: 0,
          face: 'avatar',
          sign: 'hello',
        },
      });
    }
    throw new Error(`unexpected url: ${target}`);
  };

  const result = await pollQrCode({
    qrcodeKey: 'qr-key-1',
    userAgent: 'test-agent',
  });

  assert.equal(result.status, 'success');
  assert.equal(result.qrcodeKey, 'qr-key-1');
  assert.equal(result.refreshToken, 'refresh-token-1');
  assert.equal(result.userInfo.uname, 'tester');
  assert.equal(result.cookieInfo.csrf, 'csrf-token');
  assert.equal(result.cookie.includes('bili_ticket=ticket-value'), true);
});

test('auth qr-start still returns login url even if qrcode dependency is unavailable', async (t) => {
  const originalFetch = global.fetch;
  t.after(() => {
    global.fetch = originalFetch;
  });

  global.fetch = async () =>
    mockResponse(200, {
      code: 0,
      data: {
        qrcode_key: 'qr-key-2',
        url: 'https://passport.bilibili.com/h5-app/passport/login/scan',
      },
    });

  const result = await generateQrCode({
    userAgent: 'test-agent',
  });

  assert.equal(result.qrcodeKey, 'qr-key-2');
  assert.equal(result.loginUrl.includes('passport.bilibili.com'), true);
});
