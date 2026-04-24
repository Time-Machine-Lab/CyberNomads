'use strict';

const fs = require('fs');
const { CliError } = require('./errors');
const { getOption } = require('./args');

function readFileValue(filePath, label) {
  try {
    return fs.readFileSync(filePath, 'utf8').trim();
  } catch (error) {
    throw new CliError(`无法读取 ${label} 文件。`, 1, {
      filePath,
      detail: error.message,
    });
  }
}

function readEnvValue(envName, label) {
  const value = process.env[String(envName)];
  if (!value) {
    throw new CliError(`环境变量中缺少 ${label}。`, 1, {
      envName,
    });
  }
  return value.trim();
}

function readSensitiveInput(options, config) {
  const directValue = getOption(options, config.valueKeys || []);
  if (directValue != null && directValue !== '') {
    return String(directValue).trim();
  }

  const filePath = getOption(options, config.fileKeys || []);
  if (filePath != null && filePath !== '') {
    return readFileValue(String(filePath), config.label);
  }

  const envName = getOption(options, config.envKeys || []);
  if (envName != null && envName !== '') {
    return readEnvValue(String(envName), config.label);
  }

  if (config.required) {
    throw new CliError(config.message || `缺少 ${config.label}。`);
  }

  return '';
}

function readCookieInput(options, required = false) {
  return readSensitiveInput(options, {
    label: 'Cookie',
    required,
    valueKeys: ['cookie'],
    fileKeys: ['cookie-file', 'cookieFile'],
    envKeys: ['cookie-env', 'cookieEnv'],
    message: '缺少 Cookie。请使用 --cookie、--cookie-file 或 --cookie-env 传入。',
  });
}

function readRefreshTokenInput(options, required = false) {
  return readSensitiveInput(options, {
    label: 'refresh token',
    required,
    valueKeys: ['refresh-token', 'refreshToken'],
    fileKeys: ['refresh-token-file', 'refreshTokenFile'],
    envKeys: ['refresh-token-env', 'refreshTokenEnv'],
    message:
      '缺少 refresh token。请使用 --refresh-token、--refresh-token-file 或 --refresh-token-env 传入。',
  });
}

module.exports = {
  readSensitiveInput,
  readCookieInput,
  readRefreshTokenInput,
};
