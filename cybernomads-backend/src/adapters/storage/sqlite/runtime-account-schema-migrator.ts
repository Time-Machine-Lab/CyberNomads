import type { RuntimeDatabase } from "./runtime-database.js";

interface TableLookupRow {
  name: string;
}

export function migrateLegacyAccountRuntimeSchema(database: RuntimeDatabase): void {
  migrateLegacyAccountsTable(database);
  migrateLegacyAccessSessionsTable(database);
  dropLegacyConnectionAttemptsTable(database);
}

function migrateLegacyAccountsTable(database: RuntimeDatabase): void {
  if (!hasTable(database, "accounts")) {
    return;
  }

  if (!hasLegacyAccountsColumns(database)) {
    return;
  }

  database.exec("BEGIN IMMEDIATE;");

  try {
    database.exec(`
      ALTER TABLE accounts RENAME TO accounts_legacy_runtime;

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

      INSERT INTO accounts (
        account_id,
        platform,
        internal_display_name,
        remark,
        tags_json,
        platform_metadata_json,
        lifecycle_status,
        connection_status,
        connection_status_reason,
        availability_status,
        availability_status_reason,
        resolved_platform_account_uid,
        resolved_display_name,
        resolved_avatar_url,
        resolved_profile_metadata_json,
        active_credential_ref,
        active_credential_expires_at,
        active_credential_updated_at,
        last_connected_at,
        last_verified_at,
        deleted_at,
        created_at,
        updated_at
      )
      SELECT
        account_id,
        platform,
        internal_display_name,
        remark,
        tags_json,
        platform_metadata_json,
        lifecycle_status,
        CASE login_status
          WHEN 'login_failed' THEN 'connect_failed'
          ELSE login_status
        END AS connection_status,
        login_status_reason,
        availability_status,
        availability_status_reason,
        resolved_platform_account_uid,
        resolved_display_name,
        resolved_avatar_url,
        resolved_profile_metadata_json,
        active_token_ref,
        active_token_expires_at,
        active_token_updated_at,
        last_connected_at,
        last_validated_at,
        deleted_at,
        created_at,
        updated_at
      FROM accounts_legacy_runtime;

      DROP TABLE accounts_legacy_runtime;

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
    `);

    database.exec("COMMIT;");
  } catch (error) {
    rollbackQuietly(database);
    throw error;
  }
}

function migrateLegacyAccessSessionsTable(database: RuntimeDatabase): void {
  if (hasCurrentAccessSessionColumns(database)) {
    return;
  }

  if (hasLegacyConnectionAttemptsTable(database)) {
    database.exec("BEGIN IMMEDIATE;");

    try {
      database.exec(`
        ALTER TABLE account_connection_attempts RENAME TO account_connection_attempts_legacy_runtime;

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

        INSERT INTO account_access_sessions (
          session_id,
          account_id,
          platform,
          access_mode,
          session_status,
          session_status_reason,
          challenge_json,
          provider_session_ref,
          candidate_credential_ref,
          resolved_platform_account_uid,
          resolved_display_name,
          resolved_avatar_url,
          resolved_profile_metadata_json,
          log_ref,
          expires_at,
          verified_at,
          applied_at,
          created_at,
          updated_at
        )
        SELECT
          attempt_id,
          account_id,
          platform,
          connection_method,
          CASE attempt_status
            WHEN 'pending_resolution' THEN 'waiting_for_scan'
            WHEN 'ready_for_validation' THEN 'ready_for_verification'
            WHEN 'validating' THEN 'verifying'
            WHEN 'validation_succeeded' THEN 'verified'
            WHEN 'validation_failed' THEN 'verify_failed'
            ELSE attempt_status
          END AS session_status,
          attempt_status_reason,
          challenge_json,
          platform_session_ref,
          COALESCE(candidate_token_ref, input_token_ref),
          resolved_platform_account_uid,
          resolved_display_name,
          resolved_avatar_url,
          resolved_profile_metadata_json,
          log_ref,
          expires_at,
          validated_at,
          applied_at,
          created_at,
          updated_at
        FROM account_connection_attempts_legacy_runtime;

        DROP TABLE account_connection_attempts_legacy_runtime;

        CREATE INDEX idx_account_access_sessions_account_updated_at
          ON account_access_sessions(account_id, updated_at DESC);

        CREATE INDEX idx_account_access_sessions_platform
          ON account_access_sessions(platform);

        CREATE INDEX idx_account_access_sessions_status
          ON account_access_sessions(session_status);
      `);

      database.exec("COMMIT;");
    } catch (error) {
      rollbackQuietly(database);
      throw error;
    }

    return;
  }

  if (!hasTable(database, "account_access_sessions")) {
    return;
  }

  if (!hasLegacyAccessSessionColumns(database)) {
    return;
  }

  database.exec("BEGIN IMMEDIATE;");

  try {
    database.exec(`
      ALTER TABLE account_access_sessions RENAME TO account_access_sessions_legacy_runtime;

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

      INSERT INTO account_access_sessions (
        session_id,
        account_id,
        platform,
        access_mode,
        session_status,
        session_status_reason,
        challenge_json,
        provider_session_ref,
        candidate_credential_ref,
        resolved_platform_account_uid,
        resolved_display_name,
        resolved_avatar_url,
        resolved_profile_metadata_json,
        log_ref,
        expires_at,
        verified_at,
        applied_at,
        created_at,
        updated_at
      )
      SELECT
        session_id,
        account_id,
        platform,
        access_mode,
        session_status,
        session_status_reason,
        challenge_json,
        platform_session_ref,
        candidate_credential_ref,
        resolved_platform_account_uid,
        resolved_display_name,
        resolved_avatar_url,
        resolved_profile_metadata_json,
        log_ref,
        expires_at,
        verified_at,
        applied_at,
        created_at,
        updated_at
      FROM account_access_sessions_legacy_runtime;

      DROP TABLE account_access_sessions_legacy_runtime;

      CREATE INDEX idx_account_access_sessions_account_updated_at
        ON account_access_sessions(account_id, updated_at DESC);

      CREATE INDEX idx_account_access_sessions_platform
        ON account_access_sessions(platform);

      CREATE INDEX idx_account_access_sessions_status
        ON account_access_sessions(session_status);
    `);

    database.exec("COMMIT;");
  } catch (error) {
    rollbackQuietly(database);
    throw error;
  }
}

function dropLegacyConnectionAttemptsTable(database: RuntimeDatabase): void {
  if (!hasTable(database, "account_connection_attempts")) {
    return;
  }

  if (!hasCurrentAccessSessionColumns(database)) {
    return;
  }

  database.exec(`
    DROP TABLE IF EXISTS account_connection_attempts;
    DROP INDEX IF EXISTS idx_account_connection_attempts_account_updated_at;
    DROP INDEX IF EXISTS idx_account_connection_attempts_platform;
    DROP INDEX IF EXISTS idx_account_connection_attempts_status;
  `);
}

function hasLegacyAccountsColumns(database: RuntimeDatabase): boolean {
  return hasColumns(database, "accounts", [
    "login_status",
    "login_status_reason",
    "active_token_ref",
    "active_token_expires_at",
    "active_token_updated_at",
    "last_validated_at",
  ]);
}

function hasLegacyAccessSessionColumns(database: RuntimeDatabase): boolean {
  return hasColumns(database, "account_access_sessions", ["platform_session_ref"]);
}

function hasCurrentAccessSessionColumns(database: RuntimeDatabase): boolean {
  return hasColumns(database, "account_access_sessions", ["provider_session_ref"]);
}

function hasLegacyConnectionAttemptsTable(database: RuntimeDatabase): boolean {
  return hasTable(database, "account_connection_attempts");
}

function hasColumns(
  database: RuntimeDatabase,
  tableName: string,
  columnNames: string[],
): boolean {
  try {
    database
      .prepare(
        `SELECT ${columnNames.map((columnName) => `"${columnName}"`).join(", ")} FROM ${tableName} LIMIT 1`,
      )
      .get();
    return true;
  } catch {
    return false;
  }
}

function hasTable(database: RuntimeDatabase, tableName: string): boolean {
  const row = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(tableName) as TableLookupRow | undefined;

  return row !== undefined;
}

function rollbackQuietly(database: RuntimeDatabase): void {
  try {
    database.exec("ROLLBACK;");
  } catch {
    // Ignore rollback failures and preserve the original migration error.
  }
}
