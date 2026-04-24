'use strict';

const { CliError } = require('./errors');
const { toInt, toBool, requireOption, getOption } = require('./args');
const { createResult, presentData } = require('./output');
const { readCookieInput } = require('./inputs');
const { BilibiliClient } = require('./client');

function canFallbackToCookie(error) {
  if (!error) {
    return false;
  }
  if (error instanceof CliError) {
    const code = Number(error?.details?.code);
    if (Number.isFinite(code) && (code === -352 || code === 352 || code === -403 || code === 403)) {
      return true;
    }
    return true;
  }
  return true;
}

async function handleVideo(command, options, baseContext) {
  const cookie = readCookieInput(options, false);
  const client = new BilibiliClient({
    cookie,
    userAgent: getOption(options, ['user-agent', 'userAgent']) || baseContext.userAgent,
  });

  if (command === 'search') {
    const searchOptions = {
      keyword: requireOption(options, 'keyword'),
      page: toInt(getOption(options, ['page']), 1),
      limit: toInt(getOption(options, ['limit']), 10),
      raw: toBool(getOption(options, ['raw']), false),
    };

    let items;
    let mode = 'anonymous';
    let fallbackApplied = false;
    let fallbackReason = '';
    try {
      items = await client.searchVideosAnonymous(searchOptions);
    } catch (error) {
      if (!cookie || !canFallbackToCookie(error)) {
        throw error;
      }
      items = await client.searchVideosWithCookie(searchOptions);
      mode = 'cookie';
      fallbackApplied = true;
      fallbackReason = error.message;
    }

    return createResult({
      command: 'video.search',
      data: presentData(
        {
          items,
          page: searchOptions.page,
          limit: searchOptions.limit,
        },
        options,
        {
          searchMode: mode,
          fallbackApplied,
          fallbackReason,
          hasCookieFallback: Boolean(cookie),
        }
      ),
    });
  }

  if (command === 'detail') {
    const detail = await client.getVideoDetail(requireOption(options, ['id', 'url']));
    return createResult({
      command: 'video.detail',
      data: presentData(detail, options),
    });
  }

  throw new CliError(`未知的 video 指令: ${command}`);
}

module.exports = {
  handleVideo,
};
