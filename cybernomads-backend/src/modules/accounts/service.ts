import { randomUUID } from "node:crypto";

import type { AccountConnectionAttemptStateStore } from "../../ports/account-connection-attempt-state-store-port.js";
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
  deriveConsumabilityReason,
  isAccountConsumable,
  toAccountDetail,
  toAccountSummary,
} from "./model.js";
import type {
  AccountDetail,
  AccountRecord,
  AvailabilityCheckResult,
  CreateAccountInput,
  JsonObject,
  ListAccountsFilters,
  ListAccountsResult,
  StoredTokenSecret,
  UpdateAccountInput,
} from "./types.js";

export interface AccountServiceOptions {
  stateStore: AccountStateStore;
  secretStore: AccountSecretStore;
  connectionAttemptStateStore?: AccountConnectionAttemptStateStore;
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
      loginStatus: "not_logged_in",
      loginStatusReason: null,
      availabilityStatus: "unknown",
      availabilityStatusReason: null,
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedAvatarUrl: null,
      resolvedProfileMetadata: {},
      activeTokenRef: null,
      activeTokenExpiresAt: null,
      activeTokenUpdatedAt: null,
      lastConnectedAt: null,
      lastValidatedAt: null,
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
    const latestAttempt =
      await this.options.connectionAttemptStateStore?.getLatestAttemptForAccount(
        record.accountId,
      );

    return toAccountDetail(record, latestAttempt ?? null);
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

    return this.withLatestAttempt(updatedRecord);
  }

  async softDeleteAccount(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus === "deleted") {
      return this.withLatestAttempt(record);
    }

    const deletedAt = this.now().toISOString();
    const deletedRecord: AccountRecord = {
      ...record,
      lifecycleStatus: "deleted",
      deletedAt,
      updatedAt: deletedAt,
    };

    await this.options.stateStore.saveAccount(deletedRecord);

    return this.withLatestAttempt(deletedRecord);
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

    return this.withLatestAttempt(restoredRecord);
  }

  async runAvailabilityCheck(accountId: string): Promise<AvailabilityCheckResult> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus !== "active") {
      throw new AccountOperationConflictError(
        "Availability checks require an active account lifecycle.",
      );
    }

    if (record.loginStatus !== "connected") {
      throw new AccountOperationConflictError(
        "Availability checks require a connected account.",
      );
    }

    const activeToken = await this.readActiveToken(record);

    if (!activeToken) {
      throw new AccountOperationConflictError(
        "Availability checks require an active token.",
      );
    }

    const checkedAt = this.now().toISOString();
    const platform = this.getPlatform(record.platform);
    const result = await platform.checkAvailability({
      account: {
        accountId: record.accountId,
        platform: record.platform,
        internalDisplayName: record.internalDisplayName,
        platformMetadata: { ...record.platformMetadata },
        resolvedPlatformProfile: {
          resolvedPlatformAccountUid: record.resolvedPlatformAccountUid,
          resolvedDisplayName: record.resolvedDisplayName,
          resolvedAvatarUrl: record.resolvedAvatarUrl,
          resolvedProfileMetadata: { ...record.resolvedProfileMetadata },
        },
      },
      activeToken: activeToken.payload,
    });
    const updatedRecord: AccountRecord = {
      ...record,
      availabilityStatus: result.availabilityStatus,
      availabilityStatusReason: result.reason,
      updatedAt: checkedAt,
    };

    await this.options.stateStore.saveAccount(updatedRecord);

    return {
      accountId: updatedRecord.accountId,
      lifecycleStatus: updatedRecord.lifecycleStatus,
      loginStatus: updatedRecord.loginStatus,
      availabilityStatus: updatedRecord.availabilityStatus,
      availabilityStatusReason: updatedRecord.availabilityStatusReason,
      hasActiveToken: updatedRecord.activeTokenRef !== null,
      isConsumable: isAccountConsumable(updatedRecord),
      consumabilityReason: deriveConsumabilityReason(updatedRecord),
      checkedAt,
    };
  }

  async resolveActiveToken(accountId: string): Promise<StoredTokenSecret> {
    const record = await this.getAccountRecord(accountId);

    if (!isAccountConsumable(record)) {
      throw new AccountOperationConflictError(
        "Active token can only be resolved for consumable accounts.",
      );
    }

    const activeToken = await this.readActiveToken(record);

    if (!activeToken) {
      throw new AccountOperationConflictError("Active token is not available.");
    }

    return activeToken;
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

    return record;
  }

  private async withLatestAttempt(record: AccountRecord): Promise<AccountDetail> {
    const latestAttempt =
      await this.options.connectionAttemptStateStore?.getLatestAttemptForAccount(
        record.accountId,
      );

    return toAccountDetail(record, latestAttempt ?? null);
  }

  private async readActiveToken(
    record: AccountRecord,
  ): Promise<StoredTokenSecret | null> {
    if (!record.activeTokenRef) {
      return null;
    }

    return this.options.secretStore.readSecret<StoredTokenSecret>(
      record.activeTokenRef,
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
    platformMetadata: ensurePlainObject(input.platformMetadata ?? {}),
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
    platformMetadata: ensurePlainObject(input.platformMetadata),
  };
}

function normalizeListAccountsFilters(filters: ListAccountsFilters): ListAccountsFilters {
  return {
    platform: normalizeOptionalCode(filters.platform) ?? undefined,
    keyword: normalizeOptionalText(filters.keyword) ?? undefined,
    lifecycleStatus: filters.lifecycleStatus,
    loginStatus: filters.loginStatus,
    availabilityStatus: filters.availabilityStatus,
    includeDeleted:
      typeof filters.includeDeleted === "boolean"
        ? filters.includeDeleted
        : false,
    onlyConsumable:
      typeof filters.onlyConsumable === "boolean"
        ? filters.onlyConsumable
        : false,
  };
}

function normalizeRequiredCode(value: string | undefined, message: string): string {
  const normalized = ensureNonEmptyString(value, message).toLowerCase();

  if (!/^[a-z][a-z0-9_-]*$/.test(normalized)) {
    throw new AccountValidationError(message);
  }

  return normalized;
}

function normalizeOptionalCode(value: string | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim().toLowerCase();
  return normalized.length > 0 ? normalized : null;
}

function normalizeRequiredText(value: string | undefined, message: string): string {
  return ensureNonEmptyString(value, message);
}

function normalizeOptionalText(value: string | null | undefined): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function normalizeTags(tags: string[]): string[] {
  return Array.from(
    new Set(
      tags
        .map((tag) => tag.trim())
        .filter(Boolean)
        .slice(0, 20),
    ),
  );
}

function ensurePlainObject(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new AccountValidationError("Expected a JSON object.");
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
