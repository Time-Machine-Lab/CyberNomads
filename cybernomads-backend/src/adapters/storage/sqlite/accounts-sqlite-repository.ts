import { DatabaseSync } from "node:sqlite";

import type { AccountStateStore } from "../../../ports/account-state-store-port.js";
import type {
  AccountRecord,
  AvailabilityStatus,
  JsonObject,
  LifecycleStatus,
  ListAccountsFilters,
  LoginStatus,
} from "../../../modules/accounts/types.js";

interface AccountRow {
  account_id: string;
  platform: string;
  internal_display_name: string;
  remark: string | null;
  tags_json: string;
  platform_metadata_json: string;
  lifecycle_status: LifecycleStatus;
  login_status: LoginStatus;
  login_status_reason: string | null;
  availability_status: AvailabilityStatus;
  availability_status_reason: string | null;
  resolved_platform_account_uid: string | null;
  resolved_display_name: string | null;
  resolved_avatar_url: string | null;
  resolved_profile_metadata_json: string;
  active_token_ref: string | null;
  active_token_expires_at: string | null;
  active_token_updated_at: string | null;
  last_connected_at: string | null;
  last_validated_at: string | null;
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

  async createAccount(record: AccountRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO accounts (
            account_id,
            platform,
            internal_display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            login_status,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(...toRowValues(record));
  }

  async saveAccount(record: AccountRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO accounts (
            account_id,
            platform,
            internal_display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            login_status,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(account_id) DO UPDATE SET
            platform = excluded.platform,
            internal_display_name = excluded.internal_display_name,
            remark = excluded.remark,
            tags_json = excluded.tags_json,
            platform_metadata_json = excluded.platform_metadata_json,
            lifecycle_status = excluded.lifecycle_status,
            login_status = excluded.login_status,
            login_status_reason = excluded.login_status_reason,
            availability_status = excluded.availability_status,
            availability_status_reason = excluded.availability_status_reason,
            resolved_platform_account_uid = excluded.resolved_platform_account_uid,
            resolved_display_name = excluded.resolved_display_name,
            resolved_avatar_url = excluded.resolved_avatar_url,
            resolved_profile_metadata_json = excluded.resolved_profile_metadata_json,
            active_token_ref = excluded.active_token_ref,
            active_token_expires_at = excluded.active_token_expires_at,
            active_token_updated_at = excluded.active_token_updated_at,
            last_connected_at = excluded.last_connected_at,
            last_validated_at = excluded.last_validated_at,
            deleted_at = excluded.deleted_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(...toRowValues(record));
  }

  async getAccountById(accountId: string): Promise<AccountRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            account_id,
            platform,
            internal_display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            login_status,
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
          FROM accounts
          WHERE account_id = ?
        `,
      )
      .get(accountId) as AccountRow | undefined;

    return row ? mapAccountRow(row) : undefined;
  }

  async listAccounts(filters: ListAccountsFilters): Promise<AccountRecord[]> {
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (filters.platform) {
      conditions.push("platform = ?");
      parameters.push(filters.platform);
    }

    if (filters.keyword) {
      conditions.push(
        `
          (
            LOWER(internal_display_name) LIKE ?
            OR LOWER(COALESCE(remark, '')) LIKE ?
            OR LOWER(tags_json) LIKE ?
            OR LOWER(COALESCE(resolved_platform_account_uid, '')) LIKE ?
            OR LOWER(COALESCE(resolved_display_name, '')) LIKE ?
          )
        `,
      );
      const keyword = `%${filters.keyword.toLowerCase()}%`;
      parameters.push(keyword, keyword, keyword, keyword, keyword);
    }

    if (filters.lifecycleStatus) {
      conditions.push("lifecycle_status = ?");
      parameters.push(filters.lifecycleStatus);
    } else if (!filters.includeDeleted) {
      conditions.push("lifecycle_status != 'deleted'");
    }

    if (filters.loginStatus) {
      conditions.push("login_status = ?");
      parameters.push(filters.loginStatus);
    }

    if (filters.availabilityStatus) {
      conditions.push("availability_status = ?");
      parameters.push(filters.availabilityStatus);
    }

    if (filters.onlyConsumable) {
      conditions.push(
        `
          lifecycle_status = 'active'
          AND login_status = 'connected'
          AND availability_status = 'healthy'
          AND active_token_ref IS NOT NULL
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
            internal_display_name,
            remark,
            tags_json,
            platform_metadata_json,
            lifecycle_status,
            login_status,
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
          FROM accounts
          ${whereClause}
          ORDER BY updated_at DESC, created_at DESC
        `,
      )
      .all(...parameters) as unknown as AccountRow[];

    return rows.map(mapAccountRow);
  }

  close(): void {
    this.database.close();
  }
}

function toRowValues(record: AccountRecord): Array<string | null> {
  return [
    record.accountId,
    record.platform,
    record.internalDisplayName,
    record.remark,
    JSON.stringify(record.tags),
    JSON.stringify(record.platformMetadata),
    record.lifecycleStatus,
    record.loginStatus,
    record.loginStatusReason,
    record.availabilityStatus,
    record.availabilityStatusReason,
    record.resolvedPlatformAccountUid,
    record.resolvedDisplayName,
    record.resolvedAvatarUrl,
    JSON.stringify(record.resolvedProfileMetadata),
    record.activeTokenRef,
    record.activeTokenExpiresAt,
    record.activeTokenUpdatedAt,
    record.lastConnectedAt,
    record.lastValidatedAt,
    record.deletedAt,
    record.createdAt,
    record.updatedAt,
  ];
}

function mapAccountRow(row: AccountRow): AccountRecord {
  return {
    accountId: row.account_id,
    platform: row.platform,
    internalDisplayName: row.internal_display_name,
    remark: row.remark,
    tags: parseStringArray(row.tags_json),
    platformMetadata: parseJsonObject(row.platform_metadata_json),
    lifecycleStatus: row.lifecycle_status,
    loginStatus: row.login_status,
    loginStatusReason: row.login_status_reason,
    availabilityStatus: row.availability_status,
    availabilityStatusReason: row.availability_status_reason,
    resolvedPlatformAccountUid: row.resolved_platform_account_uid,
    resolvedDisplayName: row.resolved_display_name,
    resolvedAvatarUrl: row.resolved_avatar_url,
    resolvedProfileMetadata: parseJsonObject(row.resolved_profile_metadata_json),
    activeTokenRef: row.active_token_ref,
    activeTokenExpiresAt: row.active_token_expires_at,
    activeTokenUpdatedAt: row.active_token_updated_at,
    lastConnectedAt: row.last_connected_at,
    lastValidatedAt: row.last_validated_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseStringArray(value: string): string[] {
  const parsed = JSON.parse(value) as unknown;
  return Array.isArray(parsed)
    ? parsed.filter((item): item is string => typeof item === "string")
    : [];
}

function parseJsonObject(value: string): JsonObject {
  const parsed = JSON.parse(value) as unknown;
  if (!parsed || Array.isArray(parsed) || typeof parsed !== "object") {
    return {};
  }

  return { ...(parsed as JsonObject) };
}
