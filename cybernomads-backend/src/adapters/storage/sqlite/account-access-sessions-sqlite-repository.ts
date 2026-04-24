import { DatabaseSync } from "node:sqlite";

import type { AccountAccessSessionStateStore } from "../../../ports/account-access-session-state-store-port.js";
import type { AccountAccessSessionRecord } from "../../../modules/account-access-sessions/types.js";
import type {
  AccessMode,
  AccessSessionStatus,
  JsonObject,
} from "../../../modules/accounts/types.js";

interface AccountAccessSessionRow {
  session_id: string;
  account_id: string;
  platform: string;
  access_mode: AccessMode;
  session_status: AccessSessionStatus;
  session_status_reason: string | null;
  challenge_json: string;
  provider_session_ref: string | null;
  candidate_credential_ref: string | null;
  resolved_platform_account_uid: string | null;
  resolved_display_name: string | null;
  resolved_avatar_url: string | null;
  resolved_profile_metadata_json: string;
  log_ref: string | null;
  expires_at: string | null;
  verified_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAccountAccessSessionsRepository
  implements AccountAccessSessionStateStore
{
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createSession(record: AccountAccessSessionRecord): Promise<void> {
    this.database
      .prepare(
        `
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(...toRowValues(record));
  }

  async saveSession(record: AccountAccessSessionRecord): Promise<void> {
    this.database
      .prepare(
        `
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            account_id = excluded.account_id,
            platform = excluded.platform,
            access_mode = excluded.access_mode,
            session_status = excluded.session_status,
            session_status_reason = excluded.session_status_reason,
            challenge_json = excluded.challenge_json,
            provider_session_ref = excluded.provider_session_ref,
            candidate_credential_ref = excluded.candidate_credential_ref,
            resolved_platform_account_uid = excluded.resolved_platform_account_uid,
            resolved_display_name = excluded.resolved_display_name,
            resolved_avatar_url = excluded.resolved_avatar_url,
            resolved_profile_metadata_json = excluded.resolved_profile_metadata_json,
            log_ref = excluded.log_ref,
            expires_at = excluded.expires_at,
            verified_at = excluded.verified_at,
            applied_at = excluded.applied_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(...toRowValues(record));
  }

  async getSessionById(
    accountId: string,
    sessionId: string,
  ): Promise<AccountAccessSessionRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
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
          FROM account_access_sessions
          WHERE account_id = ? AND session_id = ?
        `,
      )
      .get(accountId, sessionId) as AccountAccessSessionRow | undefined;

    return row ? mapSessionRow(row) : undefined;
  }

  async getLatestSessionForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
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
          FROM account_access_sessions
          WHERE account_id = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 1
        `,
      )
      .get(accountId) as AccountAccessSessionRow | undefined;

    return row ? mapSessionRow(row) : undefined;
  }

  async listSessionsForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
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
          FROM account_access_sessions
          WHERE account_id = ?
          ORDER BY updated_at DESC, created_at DESC
        `,
      )
      .all(accountId) as unknown as AccountAccessSessionRow[];

    return rows.map(mapSessionRow);
  }

  close(): void {
    this.database.close();
  }
}

function toRowValues(
  record: AccountAccessSessionRecord,
): Array<string | null> {
  return [
    record.sessionId,
    record.accountId,
    record.platform,
    record.accessMode,
    record.sessionStatus,
    record.sessionStatusReason,
    JSON.stringify(record.challenge),
    record.platformSessionRef,
    record.candidateCredentialRef,
    record.resolvedPlatformAccountUid,
    record.resolvedDisplayName,
    record.resolvedAvatarUrl,
    JSON.stringify(record.resolvedProfileMetadata),
    record.logRef,
    record.expiresAt,
    record.verifiedAt,
    record.appliedAt,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapSessionRow(
  row: AccountAccessSessionRow,
): AccountAccessSessionRecord {
  return {
    sessionId: row.session_id,
    accountId: row.account_id,
    platform: row.platform,
    accessMode: row.access_mode,
    sessionStatus: row.session_status,
    sessionStatusReason: row.session_status_reason,
    challenge: parseNullableJsonObject(row.challenge_json),
    platformSessionRef: row.provider_session_ref,
    candidateCredentialRef: row.candidate_credential_ref,
    resolvedPlatformAccountUid: row.resolved_platform_account_uid,
    resolvedDisplayName: row.resolved_display_name,
    resolvedAvatarUrl: row.resolved_avatar_url,
    resolvedProfileMetadata: parseJsonObject(row.resolved_profile_metadata_json),
    logRef: row.log_ref,
    expiresAt: row.expires_at,
    verifiedAt: row.verified_at,
    appliedAt: row.applied_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseNullableJsonObject(value: string): JsonObject | null {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return null;
  }

  return { ...(parsed as JsonObject) };
}

function parseJsonObject(value: string): JsonObject {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return {};
  }

  return { ...(parsed as JsonObject) };
}
