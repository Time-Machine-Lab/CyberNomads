'use strict';

const { CliError } = require('./errors');
const { createResult, presentData } = require('./output');
const { readCookieInput } = require('./inputs');
const { getOption } = require('./args');
const { BilibiliClient } = require('./client');

async function handleAccount(command, options, baseContext) {
  if (command !== 'self-get') {
    throw new CliError(`未知的 account 指令: ${command}`);
  }

  const cookie = readCookieInput(options, true);
  const client = new BilibiliClient({
    cookie,
    userAgent: getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent,
  });
  const data = await client.getUserInfo();
  return createResult({
    command: 'account.self_get',
    data: presentData(data, options),
  });
}

module.exports = {
  handleAccount,
};
