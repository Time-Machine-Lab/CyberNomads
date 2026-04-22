CREATE TABLE IF NOT EXISTS account_onboarding_sessions (
  session_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  authorization_method TEXT NOT NULL,
  expected_credential_type TEXT,
  input_payload_ref TEXT,
  platform_session_payload_ref TEXT,
  challenge_json TEXT NOT NULL DEFAULT 'null',
  session_status TEXT NOT NULL
    CHECK (session_status IN (
      'pending_resolution',
      'resolved',
      'resolution_failed',
      'expired',
      'consumed',
      'canceled'
    )),
  session_status_reason TEXT,
  resolved_platform_account_uid TEXT,
  resolved_display_name TEXT,
  resolved_profile_json TEXT NOT NULL DEFAULT '{}',
  candidate_credential_type TEXT,
  candidate_credential_ref TEXT,
  final_disposition TEXT
    CHECK (
      final_disposition IS NULL
      OR final_disposition IN ('created', 'restored', 'existing')
    ),
  target_account_id TEXT,
  expires_at TEXT,
  consumed_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  CHECK (
    (candidate_credential_ref IS NULL AND candidate_credential_type IS NULL)
    OR (candidate_credential_ref IS NOT NULL AND candidate_credential_type IS NOT NULL)
  ),
  CHECK (
    (session_status = 'consumed' AND consumed_at IS NOT NULL)
    OR (session_status != 'consumed')
  )
);

CREATE INDEX IF NOT EXISTS idx_account_onboarding_sessions_updated_at
  ON account_onboarding_sessions(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_account_onboarding_sessions_platform
  ON account_onboarding_sessions(platform);

CREATE INDEX IF NOT EXISTS idx_account_onboarding_sessions_status
  ON account_onboarding_sessions(session_status);
