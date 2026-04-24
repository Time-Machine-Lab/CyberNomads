'use strict';

const { CliError } = require('./errors');
const { getOption } = require('./args');
const { createResult, presentData } = require('./output');
const { readCookieInput, readRefreshTokenInput } = require('./inputs');
const {
  generateQrCode,
  pollQrCode,
  checkCookieRefresh,
  refreshCookie,
} = require('./auth');

async function handleAuth(command, options, baseContext) {
  const userAgent = getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent;

  if (command === 'qr-start') {
    const data = await generateQrCode({ userAgent });
    return createResult({
      command: 'auth.qr_start',
      data: presentData(data, options),
    });
  }

  if (command === 'qr-poll') {
    const data = await pollQrCode({
      qrcodeKey: getOption(options, ['qrcodeKey', 'qrcode-key', 'key']) || '',
      userAgent,
    });
    return createResult({
      command: 'auth.qr_poll',
      data: presentData(data, options),
    });
  }

  if (command === 'refresh-check') {
    const cookie = readCookieInput(options, true);
    const data = await checkCookieRefresh({
      cookie,
      userAgent,
    });
    return createResult({
      command: 'auth.refresh_check',
      data: presentData(data, options),
    });
  }

  if (command === 'refresh-cookie') {
    const cookie = readCookieInput(options, true);
    const refreshToken = readRefreshTokenInput(options, true);
    const data = await refreshCookie({
      cookie,
      refreshToken,
      userAgent,
    });
    return createResult({
      command: 'auth.refresh_cookie',
      data: presentData(data, options),
    });
  }

  throw new CliError(`未知的 auth 指令: ${command}`);
}

module.exports = {
  handleAuth,
};
