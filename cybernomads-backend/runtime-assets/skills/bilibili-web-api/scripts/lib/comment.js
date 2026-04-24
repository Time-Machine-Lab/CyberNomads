'use strict';

const { CliError } = require('./errors');
const { toInt, toBool, requireOption, getOption } = require('./args');
const { createResult, presentData } = require('./output');
const { readCookieInput } = require('./inputs');
const { BilibiliClient } = require('./client');

function ensureVideoRef(options) {
  const id = getOption(options, ['id']);
  const oid = getOption(options, ['oid']);
  if (!id && !oid) {
    throw new CliError('缺少视频标识。请至少传入 --id 或 --oid。');
  }
  return {
    id,
    oid,
  };
}

async function handleComment(command, options, baseContext) {
  const cookieRequired = command === 'send';
  const cookie = readCookieInput(options, cookieRequired);
  const client = new BilibiliClient({
    cookie,
    userAgent: getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent,
  });

  if (command === 'list') {
    const videoRef = ensureVideoRef(options);
    const data = await client.listComments({
      ...videoRef,
      page: toInt(getOption(options, ['page']), 1),
      size: toInt(getOption(options, ['size']), 20),
      sort: toInt(getOption(options, ['sort']), 1),
      nohot: toInt(getOption(options, ['nohot']), 1),
    });
    return createResult({
      command: 'comment.list',
      data: presentData(data, options),
    });
  }

  if (command === 'scan-main') {
    const videoRef = ensureVideoRef(options);
    const data = await client.scanMainComments({
      ...videoRef,
      mode: toInt(getOption(options, ['mode']), 3),
      nextOffset: getOption(options, ['next-offset', 'nextOffset']) || '',
      seekRpid: getOption(options, ['seek-rpid', 'seekRpid']) || '',
    });
    return createResult({
      command: 'comment.scan_main',
      data: presentData(data, options),
    });
  }

  if (command === 'send') {
    const videoRef = ensureVideoRef(options);
    const data = await client.sendComment({
      ...videoRef,
      message: requireOption(options, 'message'),
      root: getOption(options, ['root']) || '',
      parent: getOption(options, ['parent']) || '',
    });
    return createResult({
      command: 'comment.send',
      data: presentData(data, options),
    });
  }

  throw new CliError(`未知的 comment 指令: ${command}`);
}

module.exports = {
  handleComment,
};
