DROP TABLE IF EXISTS platform_accounts;
DROP TABLE IF EXISTS account_onboarding_sessions;
DROP INDEX IF EXISTS idx_platform_accounts_updated_at;
DROP INDEX IF EXISTS idx_platform_accounts_platform;
DROP INDEX IF EXISTS idx_platform_accounts_management_state;
DROP INDEX IF EXISTS idx_account_onboarding_sessions_updated_at;
DROP INDEX IF EXISTS idx_account_onboarding_sessions_platform;
DROP INDEX IF EXISTS idx_account_onboarding_sessions_status;

DROP TABLE IF EXISTS account_connection_attempts;
CREATE TABLE account_connection_attempts (
  attempt_id TEXT PRIMARY KEY,
  account_id TEXT NOT NULL,
  platform TEXT NOT NULL,
  connection_method TEXT NOT NULL
    CHECK (connection_method IN (
      'manual_token',
      'qr_login'
    )),
  attempt_status TEXT NOT NULL
    CHECK (attempt_status IN (
      'pending_resolution',
      'ready_for_validation',
      'validating',
      'validation_succeeded',
      'validation_failed',
      'expired',
      'canceled'
    )),
  attempt_status_reason TEXT,
  challenge_json TEXT NOT NULL DEFAULT 'null',
  input_token_ref TEXT,
  platform_session_ref TEXT,
  candidate_token_ref TEXT,
  resolved_platform_account_uid TEXT,
  resolved_display_name TEXT,
  resolved_avatar_url TEXT,
  resolved_profile_metadata_json TEXT NOT NULL DEFAULT '{}',
  log_ref TEXT,
  expires_at TEXT,
  validated_at TEXT,
  applied_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (applied_at IS NULL)
    OR (attempt_status = 'validation_succeeded')
  )
);

CREATE INDEX idx_account_connection_attempts_account_updated_at
  ON account_connection_attempts(account_id, updated_at DESC);

CREATE INDEX idx_account_connection_attempts_platform
  ON account_connection_attempts(platform);

CREATE INDEX idx_account_connection_attempts_status
  ON account_connection_attempts(attempt_status);

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
  login_status TEXT NOT NULL
    CHECK (login_status IN (
      'not_logged_in',
      'connecting',
      'connected',
      'login_failed',
      'expired'
    )),
  login_status_reason TEXT,
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
  active_token_ref TEXT,
  active_token_expires_at TEXT,
  active_token_updated_at TEXT,
  last_connected_at TEXT,
  last_validated_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (active_token_ref IS NULL AND active_token_expires_at IS NULL)
    OR (active_token_ref IS NOT NULL)
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
    login_status,
    availability_status
  );
