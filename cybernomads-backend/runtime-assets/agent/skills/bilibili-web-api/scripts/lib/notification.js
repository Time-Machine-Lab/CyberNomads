'use strict';

const { CliError } = require('./errors');
const { getOption } = require('./args');
const { createResult, presentData } = require('./output');
const { readCookieInput } = require('./inputs');
const { BilibiliClient } = require('./client');

async function handleNotification(command, options, baseContext) {
  const cookie = readCookieInput(options, true);
  const client = new BilibiliClient({
    cookie,
    userAgent: getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent,
  });

  if (command === 'unread') {
    const data = await client.getUnreadNotifications();
    return createResult({
      command: 'notification.unread',
      data: presentData(data, options),
    });
  }

  if (command === 'reply-list') {
    const data = await client.getReplyNotifications({
      id: getOption(options, ['id']) || '',
      replyTime: getOption(options, ['reply-time', 'replyTime']) || '',
    });
    return createResult({
      command: 'notification.reply_list',
      data: presentData(data, options),
    });
  }

  throw new CliError(`未知的 notification 指令: ${command}`);
}

module.exports = {
  handleNotification,
};
