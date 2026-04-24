'use strict';

const { CliError } = require('./errors');

function extractCsrf(cookie) {
  if (!cookie) {
    return null;
  }
  const match = String(cookie).match(/(?:^|;\s*)bili_jct=([^;]+)/);
  return match ? match[1] : null;
}

function parseCookieString(cookie) {
  const cookieMap = {};
  for (const part of String(cookie || '').split(';')) {
    const trimmed = part.trim();
    if (!trimmed) {
      continue;
    }
    const separatorIndex = trimmed.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    cookieMap[trimmed.slice(0, separatorIndex).trim()] = trimmed.slice(separatorIndex + 1).trim();
  }
  return cookieMap;
}

function serializeCookieMap(cookieMap) {
  return Object.entries(cookieMap)
    .filter(([, value]) => value !== undefined && value !== null && value !== '')
    .map(([key, value]) => `${key}=${value}`)
    .join('; ');
}

function mergeCookieInputs(...inputs) {
  const merged = {};
  for (const input of inputs) {
    if (!input) {
      continue;
    }
    const next = typeof input === 'string' ? parseCookieString(input) : input;
    Object.assign(merged, next);
  }
  return merged;
}

function parseSetCookieHeaders(setCookies) {
  const pairs = {};
  for (const item of setCookies || []) {
    const [first] = String(item).split(';');
    const separatorIndex = first.indexOf('=');
    if (separatorIndex <= 0) {
      continue;
    }
    pairs[first.slice(0, separatorIndex).trim()] = first.slice(separatorIndex + 1).trim();
  }
  return pairs;
}

function getSetCookieArray(headers) {
  if (!headers) {
    return [];
  }
  if (typeof headers.getSetCookie === 'function') {
    return headers.getSetCookie();
  }
  const combined = headers.get?.('set-cookie');
  return combined ? [combined] : [];
}

function requireCookie(cookie) {
  if (!cookie) {
    throw new CliError('缺少 Bilibili Cookie。请先执行扫码登录。');
  }
  return cookie;
}

function requireCsrf(cookie) {
  const csrf = extractCsrf(cookie);
  if (!csrf) {
    throw new CliError('Cookie 中缺少 bili_jct，无法执行写操作。', 1, null, '建议重新扫码登录。');
  }
  return csrf;
}

module.exports = {
  extractCsrf,
  parseCookieString,
  serializeCookieMap,
  mergeCookieInputs,
  parseSetCookieHeaders,
  getSetCookieArray,
  requireCookie,
  requireCsrf,
};
