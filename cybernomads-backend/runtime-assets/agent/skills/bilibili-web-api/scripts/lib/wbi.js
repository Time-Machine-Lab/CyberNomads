'use strict';

const crypto = require('crypto');
const { WBI_CACHE_TTL_MS } = require('./constants');
const { CliError } = require('./errors');

const MIXIN_KEY_ENC_TAB = [
  46, 47, 18, 2, 53, 8, 23, 32, 15, 50, 10, 31, 58, 3, 45, 35,
  27, 43, 5, 49, 33, 9, 42, 19, 29, 28, 14, 39, 12, 38, 41, 13,
  37, 48, 7, 16, 24, 55, 40, 61, 26, 17, 0, 1, 60, 51, 30, 4,
  22, 25, 54, 21, 56, 59, 6, 63, 57, 62, 11, 36, 20, 34, 44, 52,
];

function extractKeyFromUrl(url) {
  const pathname = new URL(url).pathname;
  const filename = pathname.split('/').pop() || '';
  return filename.split('.')[0];
}

function getMixinKey(imgKey, subKey) {
  const raw = `${imgKey}${subKey}`;
  return MIXIN_KEY_ENC_TAB.slice(0, 32).map((index) => raw[index]).join('');
}

function encodeWbiValue(value) {
  return encodeURIComponent(String(value)).replace(/[!'()*]/g, (char) =>
    `%${char.charCodeAt(0).toString(16).toUpperCase()}`
  );
}

async function getWbiKeys(client) {
  const cache = client.wbiCache || {};
  const now = Date.now();
  if (cache.imgKey && cache.subKey && cache.fetchedAt && now - cache.fetchedAt < WBI_CACHE_TTL_MS) {
    return cache;
  }

  const navResult = await client.get('https://api.bilibili.com/x/web-interface/nav');
  const navBody = navResult.body || {};
  const wbiImg = navBody?.data?.wbi_img || {};
  const imgKey = extractKeyFromUrl(wbiImg.img_url);
  const subKey = extractKeyFromUrl(wbiImg.sub_url);
  if (!imgKey || !subKey) {
    throw new CliError('无法获取 WBI key。', 1, navBody);
  }

  client.wbiCache = { imgKey, subKey, fetchedAt: now };
  return client.wbiCache;
}

async function signWbiParams(params, client) {
  const { imgKey, subKey } = await getWbiKeys(client);
  const mixinKey = getMixinKey(imgKey, subKey);
  const wts = Math.floor(Date.now() / 1000);
  const sortedParams = new Map(Object.entries({ ...params, wts }).sort(([a], [b]) => a.localeCompare(b)));
  const query = Array.from(sortedParams.entries())
    .map(([key, value]) => `${key}=${encodeWbiValue(value)}`)
    .join('&');
  const wRid = crypto.createHash('md5').update(`${query}${mixinKey}`).digest('hex');
  return {
    ...Object.fromEntries(sortedParams),
    w_rid: wRid,
  };
}

module.exports = {
  signWbiParams,
};
