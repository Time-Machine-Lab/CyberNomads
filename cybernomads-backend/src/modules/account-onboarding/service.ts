import { randomUUID } from "node:crypto";

import { createAccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type {
  AccountPlatformAuthorizationVerifyResult,
  AccountPlatformPort,
} from "../../ports/account-platform-port.js";
import type { AccountOnboardingStateStore } from "../../ports/account-onboarding-state-store-port.js";
import type { AccountSecretStore } from "../../ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../ports/account-state-store-port.js";
import {
  AccountPlatformUnavailableError,
  AccountValidationError,
} from "../accounts/errors.js";
import { toAccountDetail } from "../accounts/service.js";
import type {
  ActiveCredentialSecret,
  JsonObject,
  PlatformAccountRecord,
} from "../accounts/types.js";
import {
  AccountOnboardingOperationConflictError,
  AccountOnboardingSessionNotFoundError,
} from "./errors.js";
import type {
  AccountOnboardingFinalDisposition,
  AccountOnboardingResolvedIdentity,
  AccountOnboardingResolvedProfile,
  AccountOnboardingSessionDetail,
  AccountOnboardingSessionRecord,
  FinalizeAccountOnboardingSessionResponse,
  ResolveAccountOnboardingSessionInput,
  StartAccountOnboardingSessionInput,
} from "./types.js";

export interface AccountOnboardingServiceOptions {
  stateStore: AccountOnboardingStateStore;
  accountStateStore: AccountStateStore;
  secretStore: AccountSecretStore;
  platforms?: Iterable<AccountPlatformPort>;
  now?: () => Date;
  createSessionId?: () => string;
  createAccountId?: () => string;
}

export class AccountOnboardingService {
  private readonly platformRegistry: AccountPlatformRegistry;
  private readonly now: () => Date;
  private readonly createSessionId: () => string;
  private readonly createAccountId: () => string;

  constructor(private readonly options: AccountOnboardingServiceOptions) {
    this.platformRegistry = createAccountPlatformRegistry(options.platforms ?? []);
    this.now = options.now ?? (() => new Date());
    this.createSessionId = options.createSessionId ?? (() => randomUUID());
    this.createAccountId = options.createAccountId ?? (() => randomUUID());
  }

  async startSession(
    input: StartAccountOnboardingSessionInput,
  ): Promise<AccountOnboardingSessionDetail> {
    const normalizedInput = normalizeStartInput(input);
    const platform = this.getPlatform(normalizedInput.platform);
    const timestamp = this.now().toISOString();
    const startResult = await platform.startOnboardingSession({
      platform: normalizedInput.platform,
      authorizationMethod: normalizedInput.authorizationMethod,
      expectedCredentialType: normalizedInput.expectedCredentialType,
      payload: normalizedInput.payload,
      requestedExpiresAt: normalizedInput.expiresAt,
    });
    const sessionId = this.createSessionId();
    const inputPayloadRef = hasKeys(normalizedInput.payload)
      ? createOnboardingInputSecretRef(sessionId)
      : null;
    const platformSessionPayloadRef = hasKeys(startResult.sessionPayload)
      ? createOnboardingSessionPayloadSecretRef(sessionId)
      : null;

    if (inputPayloadRef) {
      await this.options.secretStore.writeSecret(inputPayloadRef, normalizedInput.payload);
    }

    if (platformSessionPayloadRef) {
      await this.options.secretStore.writeSecret(
        platformSessionPayloadRef,
        ensureJsonObject(startResult.sessionPayload),
      );
    }

    const record: AccountOnboardingSessionRecord = {
      sessionId,
      platform: normalizedInput.platform,
      authorizationMethod: normalizedInput.authorizationMethod,
      expectedCredentialType:
        startResult.expectedCredentialType ??
        normalizedInput.expectedCredentialType,
      inputPayloadRef,
      platformSessionPayloadRef,
      challenge: normalizeNullableJsonObject(startResult.challenge),
      sessionStatus: "pending_resolution",
      sessionStatusReason: null,
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedProfile: {},
      candidateCredentialType: null,
      candidateCredentialRef: null,
      finalDisposition: null,
      targetAccountId: null,
      expiresAt: startResult.expiresAt ?? normalizedInput.expiresAt,
      consumedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    try {
      await this.options.stateStore.createSession(record);
      return toSessionDetail(record);
    } catch (error) {
      await this.deleteSecretIfPresent(inputPayloadRef);
      await this.deleteSecretIfPresent(platformSessionPayloadRef);
      throw error;
    }
  }

  async getSession(sessionId: string): Promise<AccountOnboardingSessionDetail> {
    const record = await this.getSessionRecord(sessionId);
    return toSessionDetail(await this.markExpiredIfNeeded(record));
  }

  async resolveSession(
    sessionId: string,
    input: ResolveAccountOnboardingSessionInput,
  ): Promise<AccountOnboardingSessionDetail> {
    const normalizedInput = normalizeResolveInput(input);
    const currentRecord = await this.markExpiredIfNeeded(
      await this.getSessionRecord(sessionId),
    );

    if (
      currentRecord.sessionStatus !== "pending_resolution" &&
      currentRecord.sessionStatus !== "resolution_failed"
    ) {
      throw new AccountOnboardingOperationConflictError(
        "Only pending or failed onboarding sessions can be resolved.",
      );
    }

    const platform = this.getPlatform(currentRecord.platform);
    const resolution = await platform.resolveOnboardingSession({
      platform: currentRecord.platform,
      authorizationMethod: currentRecord.authorizationMethod,
      expectedCredentialType: currentRecord.expectedCredentialType,
      inputPayload: await this.readJsonSecret(currentRecord.inputPayloadRef),
      sessionPayload: await this.readJsonSecret(
        currentRecord.platformSessionPayloadRef,
      ),
      resolutionPayload: normalizedInput.resolutionPayload,
    });
    const resolvedAt = this.now().toISOString();
    const candidateCredentialRef = createOnboardingCandidateCredentialSecretRef(
      currentRecord.sessionId,
    );
    const identityConflictReason = deriveOnboardingIdentityConflictReason(
      currentRecord.platform,
      resolution.resolvedIdentity,
    );

    if (isSuccessfulResolution(resolution) && !identityConflictReason) {
      await this.options.secretStore.writeSecret(candidateCredentialRef, {
        credentialType: resolution.credential.credentialType,
        payload: ensureJsonObject(resolution.credential.payload),
        expiresAt: resolution.credential.expiresAt,
      } satisfies ActiveCredentialSecret);

      const resolvedRecord: AccountOnboardingSessionRecord = {
        ...currentRecord,
        expectedCredentialType:
          resolution.credential.credentialType ??
          currentRecord.expectedCredentialType,
        sessionStatus: "resolved",
        sessionStatusReason: resolution.reason,
        resolvedPlatformAccountUid: ensureNonEmptyString(
          resolution.resolvedIdentity.platformAccountUid,
          "Resolved platform account UID is invalid.",
        ),
        resolvedDisplayName: normalizeOptionalDisplayName(
          resolution.profile?.displayName,
        ),
        resolvedProfile: ensureJsonObject(resolution.profile?.platformMetadata),
        candidateCredentialType: resolution.credential.credentialType,
        candidateCredentialRef,
        updatedAt: resolvedAt,
      };

      try {
        await this.options.stateStore.saveSession(resolvedRecord);
        await this.deleteSecretIfReplaced(
          currentRecord.candidateCredentialRef,
          candidateCredentialRef,
        );
      } catch (error) {
        await this.options.secretStore.deleteSecret(candidateCredentialRef);
        throw error;
      }

      return toSessionDetail(resolvedRecord);
    }

    const failureRecord: AccountOnboardingSessionRecord = {
      ...currentRecord,
      sessionStatus: "resolution_failed",
      sessionStatusReason:
        identityConflictReason ??
        deriveResolutionFailureReason(resolution) ??
        "Onboarding session resolution failed.",
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedProfile: {},
      candidateCredentialType: null,
      candidateCredentialRef: null,
      updatedAt: resolvedAt,
    };

    await this.options.stateStore.saveSession(failureRecord);
    await this.deleteSecretIfPresent(currentRecord.candidateCredentialRef);

    return toSessionDetail(failureRecord);
  }

  async finalizeSession(
    sessionId: string,
  ): Promise<FinalizeAccountOnboardingSessionResponse> {
    const currentRecord = await this.markExpiredIfNeeded(
      await this.getSessionRecord(sessionId),
    );

    if (currentRecord.sessionStatus !== "resolved") {
      throw new AccountOnboardingOperationConflictError(
        "Only resolved onboarding sessions can be finalized.",
      );
    }

    if (
      !currentRecord.resolvedPlatformAccountUid ||
      !currentRecord.candidateCredentialRef ||
      !currentRecord.candidateCredentialType
    ) {
      throw new AccountOnboardingOperationConflictError(
        "Resolved onboarding session is missing candidate credential material.",
      );
    }

    const finalizedAt = this.now().toISOString();
    const candidateCredential = await this.readCandidateCredential(currentRecord);
    const existingAccount =
      await this.options.accountStateStore.getAccountByPlatformIdentity(
        currentRecord.platform,
        currentRecord.resolvedPlatformAccountUid,
      );

    if (existingAccount && existingAccount.lifecycleStatus !== "deleted") {
      const consumedRecord = await this.consumeSession(
        currentRecord,
        "existing",
        existingAccount.accountId,
        finalizedAt,
      );

      return {
        sessionId: consumedRecord.sessionId,
        finalDisposition: "existing",
        accountId: existingAccount.accountId,
        account: toAccountDetail(existingAccount),
      };
    }

    const targetAccountId = existingAccount?.accountId ?? this.createAccountId();
    const nextCredentialRef = createAccountCredentialSecretRef(
      targetAccountId,
      currentRecord.sessionId,
    );
    const credentialSecret: ActiveCredentialSecret = {
      credentialType: candidateCredential.credentialType,
      payload: ensureJsonObject(candidateCredential.payload),
      expiresAt: candidateCredential.expiresAt,
    };
    await this.options.secretStore.writeSecret(nextCredentialRef, credentialSecret);

    const nextRecord = existingAccount
      ? buildRestoredAccountRecord({
          existingAccount,
          onboardingRecord: currentRecord,
          credentialRef: nextCredentialRef,
          credentialExpiresAt: candidateCredential.expiresAt,
          finalizedAt,
        })
      : buildCreatedAccountRecord({
          accountId: targetAccountId,
          onboardingRecord: currentRecord,
          credentialRef: nextCredentialRef,
          credentialExpiresAt: candidateCredential.expiresAt,
          finalizedAt,
        });

    try {
      if (existingAccount) {
        await this.options.accountStateStore.saveAccount(nextRecord);
        await this.deleteSecretIfReplaced(
          existingAccount.activeCredentialRef,
          nextCredentialRef,
        );
      } else {
        await this.options.accountStateStore.createAccount(nextRecord);
      }
    } catch (error) {
      await this.options.secretStore.deleteSecret(nextCredentialRef);
      throw error;
    }

    const finalDisposition: AccountOnboardingFinalDisposition = existingAccount
      ? "restored"
      : "created";
    const consumedRecord = await this.consumeSession(
      currentRecord,
      finalDisposition,
      nextRecord.accountId,
      finalizedAt,
    );

    return {
      sessionId: consumedRecord.sessionId,
      finalDisposition,
      accountId: nextRecord.accountId,
      account: toAccountDetail(nextRecord),
    };
  }

  close(): void {
    this.options.stateStore.close();
  }

  private async getSessionRecord(
    sessionId: string,
  ): Promise<AccountOnboardingSessionRecord> {
    const normalizedSessionId = ensureNonEmptyString(
      sessionId,
      "Session ID is required.",
    );
    const record = await this.options.stateStore.getSessionById(normalizedSessionId);

    if (!record) {
      throw new AccountOnboardingSessionNotFoundError(normalizedSessionId);
    }

    return record;
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

  private async markExpiredIfNeeded(
    record: AccountOnboardingSessionRecord,
  ): Promise<AccountOnboardingSessionRecord> {
    if (
      record.sessionStatus === "consumed" ||
      record.sessionStatus === "expired" ||
      record.sessionStatus === "canceled"
    ) {
      return record;
    }

    if (!isTimestampExpired(record.expiresAt, this.now().toISOString())) {
      return record;
    }

    const expiredRecord: AccountOnboardingSessionRecord = {
      ...record,
      sessionStatus: "expired",
      sessionStatusReason: "Onboarding session expired.",
      updatedAt: this.now().toISOString(),
    };
    await this.options.stateStore.saveSession(expiredRecord);

    return expiredRecord;
  }

  private async readJsonSecret(secretRef: string | null): Promise<JsonObject> {
    if (!secretRef) {
      return {};
    }

    const payload = await this.options.secretStore.readSecret<JsonObject>(secretRef);
    return ensureJsonObject(payload);
  }

  private async readCandidateCredential(
    record: AccountOnboardingSessionRecord,
  ): Promise<ActiveCredentialSecret> {
    if (!record.candidateCredentialRef) {
      throw new AccountOnboardingOperationConflictError(
        "Candidate credential is not available for this session.",
      );
    }

    const credential =
      await this.options.secretStore.readSecret<ActiveCredentialSecret>(
        record.candidateCredentialRef,
      );

    return {
      credentialType: ensureNonEmptyString(
        credential.credentialType,
        "Candidate credential type is invalid.",
      ),
      payload: ensureJsonObject(credential.payload),
      expiresAt:
        typeof credential.expiresAt === "string" ? credential.expiresAt : null,
    };
  }

  private async consumeSession(
    record: AccountOnboardingSessionRecord,
    finalDisposition: AccountOnboardingFinalDisposition,
    targetAccountId: string,
    consumedAt: string,
  ): Promise<AccountOnboardingSessionRecord> {
    const consumedRecord: AccountOnboardingSessionRecord = {
      ...record,
      inputPayloadRef: null,
      platformSessionPayloadRef: null,
      candidateCredentialType: null,
      candidateCredentialRef: null,
      sessionStatus: "consumed",
      sessionStatusReason: `Onboarding session finalized as ${finalDisposition}.`,
      finalDisposition,
      targetAccountId,
      consumedAt,
      updatedAt: consumedAt,
    };

    await this.options.stateStore.saveSession(consumedRecord);
    await this.deleteSecretIfPresent(record.inputPayloadRef);
    await this.deleteSecretIfPresent(record.platformSessionPayloadRef);
    await this.deleteSecretIfPresent(record.candidateCredentialRef);

    return consumedRecord;
  }

  private async deleteSecretIfPresent(secretRef: string | null): Promise<void> {
    if (!secretRef) {
      return;
    }

    await this.options.secretStore.deleteSecret(secretRef);
  }

  private async deleteSecretIfReplaced(
    previousSecretRef: string | null,
    nextSecretRef: string | null,
  ): Promise<void> {
    if (!previousSecretRef || previousSecretRef === nextSecretRef) {
      return;
    }

    await this.options.secretStore.deleteSecret(previousSecretRef);
  }
}

export function toSessionDetail(
  record: AccountOnboardingSessionRecord,
): AccountOnboardingSessionDetail {
  return {
    sessionId: record.sessionId,
    platform: record.platform,
    authorizationMethod: record.authorizationMethod,
    expectedCredentialType: record.expectedCredentialType,
    sessionStatus: record.sessionStatus,
    sessionStatusReason: record.sessionStatusReason,
    challenge: record.challenge ? { ...record.challenge } : null,
    resolvedIdentity: toResolvedIdentity(record),
    resolvedProfile: toResolvedProfile(record),
    hasCandidateCredential: Boolean(
      record.candidateCredentialRef && record.candidateCredentialType,
    ),
    candidateCredentialType: record.candidateCredentialType,
    finalDisposition: record.finalDisposition,
    targetAccountId: record.targetAccountId,
    expiresAt: record.expiresAt,
    consumedAt: record.consumedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toResolvedIdentity(
  record: AccountOnboardingSessionRecord,
): AccountOnboardingResolvedIdentity | null {
  if (!record.resolvedPlatformAccountUid) {
    return null;
  }

  return {
    platform: record.platform,
    platformAccountUid: record.resolvedPlatformAccountUid,
  };
}

function toResolvedProfile(
  record: AccountOnboardingSessionRecord,
): AccountOnboardingResolvedProfile | null {
  if (!record.resolvedDisplayName && !hasKeys(record.resolvedProfile)) {
    return null;
  }

  return {
    displayName: record.resolvedDisplayName,
    platformMetadata: { ...record.resolvedProfile },
  };
}

function normalizeStartInput(input: StartAccountOnboardingSessionInput) {
  return {
    platform: normalizeRequiredCode(input.platform, "Platform is required."),
    authorizationMethod: normalizeRequiredCode(
      input.authorizationMethod,
      "Authorization method is required.",
    ),
    expectedCredentialType: normalizeOptionalCode(input.expectedCredentialType),
    payload: ensureJsonObject(input.payload),
    expiresAt: normalizeOptionalTimestamp(input.expiresAt),
  };
}

function normalizeResolveInput(input: ResolveAccountOnboardingSessionInput) {
  return {
    resolutionPayload: ensureJsonObject(input.resolutionPayload),
  };
}

function isSuccessfulResolution(
  resolution: AccountPlatformAuthorizationVerifyResult,
): resolution is AccountPlatformAuthorizationVerifyResult & {
  resolvedIdentity: { platform: string; platformAccountUid: string };
  credential: { credentialType: string; payload: JsonObject; expiresAt: string | null };
} {
  return (
    resolution.verificationResult === "succeeded" &&
    resolution.resolvedIdentity !== null &&
    resolution.credential !== null
  );
}

function deriveResolutionFailureReason(
  resolution: AccountPlatformAuthorizationVerifyResult,
): string | null {
  return resolution.reason;
}

function deriveOnboardingIdentityConflictReason(
  platform: string,
  resolvedIdentity: { platform: string; platformAccountUid: string } | null,
): string | null {
  if (!resolvedIdentity) {
    return null;
  }

  if (normalizeOptionalCode(resolvedIdentity.platform) !== platform) {
    return "Onboarding session resolved a different platform identity.";
  }

  return null;
}

function buildCreatedAccountRecord({
  accountId,
  onboardingRecord,
  credentialRef,
  credentialExpiresAt,
  finalizedAt,
}: {
  accountId: string;
  onboardingRecord: AccountOnboardingSessionRecord;
  credentialRef: string;
  credentialExpiresAt: string | null;
  finalizedAt: string;
}): PlatformAccountRecord {
  return {
    accountId,
    platform: onboardingRecord.platform,
    platformAccountUid: onboardingRecord.resolvedPlatformAccountUid!,
    displayName:
      onboardingRecord.resolvedDisplayName ??
      onboardingRecord.resolvedPlatformAccountUid!,
    remark: null,
    tags: [],
    platformMetadata: { ...onboardingRecord.resolvedProfile },
    lifecycleStatus: "active",
    authorizationStatus: "authorized",
    authorizationStatusReason: "Onboarding session finalized successfully.",
    availabilityStatus: "unknown",
    availabilityStatusReason:
      "Availability must be rechecked after onboarding credential activation.",
    activeCredentialType: onboardingRecord.candidateCredentialType!,
    activeCredentialRef: credentialRef,
    activeCredentialExpiresAt: credentialExpiresAt,
    activeCredentialUpdatedAt: finalizedAt,
    authorizationAttemptId: null,
    authorizationAttemptMethod: null,
    authorizationAttemptExpectedCredentialType: null,
    authorizationAttemptPayloadRef: null,
    authorizationAttemptStatus: null,
    authorizationAttemptStatusReason: null,
    authorizationAttemptExpiresAt: null,
    authorizationAttemptCreatedAt: null,
    authorizationAttemptUpdatedAt: null,
    lastAuthorizedAt: finalizedAt,
    lastAvailabilityCheckedAt: null,
    deletedAt: null,
    createdAt: finalizedAt,
    updatedAt: finalizedAt,
  };
}

function buildRestoredAccountRecord({
  existingAccount,
  onboardingRecord,
  credentialRef,
  credentialExpiresAt,
  finalizedAt,
}: {
  existingAccount: PlatformAccountRecord;
  onboardingRecord: AccountOnboardingSessionRecord;
  credentialRef: string;
  credentialExpiresAt: string | null;
  finalizedAt: string;
}): PlatformAccountRecord {
  return {
    ...existingAccount,
    platform: onboardingRecord.platform,
    platformAccountUid: onboardingRecord.resolvedPlatformAccountUid!,
    displayName:
      onboardingRecord.resolvedDisplayName ?? existingAccount.displayName,
    platformMetadata: {
      ...existingAccount.platformMetadata,
      ...onboardingRecord.resolvedProfile,
    },
    lifecycleStatus: "active",
    authorizationStatus: "authorized",
    authorizationStatusReason: "Onboarding session finalized successfully.",
    availabilityStatus: "unknown",
    availabilityStatusReason:
      "Availability must be rechecked after onboarding credential activation.",
    activeCredentialType: onboardingRecord.candidateCredentialType!,
    activeCredentialRef: credentialRef,
    activeCredentialExpiresAt: credentialExpiresAt,
    activeCredentialUpdatedAt: finalizedAt,
    authorizationAttemptId: null,
    authorizationAttemptMethod: null,
    authorizationAttemptExpectedCredentialType: null,
    authorizationAttemptPayloadRef: null,
    authorizationAttemptStatus: null,
    authorizationAttemptStatusReason: null,
    authorizationAttemptExpiresAt: null,
    authorizationAttemptCreatedAt: null,
    authorizationAttemptUpdatedAt: null,
    lastAuthorizedAt: finalizedAt,
    deletedAt: null,
    updatedAt: finalizedAt,
  };
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

function normalizeOptionalDisplayName(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return ensureNonEmptyString(value, "Expected a non-empty display name.");
}

function normalizeNullableJsonObject(value: unknown): JsonObject | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return { ...(value as JsonObject) };
}

function ensureJsonObject(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return { ...(value as JsonObject) };
}

function hasKeys(value: JsonObject | null | undefined): boolean {
  return Boolean(value && Object.keys(value).length > 0);
}

function normalizeOptionalTimestamp(value: unknown): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  if (typeof value !== "string" || Number.isNaN(Date.parse(value))) {
    throw new AccountValidationError("Expected a valid ISO date-time string.");
  }

  return value;
}

function isTimestampExpired(expiresAt: string | null, now: string): boolean {
  if (!expiresAt) {
    return false;
  }

  return Date.parse(expiresAt) < Date.parse(now);
}

function createOnboardingInputSecretRef(sessionId: string): string {
  return `onboarding-sessions/${sessionId}/input.json`;
}

function createOnboardingSessionPayloadSecretRef(sessionId: string): string {
  return `onboarding-sessions/${sessionId}/session-payload.json`;
}

function createOnboardingCandidateCredentialSecretRef(sessionId: string): string {
  return `onboarding-sessions/${sessionId}/candidate-credential.json`;
}

function createAccountCredentialSecretRef(
  accountId: string,
  sessionId: string,
): string {
  return `${accountId}/credentials/onboarding-${sessionId}.json`;
}
