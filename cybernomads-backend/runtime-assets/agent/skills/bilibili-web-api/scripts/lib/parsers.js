'use strict';

function cleanTitle(title) {
  return String(title || '').replace(/<em class="keyword">(.*?)<\/em>/g, '$1');
}

function stripTags(value) {
  return String(value || '')
    .replace(/<[^>]+>/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function formatDate(timestamp) {
  if (!timestamp) {
    return '';
  }
  const date = new Date(Number(timestamp) * 1000);
  if (Number.isNaN(date.getTime())) {
    return '';
  }
  return date.toISOString().split('T')[0];
}

function formatDuration(duration) {
  if (typeof duration === 'string') {
    return duration;
  }
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    const minutes = Math.floor(duration / 60);
    const seconds = duration % 60;
    return `${minutes}:${String(seconds).padStart(2, '0')}`;
  }
  return '';
}

function durationToSeconds(duration) {
  if (typeof duration === 'number' && Number.isFinite(duration)) {
    return duration;
  }
  const parts = String(duration || '')
    .split(':')
    .map((item) => Number.parseInt(item, 10))
    .filter(Number.isFinite);
  if (!parts.length) {
    return 0;
  }
  if (parts.length === 1) {
    return parts[0];
  }
  if (parts.length === 2) {
    return parts[0] * 60 + parts[1];
  }
  return parts[0] * 3600 + parts[1] * 60 + parts[2];
}

function extractVideoId(input) {
  const value = String(input || '').trim();
  const bvMatch = value.match(/BV[0-9A-Za-z]+/i);
  if (bvMatch) {
    return `BV${bvMatch[0].slice(2)}`;
  }
  const avMatch = value.match(/(?:^|\/|[?&])av(\d+)/i);
  if (avMatch) {
    return avMatch[1];
  }
  return value;
}

function normalizeSearchVideo(video) {
  return {
    aid: video.aid || video.id || 0,
    bvid: video.bvid || '',
    title: cleanTitle(video.title),
    author: video.author || '',
    author_mid: video.mid || 0,
    category: {
      id: Number.parseInt(video.typeid, 10) || 0,
      name: video.typename || '',
    },
    play_count: Number.parseInt(video.play, 10) || 0,
    like_count: Number.parseInt(video.like, 10) || 0,
    favorite_count: Number.parseInt(video.favorites, 10) || 0,
    comment_count: Number.parseInt(video.review, 10) || 0,
    danmaku_count: Number.parseInt(video.danmaku, 10) || 0,
    duration: formatDuration(video.duration || ''),
    duration_sec: durationToSeconds(video.duration || ''),
    publish_date: formatDate(video.pubdate),
    publish_ts: Number(video.pubdate || 0),
    description: stripTags(video.description || ''),
    rank_index: Number.parseInt(video.rank_index, 10) || 0,
    tags: stripTags(video.tag || ''),
    arcurl: video.arcurl ? String(video.arcurl).replace(/^http:\/\//, 'https://') : '',
    raw: video,
  };
}

function normalizeVideoDetail(data) {
  const core = data.data || data;
  return {
    bvid: core.bvid,
    aid: core.aid,
    cid: core.cid,
    title: core.title,
    desc: core.desc,
    owner: core.owner
      ? {
          mid: core.owner.mid,
          name: core.owner.name,
        }
      : null,
    stat: core.stat || null,
    duration: core.duration,
    duration_sec: durationToSeconds(core.duration),
    pubdate: core.pubdate,
    redirectUrl: core.redirect_url || null,
    raw: data,
  };
}

function normalizeCommentItem(reply) {
  if (!reply) {
    return null;
  }
  return {
    rpid: String(reply.rpid ?? ''),
    root: reply.root ? String(reply.root) : null,
    parent: reply.parent ? String(reply.parent) : null,
    oid: reply.oid ? String(reply.oid) : null,
    username: reply.member?.uname || null,
    mid: reply.member?.mid || null,
    level: reply.member?.level_info?.current_level || null,
    sign: reply.member?.sign || '',
    message: reply.content?.message || '',
    like: reply.like || 0,
    replies: reply.rcount || 0,
    floor: reply.floor || null,
    ctime: reply.ctime || null,
    date: reply.ctime ? new Date(reply.ctime * 1000).toISOString() : null,
    raw: reply,
  };
}

function normalizeComments(data) {
  const page = data.page || {};
  const replies = Array.isArray(data.replies) ? data.replies : [];
  return {
    page: {
      num: page.num,
      size: page.size,
      count: page.count,
    },
    items: replies.map(normalizeCommentItem).filter(Boolean),
    raw: data,
  };
}

function normalizeMainComments(data) {
  const cursor = data.cursor || {};
  const replies = Array.isArray(data.replies) ? data.replies : [];
  return {
    cursor: {
      isEnd: Boolean(cursor.is_end),
      mode: cursor.mode ?? null,
      next: cursor.next ?? null,
      nextOffset: cursor.pagination_reply?.next_offset || '',
      allCount: cursor.all_count ?? null,
    },
    topReplies: Array.isArray(data.top_replies) ? data.top_replies.map(normalizeCommentItem).filter(Boolean) : [],
    hots: Array.isArray(data.hots) ? data.hots.map(normalizeCommentItem).filter(Boolean) : [],
    items: replies.map(normalizeCommentItem).filter(Boolean),
    raw: data,
  };
}

function normalizeUserInfo(data) {
  return {
    mid: data.mid,
    uname: data.uname,
    money: data.money,
    levelInfo: data.level_info || null,
    vipStatus: data.vip_status,
    vipType: data.vipType,
    avatar: data.face || '',
    sign: data.sign || '',
    raw: data,
  };
}

function normalizeUnreadNotifications(data) {
  return {
    at: data.at ?? 0,
    reply: data.reply ?? 0,
    recvLike: data.recv_like ?? data.like ?? 0,
    recvReply: data.recv_reply ?? 0,
    system: data.sys_msg ?? 0,
    up: data.up ?? 0,
    favorite: data.favorite ?? 0,
    coin: data.coin ?? 0,
    danmu: data.danmu ?? 0,
    raw: data,
  };
}

function normalizeReplyNotifications(data) {
  const cursor = data.cursor || {};
  const items = Array.isArray(data.items) ? data.items : [];
  return {
    cursor: {
      isEnd: Boolean(cursor.is_end),
      id: cursor.id ?? null,
      time: cursor.time ?? null,
    },
    lastViewAt: data.last_view_at ?? null,
    items: items.map((entry) => ({
      id: entry.id,
      counts: entry.counts,
      replyTime: entry.reply_time,
      user: entry.user
        ? {
            mid: entry.user.mid,
            nickname: entry.user.nickname,
            avatar: entry.user.avatar,
          }
        : null,
      item: entry.item || null,
      raw: entry,
    })),
    raw: data,
  };
}

function normalizeDmSessions(data) {
  const sessions = Array.isArray(data.session_list) ? data.session_list : [];
  return {
    hasMore: Boolean(data.has_more),
    items: sessions.map((entry) => ({
      talkerId: String(entry.talker_id),
      sessionType: entry.session_type,
      unreadCount: entry.unread_count,
      ackSeqno: entry.ack_seqno,
      sessionTs: entry.session_ts,
      lastMsg: entry.last_msg || null,
      raw: entry,
    })),
    raw: data,
  };
}

function normalizeDmMessages(data) {
  const messages = Array.isArray(data.messages) ? data.messages : [];
  return {
    hasMore: Boolean(data.has_more),
    minSeqno: data.min_seqno ?? null,
    maxSeqno: data.max_seqno ?? null,
    items: messages.map((entry) => {
      let content = entry.content;
      try {
        content = typeof entry.content === 'string' ? JSON.parse(entry.content) : entry.content;
      } catch {}
      return {
        senderUid: entry.sender_uid,
        receiverId: entry.receiver_id,
        msgKey: entry.msg_key,
        msgSeqno: entry.msg_seqno,
        msgType: entry.msg_type,
        timestamp: entry.timestamp,
        content,
        raw: entry,
      };
    }),
    raw: data,
  };
}

module.exports = {
  extractVideoId,
  normalizeSearchVideo,
  normalizeVideoDetail,
  normalizeComments,
  normalizeCommentItem,
  normalizeMainComments,
  normalizeUserInfo,
  normalizeUnreadNotifications,
  normalizeReplyNotifications,
  normalizeDmSessions,
  normalizeDmMessages,
};
