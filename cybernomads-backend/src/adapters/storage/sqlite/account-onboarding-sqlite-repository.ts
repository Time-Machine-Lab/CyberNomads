import { DatabaseSync } from "node:sqlite";

import type { AccountOnboardingStateStore } from "../../../ports/account-onboarding-state-store-port.js";
import type { JsonObject } from "../../../modules/accounts/types.js";
import type {
  AccountOnboardingFinalDisposition,
  AccountOnboardingSessionRecord,
  AccountOnboardingSessionStatus,
} from "../../../modules/account-onboarding/types.js";

interface AccountOnboardingSessionRow {
  session_id: string;
  platform: string;
  authorization_method: string;
  expected_credential_type: string | null;
  input_payload_ref: string | null;
  platform_session_payload_ref: string | null;
  challenge_json: string;
  session_status: AccountOnboardingSessionStatus;
  session_status_reason: string | null;
  resolved_platform_account_uid: string | null;
  resolved_display_name: string | null;
  resolved_profile_json: string;
  candidate_credential_type: string | null;
  candidate_credential_ref: string | null;
  final_disposition: AccountOnboardingFinalDisposition | null;
  target_account_id: string | null;
  expires_at: string | null;
  consumed_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAccountOnboardingRepository
  implements AccountOnboardingStateStore
{
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createSession(record: AccountOnboardingSessionRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO account_onboarding_sessions (
            session_id,
            platform,
            authorization_method,
            expected_credential_type,
            input_payload_ref,
            platform_session_payload_ref,
            challenge_json,
            session_status,
            session_status_reason,
            resolved_platform_account_uid,
            resolved_display_name,
            resolved_profile_json,
            candidate_credential_type,
            candidate_credential_ref,
            final_disposition,
            target_account_id,
            expires_at,
            consumed_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(...toRowValues(record));
  }

  async saveSession(record: AccountOnboardingSessionRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO account_onboarding_sessions (
            session_id,
            platform,
            authorization_method,
            expected_credential_type,
            input_payload_ref,
            platform_session_payload_ref,
            challenge_json,
            session_status,
            session_status_reason,
            resolved_platform_account_uid,
            resolved_display_name,
            resolved_profile_json,
            candidate_credential_type,
            candidate_credential_ref,
            final_disposition,
            target_account_id,
            expires_at,
            consumed_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(session_id) DO UPDATE SET
            platform = excluded.platform,
            authorization_method = excluded.authorization_method,
            expected_credential_type = excluded.expected_credential_type,
            input_payload_ref = excluded.input_payload_ref,
            platform_session_payload_ref = excluded.platform_session_payload_ref,
            challenge_json = excluded.challenge_json,
            session_status = excluded.session_status,
            session_status_reason = excluded.session_status_reason,
            resolved_platform_account_uid = excluded.resolved_platform_account_uid,
            resolved_display_name = excluded.resolved_display_name,
            resolved_profile_json = excluded.resolved_profile_json,
            candidate_credential_type = excluded.candidate_credential_type,
            candidate_credential_ref = excluded.candidate_credential_ref,
            final_disposition = excluded.final_disposition,
            target_account_id = excluded.target_account_id,
            expires_at = excluded.expires_at,
            consumed_at = excluded.consumed_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(...toRowValues(record));
  }

  async getSessionById(
    sessionId: string,
  ): Promise<AccountOnboardingSessionRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            session_id,
            platform,
            authorization_method,
            expected_credential_type,
            input_payload_ref,
            platform_session_payload_ref,
            challenge_json,
            session_status,
            session_status_reason,
            resolved_platform_account_uid,
            resolved_display_name,
            resolved_profile_json,
            candidate_credential_type,
            candidate_credential_ref,
            final_disposition,
            target_account_id,
            expires_at,
            consumed_at,
            created_at,
            updated_at
          FROM account_onboarding_sessions
          WHERE session_id = ?
        `,
      )
      .get(sessionId) as AccountOnboardingSessionRow | undefined;

    return row ? mapSessionRow(row) : undefined;
  }

  close(): void {
    this.database.close();
  }
}

function toRowValues(record: AccountOnboardingSessionRecord): Array<string | null> {
  return [
    record.sessionId,
    record.platform,
    record.authorizationMethod,
    record.expectedCredentialType,
    record.inputPayloadRef,
    record.platformSessionPayloadRef,
    JSON.stringify(record.challenge),
    record.sessionStatus,
    record.sessionStatusReason,
    record.resolvedPlatformAccountUid,
    record.resolvedDisplayName,
    JSON.stringify(record.resolvedProfile),
    record.candidateCredentialType,
    record.candidateCredentialRef,
    record.finalDisposition,
    record.targetAccountId,
    record.expiresAt,
    record.consumedAt,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapSessionRow(
  row: AccountOnboardingSessionRow,
): AccountOnboardingSessionRecord {
  return {
    sessionId: row.session_id,
    platform: row.platform,
    authorizationMethod: row.authorization_method,
    expectedCredentialType: row.expected_credential_type,
    inputPayloadRef: row.input_payload_ref,
    platformSessionPayloadRef: row.platform_session_payload_ref,
    challenge: parseNullableJsonObject(row.challenge_json),
    sessionStatus: row.session_status,
    sessionStatusReason: row.session_status_reason,
    resolvedPlatformAccountUid: row.resolved_platform_account_uid,
    resolvedDisplayName: row.resolved_display_name,
    resolvedProfile: parseJsonObject(row.resolved_profile_json),
    candidateCredentialType: row.candidate_credential_type,
    candidateCredentialRef: row.candidate_credential_ref,
    finalDisposition: row.final_disposition,
    targetAccountId: row.target_account_id,
    expiresAt: row.expires_at,
    consumedAt: row.consumed_at,
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
