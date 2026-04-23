import { DatabaseSync } from "node:sqlite";

import type { AccountConnectionAttemptStateStore } from "../../../ports/account-connection-attempt-state-store-port.js";
import type { AccountConnectionAttemptRecord } from "../../../modules/account-connection-attempts/types.js";
import type {
  ConnectionAttemptStatus,
  ConnectionMethod,
  JsonObject,
} from "../../../modules/accounts/types.js";

interface AccountConnectionAttemptRow {
  attempt_id: string;
  account_id: string;
  platform: string;
  connection_method: ConnectionMethod;
  attempt_status: ConnectionAttemptStatus;
  attempt_status_reason: string | null;
  challenge_json: string;
  input_token_ref: string | null;
  platform_session_ref: string | null;
  candidate_token_ref: string | null;
  resolved_platform_account_uid: string | null;
  resolved_display_name: string | null;
  resolved_avatar_url: string | null;
  resolved_profile_metadata_json: string;
  log_ref: string | null;
  expires_at: string | null;
  validated_at: string | null;
  applied_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAccountConnectionAttemptsRepository
  implements AccountConnectionAttemptStateStore
{
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createAttempt(record: AccountConnectionAttemptRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO account_connection_attempts (
            attempt_id,
            account_id,
            platform,
            connection_method,
            attempt_status,
            attempt_status_reason,
            challenge_json,
            input_token_ref,
            platform_session_ref,
            candidate_token_ref,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(...toRowValues(record));
  }

  async saveAttempt(record: AccountConnectionAttemptRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO account_connection_attempts (
            attempt_id,
            account_id,
            platform,
            connection_method,
            attempt_status,
            attempt_status_reason,
            challenge_json,
            input_token_ref,
            platform_session_ref,
            candidate_token_ref,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(attempt_id) DO UPDATE SET
            account_id = excluded.account_id,
            platform = excluded.platform,
            connection_method = excluded.connection_method,
            attempt_status = excluded.attempt_status,
            attempt_status_reason = excluded.attempt_status_reason,
            challenge_json = excluded.challenge_json,
            input_token_ref = excluded.input_token_ref,
            platform_session_ref = excluded.platform_session_ref,
            candidate_token_ref = excluded.candidate_token_ref,
            resolved_platform_account_uid = excluded.resolved_platform_account_uid,
            resolved_display_name = excluded.resolved_display_name,
            resolved_avatar_url = excluded.resolved_avatar_url,
            resolved_profile_metadata_json = excluded.resolved_profile_metadata_json,
            log_ref = excluded.log_ref,
            expires_at = excluded.expires_at,
            validated_at = excluded.validated_at,
            applied_at = excluded.applied_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(...toRowValues(record));
  }

  async getAttemptById(
    accountId: string,
    attemptId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            attempt_id,
            account_id,
            platform,
            connection_method,
            attempt_status,
            attempt_status_reason,
            challenge_json,
            input_token_ref,
            platform_session_ref,
            candidate_token_ref,
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
          FROM account_connection_attempts
          WHERE account_id = ? AND attempt_id = ?
        `,
      )
      .get(accountId, attemptId) as AccountConnectionAttemptRow | undefined;

    return row ? mapAttemptRow(row) : undefined;
  }

  async getLatestAttemptForAccount(
    accountId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            attempt_id,
            account_id,
            platform,
            connection_method,
            attempt_status,
            attempt_status_reason,
            challenge_json,
            input_token_ref,
            platform_session_ref,
            candidate_token_ref,
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
          FROM account_connection_attempts
          WHERE account_id = ?
          ORDER BY updated_at DESC, created_at DESC
          LIMIT 1
        `,
      )
      .get(accountId) as AccountConnectionAttemptRow | undefined;

    return row ? mapAttemptRow(row) : undefined;
  }

  close(): void {
    this.database.close();
  }
}

function toRowValues(
  record: AccountConnectionAttemptRecord,
): Array<string | null> {
  return [
    record.attemptId,
    record.accountId,
    record.platform,
    record.connectionMethod,
    record.attemptStatus,
    record.attemptStatusReason,
    JSON.stringify(record.challenge),
    record.inputTokenRef,
    record.platformSessionRef,
    record.candidateTokenRef,
    record.resolvedPlatformAccountUid,
    record.resolvedDisplayName,
    record.resolvedAvatarUrl,
    JSON.stringify(record.resolvedProfileMetadata),
    record.logRef,
    record.expiresAt,
    record.validatedAt,
    record.appliedAt,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapAttemptRow(
  row: AccountConnectionAttemptRow,
): AccountConnectionAttemptRecord {
  return {
    attemptId: row.attempt_id,
    accountId: row.account_id,
    platform: row.platform,
    connectionMethod: row.connection_method,
    attemptStatus: row.attempt_status,
    attemptStatusReason: row.attempt_status_reason,
    challenge: parseNullableJsonObject(row.challenge_json),
    inputTokenRef: row.input_token_ref,
    platformSessionRef: row.platform_session_ref,
    candidateTokenRef: row.candidate_token_ref,
    resolvedPlatformAccountUid: row.resolved_platform_account_uid,
    resolvedDisplayName: row.resolved_display_name,
    resolvedAvatarUrl: row.resolved_avatar_url,
    resolvedProfileMetadata: parseJsonObject(row.resolved_profile_metadata_json),
    logRef: row.log_ref,
    expiresAt: row.expires_at,
    validatedAt: row.validated_at,
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
