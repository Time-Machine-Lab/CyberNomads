import { randomUUID } from "node:crypto";

import type { AccountAccessSessionStateStore } from "../../ports/account-access-session-state-store-port.js";
import type { AccountPlatformPort } from "../../ports/account-platform-port.js";
import type { AccountSecretStore } from "../../ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../ports/account-state-store-port.js";
import {
  AccountNotFoundError,
  AccountOperationConflictError,
  AccountPlatformUnavailableError,
  AccountValidationError,
} from "./errors.js";
import {
  deriveResolvableReason,
  isAccountResolvable,
  toAccountDetail,
  toAccountSummary,
} from "./model.js";
import { isAccessSessionStatusTerminal } from "../account-access-sessions/model.js";
import type { AccountAccessSessionRecord } from "../account-access-sessions/types.js";
import type {
  AccountDetail,
  AccountRecord,
  CreateAccountInput,
  JsonObject,
  ListAccountsFilters,
  ListAccountsResult,
  StoredCredentialSecret,
  UpdateAccountInput,
} from "./types.js";

export interface AccountServiceOptions {
  stateStore: AccountStateStore;
  secretStore: AccountSecretStore;
  accessSessionStateStore?: AccountAccessSessionStateStore;
  platforms?: Iterable<AccountPlatformPort>;
  now?: () => Date;
  createAccountId?: () => string;
}

export class AccountService {
  private readonly platforms = new Map<string, AccountPlatformPort>();
  private readonly now: () => Date;
  private readonly createAccountId: () => string;

  constructor(private readonly options: AccountServiceOptions) {
    for (const platform of options.platforms ?? []) {
      this.platforms.set(platform.platformCode, platform);
    }

    this.now = options.now ?? (() => new Date());
    this.createAccountId = options.createAccountId ?? (() => randomUUID());
  }

  async createAccount(input: CreateAccountInput): Promise<AccountDetail> {
    const normalizedInput = normalizeCreateAccountInput(input);
    this.ensurePlatformAvailable(normalizedInput.platform);
    const timestamp = this.now().toISOString();
    const record: AccountRecord = {
      accountId: this.createAccountId(),
      platform: normalizedInput.platform,
      internalDisplayName: normalizedInput.internalDisplayName,
      remark: normalizedInput.remark,
      tags: normalizedInput.tags,
      platformMetadata: normalizedInput.platformMetadata,
      lifecycleStatus: "active",
      connectionStatus: "not_logged_in",
      connectionStatusReason: null,
      availabilityStatus: "unknown",
      availabilityStatusReason: null,
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedAvatarUrl: null,
      resolvedProfileMetadata: {},
      activeCredentialRef: null,
      activeCredentialExpiresAt: null,
      activeCredentialUpdatedAt: null,
      lastConnectedAt: null,
      lastVerifiedAt: null,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.options.stateStore.createAccount(record);

    return toAccountDetail(record, null);
  }

  async listAccounts(filters: ListAccountsFilters = {}): Promise<ListAccountsResult> {
    const normalizedFilters = normalizeListAccountsFilters(filters);
    const records = await this.options.stateStore.listAccounts(normalizedFilters);

    return {
      items: records.map(toAccountSummary),
    };
  }

  async getAccountDetail(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);
    const latestSession =
      await this.options.accessSessionStateStore?.getLatestSessionForAccount(
        record.accountId,
      );

    return toAccountDetail(record, latestSession ?? null);
  }

  async updateAccount(
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus === "deleted") {
      throw new AccountOperationConflictError(
        "Deleted accounts cannot be updated.",
      );
    }

    const normalizedInput = normalizeUpdateAccountInput(input);
    const updatedRecord: AccountRecord = {
      ...record,
      internalDisplayName: normalizedInput.internalDisplayName,
      remark: normalizedInput.remark,
      tags: normalizedInput.tags,
      platformMetadata: normalizedInput.platformMetadata,
      updatedAt: this.now().toISOString(),
    };

    await this.options.stateStore.saveAccount(updatedRecord);

    return this.withLatestAccessSession(updatedRecord);
  }

  async softDeleteAccount(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus === "deleted") {
      return this.withLatestAccessSession(record);
    }

    const deletedAt = this.now().toISOString();
    const deletedRecord: AccountRecord = {
      ...record,
      lifecycleStatus: "deleted",
      deletedAt,
      updatedAt: deletedAt,
    };

    await this.options.stateStore.saveAccount(deletedRecord);

    return this.withLatestAccessSession(deletedRecord);
  }

  async restoreAccount(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus !== "deleted") {
      throw new AccountOperationConflictError(
        "Only deleted accounts can be restored.",
      );
    }

    const restoredRecord: AccountRecord = {
      ...record,
      lifecycleStatus: "active",
      deletedAt: null,
      updatedAt: this.now().toISOString(),
    };

    await this.options.stateStore.saveAccount(restoredRecord);

    return this.withLatestAccessSession(restoredRecord);
  }

  async resolveActiveCredential(accountId: string): Promise<StoredCredentialSecret> {
    const record = await this.getAccountRecord(accountId);

    if (!isAccountResolvable(record)) {
      throw new AccountOperationConflictError(
        deriveResolvableReason(record) ?? "Current credential is not resolvable.",
      );
    }

    const activeCredential = await this.readActiveCredential(record);

    if (!activeCredential) {
      throw new AccountOperationConflictError(
        "Current credential is not available.",
      );
    }

    return activeCredential;
  }

  close(): void {
    this.options.stateStore.close();
  }

  private async getAccountRecord(accountId: string): Promise<AccountRecord> {
    const normalizedAccountId = ensureNonEmptyString(
      accountId,
      "Account ID is required.",
    );
    const record = await this.options.stateStore.getAccountById(normalizedAccountId);

    if (!record) {
      throw new AccountNotFoundError(normalizedAccountId);
    }

    const refreshed = await this.refreshAccountRuntimeState(record);
    return refreshed;
  }

  private async refreshAccountRuntimeState(
    record: AccountRecord,
  ): Promise<AccountRecord> {
    const nowIso = this.now().toISOString();
    let nextRecord = record;

    if (nextRecord.connectionStatus === "connecting") {
      const latestSession =
        await this.options.accessSessionStateStore?.getLatestSessionForAccount(
          nextRecord.accountId,
        );
      const refreshedLatestSession = latestSession
        ? await this.refreshLatestAccessSessionSnapshot(latestSession, nowIso)
        : null;

      if (
        refreshedLatestSession === null ||
        refreshedLatestSession.sessionStatus === "expired" ||
        refreshedLatestSession.sessionStatus === "canceled" ||
        refreshedLatestSession.sessionStatus === "verified"
      ) {
        nextRecord = fallbackConnectingAccountState(
          nextRecord,
          refreshedLatestSession?.sessionStatus ?? null,
          nowIso,
        );
      }
    }

    if (
      nextRecord.connectionStatus === "connected" &&
      nextRecord.activeCredentialRef === null
    ) {
      nextRecord = {
        ...nextRecord,
        connectionStatus: "not_logged_in",
        connectionStatusReason: "No active credential is currently applied.",
        updatedAt: nowIso,
      };
    }

    if (
      nextRecord.connectionStatus === "connected" &&
      nextRecord.activeCredentialExpiresAt !== null &&
      nextRecord.activeCredentialExpiresAt <= nowIso
    ) {
      nextRecord = {
        ...nextRecord,
        connectionStatus: "expired",
        connectionStatusReason: "Current credential expired.",
        updatedAt: nowIso,
      };
    }

    if (nextRecord !== record) {
      await this.options.stateStore.saveAccount(nextRecord);
    }

    return nextRecord;
  }

  private async refreshLatestAccessSessionSnapshot(
    record: AccountAccessSessionRecord,
    nowIso: string,
  ): Promise<AccountAccessSessionRecord> {
    if (isAccessSessionStatusTerminal(record.sessionStatus) || record.expiresAt === null) {
      return record;
    }

    if (record.expiresAt > nowIso) {
      return record;
    }

    const expiredRecord: AccountAccessSessionRecord = {
      ...record,
      sessionStatus: "expired",
      sessionStatusReason: "Access session expired.",
      updatedAt: nowIso,
    };

    await this.options.accessSessionStateStore?.saveSession(expiredRecord);
    return expiredRecord;
  }

  private async withLatestAccessSession(record: AccountRecord): Promise<AccountDetail> {
    const latestSession =
      await this.options.accessSessionStateStore?.getLatestSessionForAccount(
        record.accountId,
      );

    return toAccountDetail(record, latestSession ?? null);
  }

  private async readActiveCredential(
    record: AccountRecord,
  ): Promise<StoredCredentialSecret | null> {
    if (!record.activeCredentialRef) {
      return null;
    }

    return this.options.secretStore.readSecret<StoredCredentialSecret>(
      record.activeCredentialRef,
    );
  }

  private ensurePlatformAvailable(platformCode: string): void {
    this.getPlatform(platformCode);
  }

  private getPlatform(platformCode: string): AccountPlatformPort {
    const platform = this.platforms.get(platformCode);

    if (!platform) {
      throw new AccountPlatformUnavailableError(
        `Platform "${platformCode}" is not available.`,
      );
    }

    return platform;
  }
}

function normalizeCreateAccountInput(input: CreateAccountInput): Required<CreateAccountInput> {
  return {
    platform: normalizeRequiredCode(input.platform, "Platform is required."),
    internalDisplayName: normalizeRequiredText(
      input.internalDisplayName,
      "Internal display name is required.",
    ),
    remark: normalizeOptionalText(input.remark),
    tags: normalizeTags(input.tags ?? []),
    platformMetadata: normalizeJsonObject(
      input.platformMetadata ?? {},
      "platformMetadata",
    ),
  };
}

function normalizeUpdateAccountInput(input: UpdateAccountInput): UpdateAccountInput {
  return {
    internalDisplayName: normalizeRequiredText(
      input.internalDisplayName,
      "Internal display name is required.",
    ),
    remark: normalizeOptionalText(input.remark),
    tags: normalizeTags(input.tags),
    platformMetadata: normalizeJsonObject(
      input.platformMetadata,
      "platformMetadata",
    ),
  };
}

function normalizeListAccountsFilters(
  filters: ListAccountsFilters,
): ListAccountsFilters {
  return {
    platform: filters.platform ? normalizeRequiredCode(filters.platform, "Platform is required.") : undefined,
    keyword: normalizeOptionalText(filters.keyword) ?? undefined,
    lifecycleStatus: filters.lifecycleStatus,
    connectionStatus: filters.connectionStatus,
    availabilityStatus: filters.availabilityStatus,
    includeDeleted: filters.includeDeleted ?? false,
    onlyConnected: filters.onlyConnected ?? false,
  };
}

function normalizeRequiredCode(value: string, message: string): string {
  const normalized = normalizeRequiredText(value, message).toLowerCase();

  if (!/^[a-z0-9_-]+$/u.test(normalized)) {
    throw new AccountValidationError(
      "Platform codes may only contain lowercase letters, numbers, underscores, and hyphens.",
    );
  }

  return normalized;
}

function normalizeRequiredText(value: string, message: string): string {
  if (typeof value !== "string") {
    throw new AccountValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new AccountValidationError(message);
  }

  return normalized;
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AccountValidationError("Expected a text value.");
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTags(tags: string[]): string[] {
  if (!Array.isArray(tags)) {
    throw new AccountValidationError("Tags must be an array of strings.");
  }

  const normalized = tags
    .map((tag) => normalizeRequiredText(tag, "Tags must not be empty."))
    .filter((tag, index, values) => values.indexOf(tag) === index);

  return normalized;
}

function normalizeJsonObject(value: unknown, fieldName: string): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new AccountValidationError(`${fieldName} must be a JSON object.`);
  }

  return { ...(value as JsonObject) };
}

function ensureNonEmptyString(value: string | undefined, message: string): string {
  if (typeof value !== "string") {
    throw new AccountValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new AccountValidationError(message);
  }

  return normalized;
}

function fallbackConnectingAccountState(
  record: AccountRecord,
  latestSessionStatus: AccountAccessSessionRecord["sessionStatus"] | null,
  nowIso: string,
): AccountRecord {
  if (record.activeCredentialRef !== null) {
    return {
      ...record,
      connectionStatus: "connected",
      connectionStatusReason: "Current credential remains active.",
      updatedAt: nowIso,
    };
  }

  const reason =
    latestSessionStatus === "expired"
      ? "QR access session expired. Refresh the QR code to try again."
      : latestSessionStatus === "canceled"
        ? "Access session was canceled. Start a new one to continue."
        : "No active access session is currently in progress.";

  return {
    ...record,
    connectionStatus: "not_logged_in",
    connectionStatusReason: reason,
    updatedAt: nowIso,
  };
}
