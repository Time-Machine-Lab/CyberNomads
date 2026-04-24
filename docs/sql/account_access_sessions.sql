-- 账号 access session SQL 契约
-- access session 是账号绑定的短生命周期接入资源，用于承载手工令牌、二维码登录、
-- 扫码轮询、验证生效与日志引用，不负责账号创建。

DROP TABLE IF EXISTS account_access_sessions;
DROP INDEX IF EXISTS idx_account_access_sessions_account_updated_at;
DROP INDEX IF EXISTS idx_account_access_sessions_platform;
DROP INDEX IF EXISTS idx_account_access_sessions_status;

CREATE TABLE account_access_sessions (
  session_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  access_mode TEXT NOT NULL
    CHECK (access_mode IN (
      'manual_token',
      'qr_login'
    )),
  session_status TEXT NOT NULL
    CHECK (session_status IN (
      'waiting_for_scan',
      'waiting_for_confirmation',
      'ready_for_verification',
      'verifying',
      'verified',
      'verify_failed',
      'expired',
      'canceled'
    )),
  session_status_reason TEXT,
  challenge_json TEXT NOT NULL DEFAULT 'null',
  provider_session_ref TEXT,
  candidate_credential_ref TEXT,
  resolved_platform_account_uid TEXT,
  resolved_display_name TEXT,
  resolved_avatar_url TEXT,
  resolved_profile_metadata_json TEXT NOT NULL DEFAULT '{}',
  log_ref TEXT,
  expires_at TEXT,
  verified_at TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (applied_at IS NULL)
    OR (session_status = 'verified')
  )
);

CREATE INDEX idx_account_access_sessions_account_updated_at
  ON account_access_sessions(account_id, updated_at DESC);

CREATE INDEX idx_account_access_sessions_platform
  ON account_access_sessions(platform);

CREATE INDEX idx_account_access_sessions_status
  ON account_access_sessions(session_status);

-- 字段语义
-- session_id:
--   接入会话主键。
--
-- account_id:
--   所属账号包装对象标识。
--
-- access_mode:
--   当前接入方式，支持 manual_token 和 qr_login。
--
-- session_status:
--   会话状态。
--   二维码流程会在 waiting_for_scan / waiting_for_confirmation / ready_for_verification
--   之间推进；验证阶段进入 verifying；最终进入 verified / verify_failed / expired / canceled。
--
-- challenge_json:
--   前端可展示的挑战摘要，例如二维码图片地址。
--
-- provider_session_ref:
--   平台 provider 维护的临时上下文引用。
--
-- candidate_credential_ref:
--   待验证候选凭证的 secret 引用。
--
-- resolved_platform_*:
--   本次会话解析或验证出的平台资料快照。
--
-- log_ref:
--   当前会话日志引用。
--
-- expires_at:
--   会话预计过期时间。二维码会话默认 60 秒过期。
--
-- verified_at / applied_at:
--   验证完成与真正生效的时间戳。
