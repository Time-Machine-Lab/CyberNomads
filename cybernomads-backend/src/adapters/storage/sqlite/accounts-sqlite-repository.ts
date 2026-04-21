import { DatabaseSync } from "node:sqlite";

import type { AccountStateStore } from "../../../ports/account-state-store-port.js";
import type {
  AuthorizationAttemptStatus,
  AuthorizationStatus,
  AvailabilityStatus,
  JsonObject,
  LifecycleStatus,
  ListAccountsFilters,
  PlatformAccountRecord,
} from "../../../modules/accounts/types.js";

interface PlatformAccountRow {
  account_id: string;
  platform: string;
  platform_account_uid: string;
  display_name: string;
  remark: string | null;
  tags_json: string;
  platform_metadata_json: string;
  lifecycle_status: LifecycleStatus;
  authorization_status: AuthorizationStatus;
  authorization_status_reason: string | null;
  availability_status: AvailabilityStatus;
  availability_status_reason: string | null;
  active_credential_type: string | null;
  active_credential_ref: string | null;
  active_credential_expires_at: string | null;
  active_credential_updated_at: string | null;
  authorization_attempt_id: string | null;
  authorization_attempt_method: string | null;
  authorization_attempt_expected_credential_type: string | null;
  authorization_attempt_payload_ref: string | null;
  authorization_attempt_status: AuthorizationAttemptStatus | null;
  authorization_attempt_status_reason: string | null;
  authorization_attempt_expires_at: string | null;
  authorization_attempt_created_at: string | null;
  authorization_attempt_updated_at: string | null;
  last_authorized_at: string | null;
  last_availability_checked_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAccountsRepository implements AccountStateStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createAccount(record: PlatformAccountRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO platform_accounts (
            account_id,
            platform,
            platform_account_uid,
            display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            authorization_status,
            authorization_status_reason,
            availability_status,
            availability_status_reason,
            active_credential_type,
            active_credential_ref,
            active_credential_expires_at,
            active_credential_updated_at,
            authorization_attempt_id,
            authorization_attempt_method,
            authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref,
            authorization_attempt_status,
            authorization_attempt_status_reason,
            authorization_attempt_expires_at,
            authorization_attempt_created_at,
            authorization_attempt_updated_at,
            last_authorized_at,
            last_availability_checked_at,
            deleted_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(...toRowValues(record));
  }

  async saveAccount(record: PlatformAccountRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO platform_accounts (
            account_id,
            platform,
            platform_account_uid,
            display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            authorization_status,
            authorization_status_reason,
            availability_status,
            availability_status_reason,
            active_credential_type,
            active_credential_ref,
            active_credential_expires_at,
            active_credential_updated_at,
            authorization_attempt_id,
            authorization_attempt_method,
            authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref,
            authorization_attempt_status,
            authorization_attempt_status_reason,
            authorization_attempt_expires_at,
            authorization_attempt_created_at,
            authorization_attempt_updated_at,
            last_authorized_at,
            last_availability_checked_at,
            deleted_at,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            platform = excluded.platform,
            platform_account_uid = excluded.platform_account_uid,
            display_name = excluded.display_name,
            remark = excluded.remark,
            tags_json = excluded.tags_json,
            platform_metadata_json = excluded.platform_metadata_json,
            lifecycle_status = excluded.lifecycle_status,
            authorization_status = excluded.authorization_status,
            authorization_status_reason = excluded.authorization_status_reason,
            availability_status = excluded.availability_status,
            availability_status_reason = excluded.availability_status_reason,
            active_credential_type = excluded.active_credential_type,
            active_credential_ref = excluded.active_credential_ref,
            active_credential_expires_at = excluded.active_credential_expires_at,
            active_credential_updated_at = excluded.active_credential_updated_at,
            authorization_attempt_id = excluded.authorization_attempt_id,
            authorization_attempt_method = excluded.authorization_attempt_method,
            authorization_attempt_expected_credential_type = excluded.authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref = excluded.authorization_attempt_payload_ref,
            authorization_attempt_status = excluded.authorization_attempt_status,
            authorization_attempt_status_reason = excluded.authorization_attempt_status_reason,
            authorization_attempt_expires_at = excluded.authorization_attempt_expires_at,
            authorization_attempt_created_at = excluded.authorization_attempt_created_at,
            authorization_attempt_updated_at = excluded.authorization_attempt_updated_at,
            last_authorized_at = excluded.last_authorized_at,
            last_availability_checked_at = excluded.last_availability_checked_at,
            deleted_at = excluded.deleted_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(...toRowValues(record));
  }

  async getAccountById(
    accountId: string,
  ): Promise<PlatformAccountRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            account_id,
            platform,
            platform_account_uid,
            display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            authorization_status,
            authorization_status_reason,
            availability_status,
            availability_status_reason,
            active_credential_type,
            active_credential_ref,
            active_credential_expires_at,
            active_credential_updated_at,
            authorization_attempt_id,
            authorization_attempt_method,
            authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref,
            authorization_attempt_status,
            authorization_attempt_status_reason,
            authorization_attempt_expires_at,
            authorization_attempt_created_at,
            authorization_attempt_updated_at,
            last_authorized_at,
            last_availability_checked_at,
            deleted_at,
            created_at,
            updated_at
          FROM platform_accounts
          WHERE account_id = ?
        `,
      )
      .get(accountId) as PlatformAccountRow | undefined;

    return row ? mapPlatformAccountRow(row) : undefined;
  }

  async getAccountByPlatformIdentity(
    platform: string,
    platformAccountUid: string,
  ): Promise<PlatformAccountRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            account_id,
            platform,
            platform_account_uid,
            display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            authorization_status,
            authorization_status_reason,
            availability_status,
            availability_status_reason,
            active_credential_type,
            active_credential_ref,
            active_credential_expires_at,
            active_credential_updated_at,
            authorization_attempt_id,
            authorization_attempt_method,
            authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref,
            authorization_attempt_status,
            authorization_attempt_status_reason,
            authorization_attempt_expires_at,
            authorization_attempt_created_at,
            authorization_attempt_updated_at,
            last_authorized_at,
            last_availability_checked_at,
            deleted_at,
            created_at,
            updated_at
          FROM platform_accounts
          WHERE platform = ? AND platform_account_uid = ?
        `,
      )
      .get(platform, platformAccountUid) as PlatformAccountRow | undefined;

    return row ? mapPlatformAccountRow(row) : undefined;
  }

  async listAccounts(filters: ListAccountsFilters): Promise<PlatformAccountRecord[]> {
    const conditions: string[] = [];
    const parameters: Array<string | number> = [];

    if (filters.platform) {
      conditions.push("platform = ?");
      parameters.push(filters.platform);
    }

    if (filters.keyword) {
      conditions.push(
        `
          (
            LOWER(display_name) LIKE ?
            OR LOWER(COALESCE(remark, '')) LIKE ?
            OR LOWER(platform_account_uid) LIKE ?
          )
        `,
      );
      const keyword = `%${filters.keyword.toLowerCase()}%`;
      parameters.push(keyword, keyword, keyword);
    }

    if (filters.lifecycleStatus) {
      conditions.push("lifecycle_status = ?");
      parameters.push(filters.lifecycleStatus);
    } else if (!filters.includeDeleted) {
      conditions.push("lifecycle_status != 'deleted'");
    }

    if (filters.authorizationStatus) {
      conditions.push("authorization_status = ?");
      parameters.push(filters.authorizationStatus);
    }

    if (filters.availabilityStatus) {
      conditions.push("availability_status = ?");
      parameters.push(filters.availabilityStatus);
    }

    if (filters.onlyConsumable) {
      conditions.push(
        `
          lifecycle_status = 'active'
          AND authorization_status = 'authorized'
          AND availability_status = 'healthy'
          AND active_credential_ref IS NOT NULL
        `,
      );
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";

    const rows = this.database
      .prepare(
        `
          SELECT
            account_id,
            platform,
            platform_account_uid,
            display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            authorization_status,
            authorization_status_reason,
            availability_status,
            availability_status_reason,
            active_credential_type,
            active_credential_ref,
            active_credential_expires_at,
            active_credential_updated_at,
            authorization_attempt_id,
            authorization_attempt_method,
            authorization_attempt_expected_credential_type,
            authorization_attempt_payload_ref,
            authorization_attempt_status,
            authorization_attempt_status_reason,
            authorization_attempt_expires_at,
            authorization_attempt_created_at,
            authorization_attempt_updated_at,
            last_authorized_at,
            last_availability_checked_at,
            deleted_at,
            created_at,
            updated_at
          FROM platform_accounts
          ${whereClause}
          ORDER BY updated_at DESC, account_id DESC
        `,
      )
      .all(...parameters) as unknown as PlatformAccountRow[];

    return rows.map(mapPlatformAccountRow);
  }

  close(): void {
    this.database.close();
  }
}

function toRowValues(record: PlatformAccountRecord): Array<string | null> {
  return [
    record.accountId,
    record.platform,
    record.platformAccountUid,
    record.displayName,
    record.remark,
    JSON.stringify(record.tags),
    JSON.stringify(record.platformMetadata),
    record.lifecycleStatus,
    record.authorizationStatus,
    record.authorizationStatusReason,
    record.availabilityStatus,
    record.availabilityStatusReason,
    record.activeCredentialType,
    record.activeCredentialRef,
    record.activeCredentialExpiresAt,
    record.activeCredentialUpdatedAt,
    record.authorizationAttemptId,
    record.authorizationAttemptMethod,
    record.authorizationAttemptExpectedCredentialType,
    record.authorizationAttemptPayloadRef,
    record.authorizationAttemptStatus,
    record.authorizationAttemptStatusReason,
    record.authorizationAttemptExpiresAt,
    record.authorizationAttemptCreatedAt,
    record.authorizationAttemptUpdatedAt,
    record.lastAuthorizedAt,
    record.lastAvailabilityCheckedAt,
    record.deletedAt,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapPlatformAccountRow(row: PlatformAccountRow): PlatformAccountRecord {
  return {
    accountId: row.account_id,
    platform: row.platform,
    platformAccountUid: row.platform_account_uid,
    displayName: row.display_name,
    remark: row.remark,
    tags: parseJsonArray(row.tags_json),
    platformMetadata: parseJsonObject(row.platform_metadata_json),
    lifecycleStatus: row.lifecycle_status,
    authorizationStatus: row.authorization_status,
    authorizationStatusReason: row.authorization_status_reason,
    availabilityStatus: row.availability_status,
    availabilityStatusReason: row.availability_status_reason,
    activeCredentialType: row.active_credential_type,
    activeCredentialRef: row.active_credential_ref,
    activeCredentialExpiresAt: row.active_credential_expires_at,
    activeCredentialUpdatedAt: row.active_credential_updated_at,
    authorizationAttemptId: row.authorization_attempt_id,
    authorizationAttemptMethod: row.authorization_attempt_method,
    authorizationAttemptExpectedCredentialType:
      row.authorization_attempt_expected_credential_type,
    authorizationAttemptPayloadRef: row.authorization_attempt_payload_ref,
    authorizationAttemptStatus: row.authorization_attempt_status,
    authorizationAttemptStatusReason: row.authorization_attempt_status_reason,
    authorizationAttemptExpiresAt: row.authorization_attempt_expires_at,
    authorizationAttemptCreatedAt: row.authorization_attempt_created_at,
    authorizationAttemptUpdatedAt: row.authorization_attempt_updated_at,
    lastAuthorizedAt: row.last_authorized_at,
    lastAvailabilityCheckedAt: row.last_availability_checked_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseJsonArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;

  if (!Array.isArray(parsed)) {
    return [];
  }

  return parsed.filter((item): item is string => typeof item === "string");
}

function parseJsonObject(value: string): JsonObject {
  const parsed = JSON.parse(value) as unknown;

  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return {};
  }

  return { ...(parsed as JsonObject) };
}
