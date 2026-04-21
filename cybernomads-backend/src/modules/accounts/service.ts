import { randomUUID } from "node:crypto";

import { createAccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountPlatformPort } from "../../ports/account-platform-port.js";
import type { AccountSecretStore } from "../../ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../ports/account-state-store-port.js";
import {
  AccountAlreadyExistsError,
  AccountNotFoundError,
  AccountOperationConflictError,
  AccountPlatformUnavailableError,
  AccountValidationError,
  AuthorizationAttemptNotFoundError,
} from "./errors.js";
import type {
  AccountDetail,
  AccountSummary,
  ActiveCredentialSecret,
  AuthorizationAttemptSecret,
  AuthorizationAttemptStatus,
  AuthorizationAttemptSummary,
  AuthorizationStatus,
  AvailabilityCheckResult,
  AvailabilityStatus,
  CreateAccountInput,
  CreateAccountResult,
  JsonObject,
  ListAccountsFilters,
  ListAccountsResult,
  PlatformAccountRecord,
  ResolvedActiveCredential,
  StartAuthorizationAttemptInput,
  UpdateAccountInput,
  VerifyAuthorizationAttemptInput,
  VerifyAuthorizationAttemptResponse,
} from "./types.js";

export interface AccountServiceOptions {
  stateStore: AccountStateStore;
  secretStore: AccountSecretStore;
  platforms?: Iterable<AccountPlatformPort>;
  now?: () => Date;
  createAccountId?: () => string;
  createAttemptId?: () => string;
}

export class AccountService {
  private readonly platformRegistry: AccountPlatformRegistry;
  private readonly now: () => Date;
  private readonly createAccountId: () => string;
  private readonly createAttemptId: () => string;

  constructor(private readonly options: AccountServiceOptions) {
    this.platformRegistry = createAccountPlatformRegistry(options.platforms ?? []);
    this.now = options.now ?? (() => new Date());
    this.createAccountId = options.createAccountId ?? (() => randomUUID());
    this.createAttemptId = options.createAttemptId ?? (() => randomUUID());
  }

  async createAccount(input: CreateAccountInput): Promise<CreateAccountResult> {
    const normalizedInput = normalizeCreateAccountInput(input);
    const existing = await this.options.stateStore.getAccountByPlatformIdentity(
      normalizedInput.platform,
      normalizedInput.platformAccountUid,
    );
    const timestamp = this.now().toISOString();

    if (existing && existing.lifecycleStatus !== "deleted") {
      throw new AccountAlreadyExistsError(
        normalizedInput.platform,
        normalizedInput.platformAccountUid,
      );
    }

    if (existing) {
      const restoredRecord: PlatformAccountRecord = {
        ...existing,
        displayName: normalizedInput.displayName,
        remark: normalizedInput.remark,
        tags: normalizedInput.tags,
        platformMetadata: normalizedInput.platformMetadata,
        lifecycleStatus: "active",
        deletedAt: null,
        updatedAt: timestamp,
      };

      await this.options.stateStore.saveAccount(restoredRecord);

      return {
        account: toAccountDetail(restoredRecord),
        restoredFromDeleted: true,
      };
    }

    const record: PlatformAccountRecord = {
      accountId: this.createAccountId(),
      platform: normalizedInput.platform,
      platformAccountUid: normalizedInput.platformAccountUid,
      displayName: normalizedInput.displayName,
      remark: normalizedInput.remark,
      tags: normalizedInput.tags,
      platformMetadata: normalizedInput.platformMetadata,
      lifecycleStatus: "active",
      authorizationStatus: "unauthorized",
      authorizationStatusReason: null,
      availabilityStatus: "unknown",
      availabilityStatusReason: null,
      activeCredentialType: null,
      activeCredentialRef: null,
      activeCredentialExpiresAt: null,
      activeCredentialUpdatedAt: null,
      authorizationAttemptId: null,
      authorizationAttemptMethod: null,
      authorizationAttemptExpectedCredentialType: null,
      authorizationAttemptPayloadRef: null,
      authorizationAttemptStatus: null,
      authorizationAttemptStatusReason: null,
      authorizationAttemptExpiresAt: null,
      authorizationAttemptCreatedAt: null,
      authorizationAttemptUpdatedAt: null,
      lastAuthorizedAt: null,
      lastAvailabilityCheckedAt: null,
      deletedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.options.stateStore.createAccount(record);

    return {
      account: toAccountDetail(record),
      restoredFromDeleted: false,
    };
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
    return toAccountDetail(record);
  }

  async updateAccount(
    accountId: string,
    input: UpdateAccountInput,
  ): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeUpdateAccountInput(input);
    const updatedRecord: PlatformAccountRecord = {
      ...record,
      displayName: normalizedInput.displayName,
      remark: normalizedInput.remark,
      tags: normalizedInput.tags,
      platformMetadata: normalizedInput.platformMetadata,
      updatedAt: this.now().toISOString(),
    };

    await this.options.stateStore.saveAccount(updatedRecord);

    return toAccountDetail(updatedRecord);
  }

  async softDeleteAccount(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus === "deleted") {
      return toAccountDetail(record);
    }

    const deletedAt = this.now().toISOString();
    const deletedRecord: PlatformAccountRecord = {
      ...record,
      lifecycleStatus: "deleted",
      deletedAt,
      updatedAt: deletedAt,
    };

    await this.options.stateStore.saveAccount(deletedRecord);

    return toAccountDetail(deletedRecord);
  }

  async restoreAccount(accountId: string): Promise<AccountDetail> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus !== "deleted") {
      throw new AccountOperationConflictError(
        "Only deleted accounts can be restored.",
      );
    }

    const restoredRecord: PlatformAccountRecord = {
      ...record,
      lifecycleStatus: "active",
      deletedAt: null,
      updatedAt: this.now().toISOString(),
    };

    await this.options.stateStore.saveAccount(restoredRecord);

    return toAccountDetail(restoredRecord);
  }

  async startAuthorizationAttempt(
    accountId: string,
    input: StartAuthorizationAttemptInput,
  ): Promise<AuthorizationAttemptSummary> {
    const record = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeStartAuthorizationAttemptInput(input);

    if (record.lifecycleStatus === "deleted") {
      throw new AccountOperationConflictError(
        "Deleted accounts cannot start authorization attempts.",
      );
    }

    const platform = this.getPlatform(record.platform);
    const startedAt = this.now().toISOString();
    const startResult = await platform.startAuthorizationAttempt({
      account: toPlatformAccountSnapshot(record),
      authorizationMethod: normalizedInput.authorizationMethod,
      expectedCredentialType: normalizedInput.expectedCredentialType,
      payload: normalizedInput.payload,
      requestedExpiresAt: normalizedInput.expiresAt,
    });
    const attemptId = this.createAttemptId();
    const payloadRef = createAuthorizationAttemptSecretRef(record.accountId, attemptId);
    const attemptSecret: AuthorizationAttemptSecret = {
      authorizationMethod: normalizedInput.authorizationMethod,
      expectedCredentialType:
        startResult.expectedCredentialType ??
        normalizedInput.expectedCredentialType,
      initialPayload: normalizedInput.payload,
      platformAttemptPayload: ensureJsonObject(startResult.attemptPayload),
      previousAuthorizationStatus: record.authorizationStatus,
      previousAuthorizationStatusReason: record.authorizationStatusReason,
    };

    await this.options.secretStore.writeSecret(payloadRef, attemptSecret);

    const shouldPreserveAuthorization =
      record.authorizationStatus === "authorized" &&
      record.activeCredentialRef !== null &&
      record.activeCredentialType !== null;
    const nextRecord: PlatformAccountRecord = {
      ...record,
      authorizationStatus: shouldPreserveAuthorization
        ? record.authorizationStatus
        : "authorizing",
      authorizationStatusReason: shouldPreserveAuthorization
        ? record.authorizationStatusReason
        : null,
      authorizationAttemptId: attemptId,
      authorizationAttemptMethod: normalizedInput.authorizationMethod,
      authorizationAttemptExpectedCredentialType:
        startResult.expectedCredentialType ??
        normalizedInput.expectedCredentialType,
      authorizationAttemptPayloadRef: payloadRef,
      authorizationAttemptStatus: "pending_verification",
      authorizationAttemptStatusReason: null,
      authorizationAttemptExpiresAt:
        startResult.expiresAt ?? normalizedInput.expiresAt,
      authorizationAttemptCreatedAt: startedAt,
      authorizationAttemptUpdatedAt: startedAt,
      updatedAt: startedAt,
    };

    try {
      await this.options.stateStore.saveAccount(nextRecord);
      await this.deleteReplacedSecret(
        record.authorizationAttemptPayloadRef,
        payloadRef,
      );
    } catch (error) {
      await this.options.secretStore.deleteSecret(payloadRef);
      throw error;
    }

    return toAuthorizationAttemptSummary(nextRecord)!;
  }

  async verifyAuthorizationAttempt(
    accountId: string,
    attemptId: string,
    input: VerifyAuthorizationAttemptInput,
  ): Promise<VerifyAuthorizationAttemptResponse> {
    const record = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeVerifyAuthorizationAttemptInput(input);

    if (
      record.authorizationAttemptId === null ||
      record.authorizationAttemptId !== ensureNonEmptyString(
        attemptId,
        "Attempt ID is required.",
      )
    ) {
      throw new AuthorizationAttemptNotFoundError(record.accountId, attemptId);
    }

    if (record.authorizationAttemptStatus !== "pending_verification") {
      throw new AccountOperationConflictError(
        "Only pending authorization attempts can be verified.",
      );
    }

    const attemptSecret = await this.readAuthorizationAttemptSecret(record);
    const verifiedAt = this.now().toISOString();

    if (
      isTimestampExpired(record.authorizationAttemptExpiresAt, verifiedAt)
    ) {
      const expiredRecord = restoreAuthorizationStatus({
        ...record,
        authorizationAttemptStatus: "expired",
        authorizationAttemptStatusReason: "Authorization attempt expired.",
        authorizationAttemptUpdatedAt: verifiedAt,
        updatedAt: verifiedAt,
      }, attemptSecret);

      await this.options.stateStore.saveAccount(expiredRecord);

      throw new AccountOperationConflictError(
        "The authorization attempt has already expired.",
      );
    }

    const platform = this.getPlatform(record.platform);
    const activeCredential = await this.readStoredActiveCredential(record);
    const verification = await platform.verifyAuthorizationAttempt({
      account: toPlatformAccountSnapshot(record),
      authorizationMethod: record.authorizationAttemptMethod!,
      expectedCredentialType: record.authorizationAttemptExpectedCredentialType,
      attemptPayload: attemptSecret.platformAttemptPayload,
      verificationPayload: normalizedInput.verificationPayload,
      activeCredential: activeCredential
        ? {
            credentialType: activeCredential.credentialType,
            payload: activeCredential.payload,
            expiresAt: activeCredential.expiresAt,
          }
        : null,
    });

    const identityConflictReason = deriveIdentityConflictReason(
      record,
      verification.resolvedIdentity,
    );

    if (
      verification.verificationResult === "succeeded" &&
      verification.credential &&
      !identityConflictReason
    ) {
      return this.completeSuccessfulAuthorizationVerification({
        record,
        attemptSecret,
        verifiedAt,
        verification,
      });
    }

    const failureReason =
      identityConflictReason ??
      verification.reason ??
      (verification.verificationResult === "succeeded"
        ? "Verified attempt did not produce usable credential material."
        : "Authorization verification failed.");
    const failedRecord = restoreAuthorizationStatus(
      {
        ...record,
        authorizationAttemptStatus: "verification_failed",
        authorizationAttemptStatusReason: failureReason,
        authorizationAttemptUpdatedAt: verifiedAt,
        updatedAt: verifiedAt,
      },
      attemptSecret,
    );

    await this.options.stateStore.saveAccount(failedRecord);

    return {
      attemptId: record.authorizationAttemptId,
      verificationResult: "failed",
      verificationReason: failureReason,
      activeCredentialSwitched: false,
      account: toAccountDetail(failedRecord),
    };
  }

  async runAvailabilityCheck(accountId: string): Promise<AvailabilityCheckResult> {
    const record = await this.getAccountRecord(accountId);

    if (record.lifecycleStatus !== "active") {
      throw new AccountOperationConflictError(
        "Availability checks require an active account lifecycle.",
      );
    }

    if (record.authorizationStatus !== "authorized") {
      throw new AccountOperationConflictError(
        "Availability checks require an authorized account.",
      );
    }

    const activeCredential = await this.readStoredActiveCredential(record);

    if (!activeCredential) {
      throw new AccountOperationConflictError(
        "Availability checks require an active credential.",
      );
    }

    const platform = this.getPlatform(record.platform);
    const checkedAt = this.now().toISOString();
    const result = await platform.checkAvailability({
      account: toPlatformAccountSnapshot(record),
      activeCredential: {
        credentialType: activeCredential.credentialType,
        payload: activeCredential.payload,
        expiresAt: activeCredential.expiresAt,
      },
    });
    const updatedRecord: PlatformAccountRecord = {
      ...record,
      availabilityStatus: result.availabilityStatus,
      availabilityStatusReason: result.reason,
      lastAvailabilityCheckedAt: checkedAt,
      updatedAt: checkedAt,
    };

    await this.options.stateStore.saveAccount(updatedRecord);

    return {
      accountId: updatedRecord.accountId,
      lifecycleStatus: updatedRecord.lifecycleStatus,
      authorizationStatus: updatedRecord.authorizationStatus,
      availabilityStatus: updatedRecord.availabilityStatus,
      availabilityStatusReason: updatedRecord.availabilityStatusReason,
      hasActiveCredential: hasActiveCredential(updatedRecord),
      isConsumable: isConsumable(updatedRecord),
      consumabilityReason: deriveConsumabilityReason(updatedRecord),
      checkedAt,
    };
  }

  async resolveActiveCredential(
    accountId: string,
  ): Promise<ResolvedActiveCredential> {
    const record = await this.getAccountRecord(accountId);

    if (!isConsumable(record)) {
      throw new AccountOperationConflictError(
        "Active credential can only be resolved for consumable accounts.",
      );
    }

    const activeCredential = await this.readStoredActiveCredential(record);

    if (!activeCredential) {
      throw new AccountOperationConflictError(
        "Active credential is not available.",
      );
    }

    return activeCredential;
  }

  close(): void {
    this.options.stateStore.close();
  }

  private async getAccountRecord(accountId: string): Promise<PlatformAccountRecord> {
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

  private async readAuthorizationAttemptSecret(
    record: PlatformAccountRecord,
  ): Promise<AuthorizationAttemptSecret> {
    if (!record.authorizationAttemptPayloadRef) {
      throw new AccountOperationConflictError(
        "Authorization attempt payload is not available.",
      );
    }

    const secret = await this.options.secretStore.readSecret<AuthorizationAttemptSecret>(
      record.authorizationAttemptPayloadRef,
    );

    return {
      authorizationMethod: ensureNonEmptyString(
        secret.authorizationMethod,
        "Authorization attempt secret is invalid.",
      ),
      expectedCredentialType: normalizeOptionalCode(secret.expectedCredentialType),
      initialPayload: ensureJsonObject(secret.initialPayload),
      platformAttemptPayload: ensureJsonObject(secret.platformAttemptPayload),
      previousAuthorizationStatus: ensureAuthorizationStatus(
        secret.previousAuthorizationStatus,
      ),
      previousAuthorizationStatusReason:
        typeof secret.previousAuthorizationStatusReason === "string"
          ? secret.previousAuthorizationStatusReason
          : null,
    };
  }

  private async readStoredActiveCredential(
    record: PlatformAccountRecord,
  ): Promise<ResolvedActiveCredential | null> {
    if (!record.activeCredentialRef || !record.activeCredentialType) {
      return null;
    }

    const secret = await this.options.secretStore.readSecret<ActiveCredentialSecret>(
      record.activeCredentialRef,
    );

    return {
      credentialType: ensureNonEmptyString(
        secret.credentialType ?? record.activeCredentialType,
        "Active credential secret is invalid.",
      ),
      credentialRef: record.activeCredentialRef,
      payload: ensureJsonObject(secret.payload),
      expiresAt:
        typeof secret.expiresAt === "string" ? secret.expiresAt : null,
      updatedAt: record.activeCredentialUpdatedAt,
    };
  }

  private getPlatform(platformCode: string): AccountPlatformPort {
    const platform = this.platformRegistry.resolve(platformCode);

    if (!platform) {
      throw new AccountPlatformUnavailableError(
        `Platform "${platformCode}" is not available.`,
      );
    }

    return platform;
  }

  private async deleteReplacedSecret(
    previousSecretRef: string | null,
    nextSecretRef: string,
  ): Promise<void> {
    if (!previousSecretRef || previousSecretRef === nextSecretRef) {
      return;
    }

    await this.options.secretStore.deleteSecret(previousSecretRef);
  }

  private async completeSuccessfulAuthorizationVerification({
    record,
    attemptSecret: _attemptSecret,
    verifiedAt,
    verification,
  }: {
    record: PlatformAccountRecord;
    attemptSecret: AuthorizationAttemptSecret;
    verifiedAt: string;
    verification: Awaited<
      ReturnType<AccountPlatformPort["verifyAuthorizationAttempt"]>
    >;
  }): Promise<VerifyAuthorizationAttemptResponse> {
    void _attemptSecret;

    const credential = verification.credential!;
    const credentialRef = createActiveCredentialSecretRef(
      record.accountId,
      record.authorizationAttemptId!,
    );
    const activeCredentialSecret: ActiveCredentialSecret = {
      credentialType: credential.credentialType,
      payload: ensureJsonObject(credential.payload),
      expiresAt: credential.expiresAt,
    };

    await this.options.secretStore.writeSecret(credentialRef, activeCredentialSecret);

    const updatedRecord: PlatformAccountRecord = {
      ...record,
      displayName:
        normalizeOptionalDisplayName(verification.profile?.displayName) ??
        record.displayName,
      platformMetadata: mergeJsonObjects(
        record.platformMetadata,
        verification.profile?.platformMetadata,
      ),
      authorizationStatus: "authorized",
      authorizationStatusReason: verification.reason,
      availabilityStatus: "unknown",
      availabilityStatusReason:
        "Availability must be rechecked after credential switch.",
      activeCredentialType: credential.credentialType,
      activeCredentialRef: credentialRef,
      activeCredentialExpiresAt: credential.expiresAt,
      activeCredentialUpdatedAt: verifiedAt,
      authorizationAttemptStatus: "verification_succeeded",
      authorizationAttemptStatusReason: verification.reason,
      authorizationAttemptUpdatedAt: verifiedAt,
      lastAuthorizedAt: verifiedAt,
      updatedAt: verifiedAt,
    };

    try {
      await this.options.stateStore.saveAccount(updatedRecord);
      await this.deleteReplacedSecret(record.activeCredentialRef, credentialRef);
    } catch (error) {
      await this.options.secretStore.deleteSecret(credentialRef);
      throw error;
    }

    return {
      attemptId: updatedRecord.authorizationAttemptId!,
      verificationResult: "succeeded",
      verificationReason: verification.reason,
      activeCredentialSwitched: true,
      account: toAccountDetail(updatedRecord),
    };
  }
}

function normalizeCreateAccountInput(input: CreateAccountInput) {
  return {
    platform: normalizeRequiredCode(input.platform, "Platform is required."),
    platformAccountUid: ensureNonEmptyString(
      input.platformAccountUid,
      "Platform account UID is required.",
    ),
    displayName: normalizeRequiredDisplayName(
      input.displayName,
      "Display name is required.",
    ),
    remark: normalizeOptionalText(input.remark),
    tags: normalizeTags(input.tags ?? []),
    platformMetadata: ensurePlainObject(input.platformMetadata ?? {}),
  };
}

function normalizeUpdateAccountInput(input: UpdateAccountInput) {
  return {
    displayName: normalizeRequiredDisplayName(
      input.displayName,
      "Display name is required.",
    ),
    remark: normalizeOptionalText(input.remark),
    tags: normalizeTags(input.tags),
    platformMetadata: ensurePlainObject(input.platformMetadata),
  };
}

function normalizeStartAuthorizationAttemptInput(
  input: StartAuthorizationAttemptInput,
) {
  return {
    authorizationMethod: normalizeRequiredCode(
      input.authorizationMethod,
      "Authorization method is required.",
    ),
    expectedCredentialType: normalizeOptionalCode(input.expectedCredentialType),
    payload: ensurePlainObject(input.payload),
    expiresAt: normalizeOptionalTimestamp(input.expiresAt),
  };
}

function normalizeVerifyAuthorizationAttemptInput(
  input: VerifyAuthorizationAttemptInput,
): { verificationPayload: JsonObject } {
  return {
    verificationPayload: ensureJsonObject(input.verificationPayload ?? {}),
  };
}

function normalizeListAccountsFilters(filters: ListAccountsFilters): ListAccountsFilters {
  return {
    platform: normalizeOptionalCode(filters.platform) ?? undefined,
    keyword: normalizeOptionalKeyword(filters.keyword),
    lifecycleStatus: filters.lifecycleStatus
      ? ensureLifecycleStatus(filters.lifecycleStatus)
      : undefined,
    authorizationStatus: filters.authorizationStatus
      ? ensureAuthorizationStatus(filters.authorizationStatus)
      : undefined,
    availabilityStatus: filters.availabilityStatus
      ? ensureAvailabilityStatus(filters.availabilityStatus)
      : undefined,
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

function toAccountSummary(record: PlatformAccountRecord): AccountSummary {
  return {
    accountId: record.accountId,
    platform: record.platform,
    platformAccountUid: record.platformAccountUid,
    displayName: record.displayName,
    tags: [...record.tags],
    lifecycleStatus: record.lifecycleStatus,
    authorizationStatus: record.authorizationStatus,
    availabilityStatus: record.availabilityStatus,
    hasActiveCredential: hasActiveCredential(record),
    hasPendingAuthorizationAttempt: hasPendingAuthorizationAttempt(record),
    isConsumable: isConsumable(record),
    updatedAt: record.updatedAt,
  };
}

function toAccountDetail(record: PlatformAccountRecord): AccountDetail {
  return {
    accountId: record.accountId,
    platform: record.platform,
    platformAccountUid: record.platformAccountUid,
    displayName: record.displayName,
    remark: record.remark,
    tags: [...record.tags],
    platformMetadata: { ...record.platformMetadata },
    lifecycleStatus: record.lifecycleStatus,
    authorizationStatus: record.authorizationStatus,
    authorizationStatusReason: record.authorizationStatusReason,
    availabilityStatus: record.availabilityStatus,
    availabilityStatusReason: record.availabilityStatusReason,
    hasPendingAuthorizationAttempt: hasPendingAuthorizationAttempt(record),
    isConsumable: isConsumable(record),
    activeCredential: {
      hasCredential: hasActiveCredential(record),
      credentialType: record.activeCredentialType,
      expiresAt: record.activeCredentialExpiresAt,
      updatedAt: record.activeCredentialUpdatedAt,
    },
    authorizationAttempt: toAuthorizationAttemptSummary(record),
    lastAuthorizedAt: record.lastAuthorizedAt,
    lastAvailabilityCheckedAt: record.lastAvailabilityCheckedAt,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toAuthorizationAttemptSummary(
  record: PlatformAccountRecord,
): AuthorizationAttemptSummary | null {
  if (
    !record.authorizationAttemptId ||
    !record.authorizationAttemptMethod ||
    !record.authorizationAttemptStatus ||
    !record.authorizationAttemptCreatedAt ||
    !record.authorizationAttemptUpdatedAt
  ) {
    return null;
  }

  return {
    attemptId: record.authorizationAttemptId,
    authorizationMethod: record.authorizationAttemptMethod,
    expectedCredentialType: record.authorizationAttemptExpectedCredentialType,
    attemptStatus: record.authorizationAttemptStatus,
    attemptStatusReason: record.authorizationAttemptStatusReason,
    expiresAt: record.authorizationAttemptExpiresAt,
    createdAt: record.authorizationAttemptCreatedAt,
    updatedAt: record.authorizationAttemptUpdatedAt,
  };
}

function toPlatformAccountSnapshot(record: PlatformAccountRecord) {
  return {
    accountId: record.accountId,
    platform: record.platform,
    platformAccountUid: record.platformAccountUid,
    displayName: record.displayName,
    platformMetadata: { ...record.platformMetadata },
  };
}

function hasActiveCredential(record: PlatformAccountRecord): boolean {
  return record.activeCredentialRef !== null && record.activeCredentialType !== null;
}

function hasPendingAuthorizationAttempt(record: PlatformAccountRecord): boolean {
  return record.authorizationAttemptStatus === "pending_verification";
}

function isConsumable(record: PlatformAccountRecord): boolean {
  return (
    record.lifecycleStatus === "active" &&
    record.authorizationStatus === "authorized" &&
    record.availabilityStatus === "healthy" &&
    hasActiveCredential(record)
  );
}

function deriveConsumabilityReason(record: PlatformAccountRecord): string | null {
  if (isConsumable(record)) {
    return null;
  }

  if (record.lifecycleStatus !== "active") {
    return `Account lifecycle status is ${record.lifecycleStatus}.`;
  }

  if (record.authorizationStatus !== "authorized") {
    return `Account authorization status is ${record.authorizationStatus}.`;
  }

  if (record.availabilityStatus !== "healthy") {
    return `Account availability status is ${record.availabilityStatus}.`;
  }

  if (!hasActiveCredential(record)) {
    return "Account does not have an active credential.";
  }

  return "Account is not consumable.";
}

function ensureNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string") {
    throw new AccountValidationError(message);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new AccountValidationError(message);
  }

  return normalizedValue;
}

function normalizeRequiredCode(value: unknown, message: string): string {
  return ensureNonEmptyString(value, message).toLowerCase();
}

function normalizeOptionalCode(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredCode(value, "Expected a non-empty code.");
}

function normalizeRequiredDisplayName(value: unknown, message: string): string {
  return ensureNonEmptyString(value, message);
}

function normalizeOptionalDisplayName(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredDisplayName(value, "Expected a non-empty display name.");
}

function normalizeOptionalText(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AccountValidationError("Remark must be a string or null.");
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : null;
}

function normalizeOptionalKeyword(value: unknown): string | undefined {
  if (value === null || value === undefined) {
    return undefined;
  }

  if (typeof value !== "string") {
    throw new AccountValidationError("Keyword filter must be a string.");
  }

  const normalizedValue = value.trim();
  return normalizedValue.length > 0 ? normalizedValue : undefined;
}

function normalizeTags(value: unknown): string[] {
  if (!Array.isArray(value)) {
    throw new AccountValidationError("Tags must be an array.");
  }

  const tags: string[] = [];
  const seen = new Set<string>();

  for (const item of value) {
    const normalizedTag = ensureNonEmptyString(item, "Tags must contain non-empty strings.");

    if (seen.has(normalizedTag)) {
      continue;
    }

    seen.add(normalizedTag);
    tags.push(normalizedTag);
  }

  return tags;
}

function ensurePlainObject(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new AccountValidationError("Expected a JSON object.");
  }

  return { ...(value as JsonObject) };
}

function ensureJsonObject(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return { ...(value as JsonObject) };
}

function normalizeOptionalTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string") {
    throw new AccountValidationError("Expected an ISO date-time string.");
  }

  if (Number.isNaN(Date.parse(value))) {
    throw new AccountValidationError("Expected a valid ISO date-time string.");
  }

  return value;
}

function ensureLifecycleStatus(value: unknown) {
  if (value === "active" || value === "disabled" || value === "deleted") {
    return value;
  }

  throw new AccountValidationError("Lifecycle status filter is invalid.");
}

function ensureAuthorizationStatus(value: unknown): AuthorizationStatus {
  if (
    value === "unauthorized" ||
    value === "authorizing" ||
    value === "authorized" ||
    value === "expired" ||
    value === "revoked"
  ) {
    return value;
  }

  throw new AccountValidationError("Authorization status is invalid.");
}

function ensureAvailabilityStatus(value: unknown): AvailabilityStatus {
  if (
    value === "unknown" ||
    value === "healthy" ||
    value === "risk" ||
    value === "restricted" ||
    value === "offline"
  ) {
    return value;
  }

  throw new AccountValidationError("Availability status is invalid.");
}

function ensureAttemptStatus(value: unknown): AuthorizationAttemptStatus {
  if (
    value === "pending_verification" ||
    value === "verification_succeeded" ||
    value === "verification_failed" ||
    value === "expired" ||
    value === "canceled"
  ) {
    return value;
  }

  throw new AccountValidationError("Authorization attempt status is invalid.");
}

function restoreAuthorizationStatus(
  record: PlatformAccountRecord,
  attemptSecret: AuthorizationAttemptSecret,
): PlatformAccountRecord {
  return {
    ...record,
    authorizationStatus: ensureAuthorizationStatus(
      attemptSecret.previousAuthorizationStatus,
    ),
    authorizationStatusReason: attemptSecret.previousAuthorizationStatusReason,
  };
}

function deriveIdentityConflictReason(
  record: PlatformAccountRecord,
  resolvedIdentity: { platform: string; platformAccountUid: string } | null,
): string | null {
  if (!resolvedIdentity) {
    return null;
  }

  if (
    normalizeOptionalCode(resolvedIdentity.platform) !== record.platform ||
    ensureNonEmptyString(
      resolvedIdentity.platformAccountUid,
      "Resolved platform account UID is invalid.",
    ) !== record.platformAccountUid
  ) {
    return "Authorization verification resolved a different platform identity.";
  }

  return null;
}

function mergeJsonObjects(
  currentValue: JsonObject,
  nextValue: JsonObject | null | undefined,
): JsonObject {
  if (!nextValue) {
    return { ...currentValue };
  }

  return {
    ...currentValue,
    ...ensureJsonObject(nextValue),
  };
}

function isTimestampExpired(expiresAt: string | null, now: string): boolean {
  if (!expiresAt) {
    return false;
  }

  return Date.parse(expiresAt) < Date.parse(now);
}

function createAuthorizationAttemptSecretRef(
  accountId: string,
  attemptId: string,
): string {
  return `${accountId}/attempts/${attemptId}.json`;
}

function createActiveCredentialSecretRef(
  accountId: string,
  attemptId: string,
): string {
  return `${accountId}/credentials/${attemptId}.json`;
}

export { ensureAttemptStatus, ensureAvailabilityStatus, ensureAuthorizationStatus };
