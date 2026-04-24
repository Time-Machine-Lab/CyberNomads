'use strict';

const { CliError } = require('./errors');
const { toInt, requireOption, getOption } = require('./args');
const { createResult, presentData } = require('./output');
const { readCookieInput } = require('./inputs');
const { BilibiliClient } = require('./client');

async function handleDm(command, options, baseContext) {
  const cookie = readCookieInput(options, true);
  const client = new BilibiliClient({
    cookie,
    userAgent: getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent,
  });

  if (command === 'session-list') {
    const data = await client.listDmSessions({
      sessionType: toInt(getOption(options, ['session-type', 'sessionType']), 1),
      groupFold: toInt(getOption(options, ['group-fold', 'groupFold']), 1),
      unfollowFold: toInt(getOption(options, ['unfollow-fold', 'unfollowFold']), 0),
      sortRule: toInt(getOption(options, ['sort-rule', 'sortRule']), 2),
      build: toInt(getOption(options, ['build']), 0),
      mobiApp: getOption(options, ['mobi-app', 'mobiApp']) || 'web',
    });
    return createResult({
      command: 'dm.session_list',
      data: presentData(data, options),
    });
  }

  if (command === 'message-list') {
    const data = await client.getDmMessages({
      talkerId: requireOption(options, ['talker-id', 'talkerId']),
      sessionType: toInt(getOption(options, ['session-type', 'sessionType']), 1),
      beginSeqno: toInt(getOption(options, ['begin-seqno', 'beginSeqno']), 0),
      size: toInt(getOption(options, ['size']), 20),
      build: toInt(getOption(options, ['build']), 0),
      mobiApp: getOption(options, ['mobi-app', 'mobiApp']) || 'web',
    });
    return createResult({
      command: 'dm.message_list',
      data: presentData(data, options),
    });
  }

  if (command === 'send') {
    const data = await client.sendDm({
      receiverId: requireOption(options, ['receiver-id', 'receiverId']),
      message: requireOption(options, 'message'),
      devId: getOption(options, ['dev-id', 'devId']) || crypto.randomUUID(),
      timestamp: toInt(getOption(options, ['timestamp']), Date.now()),
      msgType: toInt(getOption(options, ['msg-type', 'msgType']), 1),
    });
    return createResult({
      command: 'dm.send',
      data: presentData(data, options),
    });
  }

  throw new CliError(`未知的 dm 指令: ${command}`);
}

const crypto = require('crypto');

module.exports = {
  handleDm,
};
