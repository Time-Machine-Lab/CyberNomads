CREATE TABLE IF NOT EXISTS platform_accounts (
  account_id TEXT PRIMARY KEY,
  platform TEXT NOT NULL,
  platform_account_uid TEXT NOT NULL,
  display_name TEXT NOT NULL,
  remark TEXT,
  tags_json TEXT NOT NULL DEFAULT '[]',
  platform_metadata_json TEXT NOT NULL DEFAULT '{}',
  lifecycle_status TEXT NOT NULL
    CHECK (lifecycle_status IN (
      'active',
      'disabled',
      'deleted'
    )),
  authorization_status TEXT NOT NULL
    CHECK (authorization_status IN (
      'unauthorized',
      'authorizing',
      'authorized',
      'expired',
      'revoked'
    )),
  authorization_status_reason TEXT,
  availability_status TEXT NOT NULL
    CHECK (availability_status IN (
      'unknown',
      'healthy',
      'risk',
      'restricted',
      'offline'
    )),
  availability_status_reason TEXT,
  active_credential_type TEXT,
  active_credential_ref TEXT,
  active_credential_expires_at TEXT,
  active_credential_updated_at TEXT,
  authorization_attempt_id TEXT,
  authorization_attempt_method TEXT,
  authorization_attempt_expected_credential_type TEXT,
  authorization_attempt_payload_ref TEXT,
  authorization_attempt_status TEXT
    CHECK (
      authorization_attempt_status IS NULL
      OR authorization_attempt_status IN (
        'pending_verification',
        'verification_succeeded',
        'verification_failed',
        'expired',
        'canceled'
      )
    ),
  authorization_attempt_status_reason TEXT,
  authorization_attempt_expires_at TEXT,
  authorization_attempt_created_at TEXT,
  authorization_attempt_updated_at TEXT,
  last_authorized_at TEXT,
  last_availability_checked_at TEXT,
  deleted_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL,
  UNIQUE (platform, platform_account_uid),
  CHECK (
    (active_credential_ref IS NULL AND active_credential_type IS NULL)
    OR (active_credential_ref IS NOT NULL AND active_credential_type IS NOT NULL)
  ),
  CHECK (
    (authorization_attempt_id IS NULL
      AND authorization_attempt_method IS NULL
      AND authorization_attempt_payload_ref IS NULL
      AND authorization_attempt_status IS NULL)
    OR (authorization_attempt_id IS NOT NULL
      AND authorization_attempt_method IS NOT NULL
      AND authorization_attempt_payload_ref IS NOT NULL
      AND authorization_attempt_status IS NOT NULL)
  ),
  CHECK (
    (lifecycle_status = 'deleted' AND deleted_at IS NOT NULL)
    OR (lifecycle_status IN ('active', 'disabled') AND deleted_at IS NULL)
  )
);

CREATE INDEX IF NOT EXISTS idx_platform_accounts_updated_at
  ON platform_accounts(updated_at DESC);

CREATE INDEX IF NOT EXISTS idx_platform_accounts_platform
  ON platform_accounts(platform);

CREATE INDEX IF NOT EXISTS idx_platform_accounts_management_state
  ON platform_accounts(
    lifecycle_status,
    authorization_status,
    availability_status
  );
