'use strict';

const zlib = require('zlib');
const { CliError } = require('./errors');

const RETRYABLE_STATUS_CODES = new Set([408, 429, 500, 502, 503, 504]);
const RETRYABLE_METHODS = new Set(['GET', 'HEAD']);

async function readResponseBody(response, decompressDeflate = false) {
  const arrayBuffer = await response.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  if (decompressDeflate) {
    return zlib.inflateRawSync(buffer).toString('utf8');
  }
  return buffer.toString('utf8');
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function isAbortError(error) {
  return error?.name === 'AbortError' || error?.code === 'ABORT_ERR';
}

function shouldRetry(method, attempt, maxRetries, error) {
  if (!RETRYABLE_METHODS.has(method) || attempt >= maxRetries) {
    return false;
  }
  if (isAbortError(error)) {
    return true;
  }
  if (error instanceof CliError) {
    return RETRYABLE_STATUS_CODES.has(Number(error.exitCode));
  }
  return true;
}

async function request(url, options = {}) {
  const {
    method = 'GET',
    headers = {},
    query,
    form,
    json,
    decompressDeflate = false,
    timeoutMs = 15000,
    maxRetries = RETRYABLE_METHODS.has(String(method).toUpperCase()) ? 2 : 0,
    retryDelayMs = 400,
  } = options;
  const finalMethod = String(method).toUpperCase();

  const target = new URL(url);
  if (query && typeof query === 'object') {
    for (const [key, value] of Object.entries(query)) {
      if (value !== undefined && value !== null && value !== '') {
        target.searchParams.set(key, String(value));
      }
    }
  }

  const finalHeaders = { ...headers };
  let body;
  if (form) {
    body = new URLSearchParams();
    for (const [key, value] of Object.entries(form)) {
      if (value !== undefined && value !== null) {
        body.set(key, String(value));
      }
    }
    body = body.toString();
    finalHeaders['content-type'] = 'application/x-www-form-urlencoded; charset=UTF-8';
  } else if (json) {
    body = JSON.stringify(json);
    finalHeaders['content-type'] = 'application/json; charset=UTF-8';
  }

  for (let attempt = 0; ; attempt += 1) {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), timeoutMs);
    try {
      const response = await fetch(target, {
        method: finalMethod,
        headers: finalHeaders,
        body,
        signal: controller.signal,
      });

      const rawBody = await readResponseBody(response, decompressDeflate);
      let parsedBody = rawBody;
      try {
        parsedBody = JSON.parse(rawBody);
      } catch {}

      if (!response.ok) {
        throw new CliError(`HTTP ${response.status} ${response.statusText}`, response.status, {
          url: target.toString(),
          body: parsedBody,
        });
      }

      return {
        status: response.status,
        headers: response.headers,
        body: parsedBody,
        rawBody,
        url: target.toString(),
      };
    } catch (error) {
      const normalizedError = isAbortError(error)
        ? new CliError(`HTTP request timed out after ${timeoutMs}ms`, 1, { url: target.toString(), timeoutMs })
        : error;
      if (!shouldRetry(finalMethod, attempt, maxRetries, normalizedError)) {
        throw normalizedError;
      }
      await sleep(retryDelayMs * (attempt + 1));
    } finally {
      clearTimeout(timeout);
    }
  }
}

function unwrapBiliResponse(result) {
  const payload = result.body;
  if (!payload || typeof payload !== 'object' || Array.isArray(payload)) {
    return payload;
  }

  if (typeof payload.code === 'number' && payload.code !== 0) {
    const message = payload.message || payload.msg || '';
    let hint = '';
    if (payload.code === -352 || payload.code === 352) {
      hint = '请求被风控拦截。建议降低频率，检查登录态，并优先走先审核后执行流程。';
    } else if (payload.code === -403 || payload.code === 403) {
      hint = '当前接口权限不足，通常需要完整登录态。';
    } else if (payload.code === -404 || payload.code === 404) {
      hint = '目标资源不存在，或传入的 BV/AV 号不正确。';
    }
    throw new CliError(`Bilibili API error: code=${payload.code}, message=${message}`, 1, payload, hint);
  }

  return payload.data !== undefined ? payload.data : payload;
}

module.exports = {
  request,
  unwrapBiliResponse,
};
