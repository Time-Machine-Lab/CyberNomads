DROP TABLE IF EXISTS platform_accounts;
DROP INDEX IF EXISTS idx_platform_accounts_updated_at;
DROP INDEX IF EXISTS idx_platform_accounts_platform;
DROP INDEX IF EXISTS idx_platform_accounts_management_state;

CREATE TABLE IF NOT EXISTS accounts (
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

CREATE INDEX IF NOT EXISTS idx_accounts_updated_at
  ON accounts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_accounts_platform
  ON accounts(platform);

CREATE INDEX IF NOT EXISTS idx_accounts_state
  ON accounts(
    lifecycle_status,
    connection_status,
    availability_status
  );
