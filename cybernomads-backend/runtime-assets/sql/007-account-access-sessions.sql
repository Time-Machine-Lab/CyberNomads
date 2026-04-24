DROP TABLE IF EXISTS account_connection_attempts;
DROP INDEX IF EXISTS idx_account_connection_attempts_account_updated_at;
DROP INDEX IF EXISTS idx_account_connection_attempts_platform;
DROP INDEX IF EXISTS idx_account_connection_attempts_status;

CREATE TABLE IF NOT EXISTS account_access_sessions (
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

CREATE INDEX IF NOT EXISTS idx_account_access_sessions_account_updated_at
  ON account_access_sessions(account_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_access_sessions_platform
  ON account_access_sessions(platform);

CREATE INDEX IF NOT EXISTS idx_account_access_sessions_status
  ON account_access_sessions(session_status);
