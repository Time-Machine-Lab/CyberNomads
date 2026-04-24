-- 账号包装对象 SQL 契约
-- 当前版本对应账号模块 V2。
-- 账号对象以 `account_id` 作为唯一标识，不再要求平台 UID 在系统内承担唯一身份语义。

DROP TABLE IF EXISTS accounts;

CREATE TABLE accounts (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  internal_display_name TEXT NOT NULL,
  remark TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  platform_metadata_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL
    CHECK (lifecycle_status IN (
      'active',
      'disabled',
      'deleted'
    )),
  connection_status TEXT NOT NULL
    CHECK (connection_status IN (
      'not_logged_in',
      'connecting',
      'connected',
      'connect_failed',
      'expired'
    )),
  connection_status_reason TEXT,
  availability_status TEXT NOT NULL
    CHECK (availability_status IN (
      'unknown',
      'healthy',
      'risk',
      'restricted',
      'offline'
    )),
  availability_status_reason TEXT,
  resolved_platform_account_uid TEXT,
  resolved_display_name TEXT,
  resolved_avatar_url TEXT,
  resolved_profile_metadata_json TEXT NOT NULL DEFAULT '{}',
  active_credential_ref TEXT,
  active_credential_expires_at TEXT,
  active_credential_updated_at TEXT,
  last_connected_at TEXT,
  last_verified_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (active_credential_ref IS NULL AND active_credential_expires_at IS NULL)
    OR (active_credential_ref IS NOT NULL)
  ),
  CHECK (
    (lifecycle_status = 'deleted' AND deleted_at IS NOT NULL)
    OR (lifecycle_status IN ('active', 'disabled') AND deleted_at IS NULL)
  )
);

CREATE INDEX idx_accounts_updated_at
  ON accounts(updated_at DESC);

CREATE INDEX idx_accounts_platform
  ON accounts(platform);

CREATE INDEX idx_accounts_state
  ON accounts(
    lifecycle_status,
    connection_status,
    availability_status
  );

-- 字段语义
-- account_id:
--   账号包装对象的稳定主键。
--
-- platform:
--   平台编码，例如 bilibili。
--
-- internal_display_name / remark / tags_json / platform_metadata_json:
--   运营人员可编辑的账号资料。
--
-- lifecycle_status:
--   账号生命周期状态。
--
-- connection_status:
--   账号连接状态，是当前账号接入主流程的第一状态维度。
--
-- availability_status:
--   账号诊断状态，仅用于观察，不是接入主流程门槛。
--
-- resolved_platform_*:
--   最近一次成功验证得到的平台资料快照。
--   这些字段不参与系统唯一性建模。
--
-- active_credential_*:
--   当前已生效凭证的 secret 引用与时间摘要。
--
-- last_connected_at / last_verified_at:
--   最近一次成功接入与验证时间。
--
-- deleted_at:
--   逻辑删除时间。
