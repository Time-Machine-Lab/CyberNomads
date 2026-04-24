'use strict';

const DEFAULT_USER_AGENT =
  'Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/136.0.0.0 Safari/537.36';
const MIN_NODE_VERSION = '>=22.13';
const WBI_CACHE_TTL_MS = 6 * 60 * 60 * 1000;

module.exports = {
  DEFAULT_USER_AGENT,
  MIN_NODE_VERSION,
  WBI_CACHE_TTL_MS,
};
