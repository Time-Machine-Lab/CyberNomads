'use strict';

const crypto = require('crypto');
const { DEFAULT_USER_AGENT } = require('./constants');
const { request, unwrapBiliResponse } = require('./http');
const { BilibiliClient } = require('./client');
const {
  mergeCookieInputs,
  serializeCookieMap,
  parseSetCookieHeaders,
  getSetCookieArray,
} = require('./cookie');
const { CliError } = require('./errors');

const QR_CODE_GENERATE_URL =
  'https://passport.bilibili.com/x/passport-login/web/qrcode/generate?source=main-fe-header';
const QR_CODE_POLL_URL = 'https://passport.bilibili.com/x/passport-login/web/qrcode/poll';
const SPI_URL = 'https://api.bilibili.com/x/frontend/finger/spi';
const BILIBILI_URL = 'https://www.bilibili.com/';
const BILI_TICKET_URL = 'https://api.bilibili.com/bapis/bilibili.api.ticket.v1.Ticket/GenWebTicket';
const COOKIE_INFO_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/info';
const COOKIE_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/cookie/refresh';
const COOKIE_CONFIRM_REFRESH_URL = 'https://passport.bilibili.com/x/passport-login/web/confirm/refresh';
const CORRESPOND_URL_PREFIX = 'https://www.bilibili.com/correspond/1/';
const DEFAULT_HEADERS = {
  accept: 'application/json, text/plain, */*',
  'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
};
const CORRESPOND_PUBLIC_KEY_PEM = `-----BEGIN PUBLIC KEY-----
MIGfMA0GCSqGSIb3DQEBAQUAA4GNADCBiQKBgQDLgd2OAkcGVtoE3ThUREbio0Eg
Uc/prcajMKXvkCKFCWhJYJcLkcM2DKKcSeFpD/j6Boy538YXnR6VhcuUJOhH2x71
nzPjfdTcqMz7djHum0qSZA0AyCBDABUqCrfNgCiJ00Ra7GmRj+YCK1NJEuewlb40
JNrRuoEUXpabUzGB8QIDAQAB
-----END PUBLIC KEY-----`;

function getQrCodeLibrary() {
  try {
    return require('qrcode');
  } catch {
    return null;
  }
}

function buildCookieInfo(cookie) {
  const cookieMap = mergeCookieInputs(cookie);
  return {
    csrf: cookieMap.bili_jct || '',
    dedeUserId: cookieMap.DedeUserID || '',
    sessdata: cookieMap.SESSDATA || '',
    buvid3: cookieMap.buvid3 || '',
    buvid4: cookieMap.buvid4 || '',
    bNut: cookieMap.b_nut || '',
    biliTicket: cookieMap.bili_ticket || '',
  };
}

async function generateQrCode({ userAgent = DEFAULT_USER_AGENT }) {
  const QRCode = getQrCodeLibrary();
  const result = await request(QR_CODE_GENERATE_URL, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
    },
  });
  const data = unwrapBiliResponse(result);
  const qrAscii = QRCode
    ? await QRCode.toString(data.url, {
        type: 'terminal',
        small: true,
        margin: 1,
      })
    : '';
  return {
    qrcodeKey: data.qrcode_key,
    loginUrl: data.url,
    qrAscii,
    qrAsciiAvailable: Boolean(QRCode),
    raw: data,
  };
}

async function fetchBuvids({ cookie, userAgent = DEFAULT_USER_AGENT }) {
  const result = await request(SPI_URL, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie,
    },
  });
  const data = unwrapBiliResponse(result);
  return {
    buvid3: data.b_3 || '',
    buvid4: data.b_4 || '',
  };
}

async function fetchBNut({ cookie, userAgent = DEFAULT_USER_AGENT }) {
  const result = await request(BILIBILI_URL, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie,
    },
  });
  const setCookies = parseSetCookieHeaders(getSetCookieArray(result.headers));
  return {
    buvid3: setCookies.buvid3 || '',
    bNut: setCookies.b_nut || '',
  };
}

function buildBiliTicketSign(ts) {
  return crypto.createHmac('sha256', 'XgwSnGZ1p').update(`ts${ts}`).digest('hex');
}

async function fetchBiliTicket({ csrf, userAgent = DEFAULT_USER_AGENT }) {
  const ts = Math.floor(Date.now() / 1000);
  const hexsign = buildBiliTicketSign(ts);
  const result = await request(BILI_TICKET_URL, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
    },
    query: {
      key_id: 'ec02',
      hexsign,
      'context[ts]': ts,
      csrf: csrf || '',
    },
  });
  const data = unwrapBiliResponse(result);
  return {
    ticket: data.ticket || '',
    createdAt: data.created_at || ts,
    ttl: data.ttl || 0,
    nav: data.nav || {},
  };
}

async function enrichAuthState({ cookie, refreshToken = '', userAgent = DEFAULT_USER_AGENT }) {
  if (!cookie) {
    throw new CliError('无法补全会话，缺少 Cookie。');
  }

  const baseCookieMap = mergeCookieInputs(cookie);
  const baseCookie = serializeCookieMap(baseCookieMap);
  const csrf = baseCookieMap.bili_jct || '';
  if (!csrf) {
    throw new CliError('登录结果中缺少 bili_jct。');
  }

  const [spi, nut, ticket] = await Promise.all([
    fetchBuvids({ cookie: baseCookie, userAgent }),
    fetchBNut({ cookie: baseCookie, userAgent }),
    fetchBiliTicket({ csrf, userAgent }),
  ]);

  const finalCookieMap = mergeCookieInputs(baseCookieMap, {
    buvid3: spi.buvid3 || nut.buvid3,
    buvid4: spi.buvid4,
    b_nut: nut.bNut,
    bili_ticket: ticket.ticket,
  });
  const finalCookie = serializeCookieMap(finalCookieMap);
  const client = new BilibiliClient({
    cookie: finalCookie,
    userAgent,
  });
  let userInfo = null;
  try {
    userInfo = await client.getUserInfo();
  } catch {
    userInfo = null;
  }
  return {
    cookie: finalCookie,
    refreshToken,
    userInfo,
    cookieInfo: buildCookieInfo(finalCookie),
    ticket: {
      createdAt: ticket.createdAt || 0,
      ttl: ticket.ttl || 0,
      nav: ticket.nav || {},
    },
    raw: {
      spi,
      nut,
      ticket,
    },
  };
}

async function pollQrCode({ qrcodeKey, userAgent = DEFAULT_USER_AGENT }) {
  const key = qrcodeKey;
  if (!key) {
    throw new CliError('缺少 qrcodeKey，请显式传入 --qrcodeKey。');
  }
  const result = await request(QR_CODE_POLL_URL, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
    },
    query: {
      qrcode_key: key,
      source: 'main-fe-header',
    },
  });

  const payload = result.body?.data || {};
  const statusCode = payload.code;
  if (statusCode === 86101) {
    return {
      status: 'waiting_scan',
      message: payload.message || '等待扫码',
      qrcodeKey: key,
      raw: payload,
    };
  }
  if (statusCode === 86090) {
    return {
      status: 'waiting_confirm',
      message: payload.message || '已扫码，等待确认',
      qrcodeKey: key,
      raw: payload,
    };
  }
  if (statusCode === 86038) {
    return {
      status: 'expired',
      message: payload.message || '二维码已失效',
      qrcodeKey: key,
      raw: payload,
    };
  }
  if (statusCode !== 0) {
    throw new CliError(`二维码登录轮询失败: code=${statusCode}`, 1, payload);
  }

  const headerCookies = parseSetCookieHeaders(getSetCookieArray(result.headers));
  const rawCookie = serializeCookieMap(headerCookies);
  const hydrated = await enrichAuthState({
    cookie: rawCookie,
    refreshToken: payload.refresh_token || '',
    userAgent,
  });

  return {
    status: 'success',
    message: '登录成功',
    qrcodeKey: key,
    ...hydrated,
    raw: {
      poll: payload,
      enrich: hydrated.raw,
    },
  };
}

function getCorrespondPath(timestamp) {
  const encrypted = crypto.publicEncrypt(
    {
      key: CORRESPOND_PUBLIC_KEY_PEM,
      padding: crypto.constants.RSA_PKCS1_OAEP_PADDING,
      oaepHash: 'sha256',
    },
    Buffer.from(`refresh_${timestamp}`, 'utf8')
  );
  return encrypted.toString('hex');
}

async function checkCookieRefresh({ cookie, userAgent = DEFAULT_USER_AGENT }) {
  const cookieMap = mergeCookieInputs(cookie);
  const csrf = cookieMap.bili_jct || '';
  const result = await request(COOKIE_INFO_URL, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie,
    },
    query: { csrf },
  });
  const data = unwrapBiliResponse(result);
  return {
    refresh: Boolean(data.refresh),
    timestamp: data.timestamp || 0,
    csrf,
    raw: data,
  };
}

async function fetchRefreshCsrf({ cookie, timestamp, userAgent = DEFAULT_USER_AGENT }) {
  const correspondPath = getCorrespondPath(timestamp);
  const result = await request(`${CORRESPOND_URL_PREFIX}${correspondPath}`, {
    method: 'GET',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie,
    },
  });
  const html = result.rawBody || '';
  const match = html.match(/<div id="1-name">([^<]+)<\/div>/);
  if (!match) {
    throw new CliError('未能从 correspond 页面中提取 refresh_csrf。', 1, {
      correspondPath,
      bodyPreview: html.slice(0, 500),
    });
  }
  return {
    correspondPath,
    refreshCsrf: match[1].trim(),
  };
}

async function refreshCookie({ cookie, refreshToken, userAgent = DEFAULT_USER_AGENT }) {
  if (!cookie) {
    throw new CliError('刷新 Cookie 失败：缺少当前 Cookie。');
  }
  if (!refreshToken) {
    throw new CliError('刷新 Cookie 失败：缺少 refresh_token。');
  }
  const refreshInfo = await checkCookieRefresh({ cookie, userAgent });
  const { correspondPath, refreshCsrf } = await fetchRefreshCsrf({
    cookie,
    timestamp: refreshInfo.timestamp,
    userAgent,
  });
  const oldCookieMap = mergeCookieInputs(cookie);
  const csrf = oldCookieMap.bili_jct || '';
  const refreshResult = await request(COOKIE_REFRESH_URL, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie,
    },
    form: {
      csrf,
      refresh_csrf: refreshCsrf,
      source: 'main_web',
      refresh_token: refreshToken,
    },
  });
  const refreshData = unwrapBiliResponse(refreshResult);
  const newCookiePairs = parseSetCookieHeaders(getSetCookieArray(refreshResult.headers));
  const newCookie = serializeCookieMap(mergeCookieInputs(oldCookieMap, newCookiePairs));
  const newRefreshToken = refreshData.refresh_token || '';
  const newCsrf = mergeCookieInputs(newCookie).bili_jct || '';
  await request(COOKIE_CONFIRM_REFRESH_URL, {
    method: 'POST',
    headers: {
      ...DEFAULT_HEADERS,
      'user-agent': userAgent,
      cookie: newCookie,
    },
    form: {
      csrf: newCsrf,
      refresh_token: refreshToken,
    },
  });
  const hydrated = await enrichAuthState({
    cookie: newCookie,
    refreshToken: newRefreshToken,
    userAgent,
  });
  return {
    cookie: hydrated.cookie,
    refreshToken: newRefreshToken,
    correspondPath,
    refreshCsrf,
    userInfo: hydrated.userInfo,
    cookieInfo: hydrated.cookieInfo,
    ticket: hydrated.ticket,
    raw: {
      refreshInfo,
      refreshData,
    },
  };
}

module.exports = {
  generateQrCode,
  pollQrCode,
  enrichAuthState,
  checkCookieRefresh,
  fetchRefreshCsrf,
  refreshCookie,
};
