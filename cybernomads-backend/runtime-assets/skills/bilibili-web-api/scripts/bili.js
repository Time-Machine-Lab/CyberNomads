#!/usr/bin/env node
'use strict';

const { parseArgs, getOption } = require('./lib/args');
const { printResult, printError } = require('./lib/output');
const { DEFAULT_USER_AGENT } = require('./lib/constants');
const { CliError } = require('./lib/errors');
const { handleAuth } = require('./lib/auth-command');
const { handleAccount } = require('./lib/account');
const { handleVideo } = require('./lib/video');
const { handleComment } = require('./lib/comment');
const { handleNotification } = require('./lib/notification');
const { handleDm } = require('./lib/dm');

async function main() {
  const { positionals, options } = parseArgs(process.argv.slice(2));
  const [group, command] = positionals;
  if (!group || !command) {
    throw new CliError('Usage: node scripts/bili.js <group> <command> [...options]');
  }

  const baseContext = {
    userAgent: getOption(options, ['user-agent', 'userAgent']) || DEFAULT_USER_AGENT,
  };

  let result;
  switch (group) {
    case 'auth':
      result = await handleAuth(command, options, baseContext);
      break;
    case 'account':
      result = await handleAccount(command, options, baseContext);
      break;
    case 'video':
      result = await handleVideo(command, options, baseContext);
      break;
    case 'comment':
      result = await handleComment(command, options, baseContext);
      break;
    case 'notification':
      result = await handleNotification(command, options, baseContext);
      break;
    case 'dm':
      result = await handleDm(command, options, baseContext);
      break;
    default:
      throw new CliError(`未知的命令分组: ${group}`);
  }

  printResult(result);
}

main().catch((error) => {
  printError(error);
  process.exit(error.exitCode || 1);
});
