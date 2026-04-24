'use strict';

const { DEFAULT_USER_AGENT } = require('./constants');
const { request, unwrapBiliResponse } = require('./http');
const {
  requireCookie,
  requireCsrf,
  parseSetCookieHeaders,
  getSetCookieArray,
  serializeCookieMap,
} = require('./cookie');
const {
  extractVideoId,
  normalizeSearchVideo,
  normalizeVideoDetail,
  normalizeComments,
  normalizeMainComments,
  normalizeUserInfo,
  normalizeUnreadNotifications,
  normalizeReplyNotifications,
  normalizeDmSessions,
  normalizeDmMessages,
} = require('./parsers');
const { signWbiParams } = require('./wbi');

const BILIBILI_HOME_URL = 'https://www.bilibili.com/';

class BilibiliClient {
  constructor(options = {}) {
    this.cookie = options.cookie || '';
    this.userAgent = options.userAgent || DEFAULT_USER_AGENT;
    this.anonymousSearchCookie = null;
    this.wbiCache = options.wbiCache || null;
  }

  headers(extra = {}) {
    return {
      accept: 'application/json, text/plain, */*',
      'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
      'user-agent': this.userAgent,
      cookie: this.cookie || '',
      ...extra,
    };
  }

  async get(url, options = {}) {
    return request(url, {
      method: 'GET',
      headers: this.headers(options.headers),
      query: options.query,
      decompressDeflate: options.decompressDeflate,
    });
  }

  async post(url, options = {}) {
    return request(url, {
      method: 'POST',
      headers: this.headers(options.headers),
      query: options.query,
      form: options.form,
      json: options.json,
    });
  }

  resolveVideoId(input) {
    return extractVideoId(input);
  }

  async getAnonymousSearchCookie() {
    if (this.anonymousSearchCookie !== null) {
      return this.anonymousSearchCookie;
    }

    try {
      const response = await request(BILIBILI_HOME_URL, {
        method: 'GET',
        headers: {
          accept: '*/*',
          'accept-language': 'zh-CN,zh;q=0.9,en;q=0.8',
          'user-agent': this.userAgent,
          referer: BILIBILI_HOME_URL,
        },
      });
      this.anonymousSearchCookie = serializeCookieMap(parseSetCookieHeaders(getSetCookieArray(response.headers)));
    } catch {
      this.anonymousSearchCookie = '';
    }

    return this.anonymousSearchCookie;
  }

  async searchVideosAnonymous({ keyword, page = 1, limit = 10, raw = false }) {
    const encodedKeyword = encodeURIComponent(String(keyword).trim());
    const anonymousCookie = await this.getAnonymousSearchCookie();
    const data = unwrapBiliResponse(await request(
      `https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodedKeyword}&page=${page}&order=totalrank`,
      {
        method: 'GET',
        headers: this.headers({
          cookie: anonymousCookie,
          referer: `https://search.bilibili.com/all?keyword=${encodedKeyword}`,
        }),
      }
    ));
    const videos = data?.result?.find((item) => item.result_type === 'video')?.data || [];
    return raw ? videos.slice(0, limit) : videos.map(normalizeSearchVideo).slice(0, limit);
  }

  async searchVideosWithCookie({ keyword, page = 1, limit = 10, raw = false, cookie } = {}) {
    const encodedKeyword = encodeURIComponent(String(keyword).trim());
    const data = unwrapBiliResponse(await request(
      `https://api.bilibili.com/x/web-interface/search/all/v2?keyword=${encodedKeyword}&page=${page}&order=totalrank`,
      {
        method: 'GET',
        headers: this.headers({
          cookie: cookie || this.cookie || '',
          referer: `https://search.bilibili.com/all?keyword=${encodedKeyword}`,
        }),
      }
    ));
    const videos = data?.result?.find((item) => item.result_type === 'video')?.data || [];
    return raw ? videos.slice(0, limit) : videos.map(normalizeSearchVideo).slice(0, limit);
  }

  async searchVideos(options = {}) {
    return this.searchVideosAnonymous(options);
  }

  async getUserInfo() {
    requireCookie(this.cookie);
    const data = unwrapBiliResponse(await this.get('https://api.bilibili.com/x/web-interface/nav'));
    return normalizeUserInfo(data);
  }

  async getVideoDetail(idOrUrl) {
    const id = this.resolveVideoId(idOrUrl);
    const query = id.startsWith('BV') ? { bvid: id } : { aid: id };
    const data = unwrapBiliResponse(await this.get('https://api.bilibili.com/x/web-interface/view', { query }));
    return normalizeVideoDetail(data);
  }

  async resolveOid({ oid, id }) {
    if (oid) {
      return String(oid);
    }
    const detail = await this.getVideoDetail(id);
    return String(detail.aid);
  }

  async listComments({ oid, id, page = 1, size = 20, sort = 1, nohot = 1 }) {
    const realOid = await this.resolveOid({ oid, id });
    const data = unwrapBiliResponse(
      await this.get('https://api.bilibili.com/x/v2/reply', {
        query: { type: 1, oid: realOid, pn: page, ps: size, sort, nohot },
      })
    );
    return {
      oid: realOid,
      ...normalizeComments(data),
    };
  }

  async scanMainComments({ oid, id, mode = 3, nextOffset = '', seekRpid = '' }) {
    const realOid = await this.resolveOid({ oid, id });
    const query = await signWbiParams(
      {
        type: 1,
        oid: realOid,
        mode,
        pagination_str: JSON.stringify({ offset: nextOffset || '' }),
        plat: 1,
        seek_rpid: seekRpid || '',
        web_location: 1315875,
      },
      this
    );
    const data = unwrapBiliResponse(await this.get('https://api.bilibili.com/x/v2/reply/wbi/main', { query }));
    return {
      oid: realOid,
      mode,
      ...normalizeMainComments(data),
    };
  }

  async sendComment({ oid, id, message, root, parent }) {
    requireCookie(this.cookie);
    const csrf = requireCsrf(this.cookie);
    const realOid = await this.resolveOid({ oid, id });
    const result = unwrapBiliResponse(
      await this.post('https://api.bilibili.com/x/v2/reply/add', {
        form: {
          type: 1,
          oid: realOid,
          message,
          plat: 1,
          root,
          parent,
          csrf,
        },
      })
    );
    return {
      success: true,
      oid: realOid,
      message,
      root: root ? String(root) : null,
      parent: parent ? String(parent) : null,
      raw: result,
    };
  }

  async getUnreadNotifications() {
    requireCookie(this.cookie);
    const data = unwrapBiliResponse(await this.get('https://api.bilibili.com/x/msgfeed/unread'));
    return normalizeUnreadNotifications(data);
  }

  async getReplyNotifications({ id, replyTime, build = 0, mobiApp = 'web', platform = 'web' } = {}) {
    requireCookie(this.cookie);
    const data = unwrapBiliResponse(
      await this.get('https://api.bilibili.com/x/msgfeed/reply', {
        query: {
          build,
          mobi_app: mobiApp,
          id,
          reply_time: replyTime,
          platform,
          web_location: 333.999,
        },
      })
    );
    return normalizeReplyNotifications(data);
  }

  async listDmSessions({ sessionType = 1, groupFold = 1, unfollowFold = 0, sortRule = 2, build = 0, mobiApp = 'web' } = {}) {
    requireCookie(this.cookie);
    const data = unwrapBiliResponse(
      await this.get('https://api.vc.bilibili.com/session_svr/v1/session_svr/get_sessions', {
        query: {
          session_type: sessionType,
          group_fold: groupFold,
          unfollow_fold: unfollowFold,
          sort_rule: sortRule,
          build,
          mobi_app: mobiApp,
        },
      })
    );
    return normalizeDmSessions(data);
  }

  async getDmMessages({ talkerId, sessionType = 1, beginSeqno = 0, size = 20, build = 0, mobiApp = 'web' }) {
    requireCookie(this.cookie);
    const data = unwrapBiliResponse(
      await this.get('https://api.vc.bilibili.com/svr_sync/v1/svr_sync/fetch_session_msgs', {
        query: {
          talker_id: talkerId,
          session_type: sessionType,
          begin_seqno: beginSeqno,
          size,
          build,
          mobi_app: mobiApp,
        },
      })
    );
    return normalizeDmMessages(data);
  }

  async sendDm({ receiverId, message, devId, timestamp = Date.now(), msgType = 1 }) {
    requireCookie(this.cookie);
    const csrf = requireCsrf(this.cookie);
    const result = unwrapBiliResponse(
      await this.post('https://api.vc.bilibili.com/web_im/v1/web_im/send_msg', {
        form: {
          msg: typeof message === 'string' ? JSON.stringify({ content: message }) : JSON.stringify(message),
          msg_type: msgType,
          receiver_id: receiverId,
          receiver_type: 1,
          dev_id: devId,
          timestamp,
          csrf,
          csrf_token: csrf,
        },
      })
    );
    return {
      success: true,
      receiverId: String(receiverId),
      message,
      raw: result,
    };
  }
}

module.exports = {
  BilibiliClient,
};
