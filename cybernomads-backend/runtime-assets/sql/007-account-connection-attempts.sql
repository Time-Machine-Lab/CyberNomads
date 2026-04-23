CREATE TABLE IF NOT EXISTS account_connection_attempts (
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

CREATE INDEX IF NOT EXISTS idx_account_connection_attempts_account_updated_at
  ON account_connection_attempts(account_id, updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_connection_attempts_platform
  ON account_connection_attempts(platform);

CREATE INDEX IF NOT EXISTS idx_account_connection_attempts_status
  ON account_connection_attempts(attempt_status);
