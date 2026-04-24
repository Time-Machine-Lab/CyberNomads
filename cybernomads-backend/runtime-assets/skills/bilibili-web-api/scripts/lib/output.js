'use strict';

function nowIso() {
  return new Date().toISOString();
}

function createResult({
  ok = true,
  command,
  runtimeRoot = '',
  data = {},
  riskHints = [],
  nextSteps = [],
  writes = [],
}) {
  return {
    ok,
    command,
    runtimeRoot,
    data,
    riskHints,
    nextSteps,
    writes,
    timestamp: nowIso(),
  };
}

function stripRaw(value) {
  if (Array.isArray(value)) {
    return value.map(stripRaw);
  }
  if (!value || typeof value !== 'object') {
    return value;
  }
  const next = {};
  for (const [key, item] of Object.entries(value)) {
    if (key === 'raw') {
      continue;
    }
    next[key] = stripRaw(item);
  }
  return next;
}

function presentData(data, options = {}, extras = {}) {
  const normalized = options.raw ? data : stripRaw(data);
  if (options.verbose && Object.keys(extras).length) {
    return {
      ...normalized,
      verbose: extras,
    };
  }
  return normalized;
}

function printJson(payload) {
  process.stdout.write(`${JSON.stringify(payload, null, 2)}\n`);
}

function printResult(result) {
  printJson(result);
}

function printError(error, runtimeRoot = '') {
  const payload = {
    ok: false,
    error: {
      name: error?.name || 'Error',
      message: error?.message || String(error),
      details: error?.details || null,
      hint: error?.hint || '',
      exitCode: error?.exitCode || 1,
    },
    runtimeRoot,
    timestamp: nowIso(),
  };
  printJson(payload);
}

module.exports = {
  nowIso,
  createResult,
  stripRaw,
  presentData,
  printResult,
  printError,
};
