import { randomUUID } from "node:crypto";

import { createAccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountConnectionAttemptStateStore } from "../../ports/account-connection-attempt-state-store-port.js";
import type { AccountPlatformPort } from "../../ports/account-platform-port.js";
import type { AccountSecretStore } from "../../ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../ports/account-state-store-port.js";
import {
  AccountConnectionAttemptNotFoundError,
  AccountNotFoundError,
  AccountOperationConflictError,
  AccountPlatformUnavailableError,
  AccountValidationError,
} from "../accounts/errors.js";
import { toAccountDetail, toAccountPlatformSnapshot } from "../accounts/model.js";
import type {
  AccountRecord,
  ConnectionMethod,
  JsonObject,
  LoginStatus,
  StoredTokenSecret,
} from "../accounts/types.js";
import {
  isAttemptTerminal,
  toConnectionAttemptDetail,
  toConnectionAttemptLogsResponse,
} from "./model.js";
import type {
  AccountConnectionAttemptDetail,
  AccountConnectionAttemptRecord,
  ConnectionAttemptLogEntry,
  ConnectionAttemptLogsResponse,
  ResolveConnectionAttemptInput,
  StartConnectionAttemptInput,
  ValidateConnectionAttemptInput,
  ValidateConnectionAttemptResponse,
} from "./types.js";

interface StoredAttemptLogs {
  entries: ConnectionAttemptLogEntry[];
}

export interface AccountConnectionAttemptServiceOptions {
  accountStateStore: AccountStateStore;
  attemptStateStore: AccountConnectionAttemptStateStore;
  secretStore: AccountSecretStore;
  platforms?: Iterable<AccountPlatformPort>;
  now?: () => Date;
  createAttemptId?: () => string;
}

export class AccountConnectionAttemptService {
  private readonly platformRegistry: AccountPlatformRegistry;
  private readonly now: () => Date;
  private readonly createAttemptId: () => string;

  constructor(private readonly options: AccountConnectionAttemptServiceOptions) {
    this.platformRegistry = createAccountPlatformRegistry(options.platforms ?? []);
    this.now = options.now ?? (() => new Date());
    this.createAttemptId = options.createAttemptId ?? (() => randomUUID());
  }

  async startConnectionAttempt(
    accountId: string,
    input: StartConnectionAttemptInput,
  ): Promise<AccountConnectionAttemptDetail> {
    const account = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeStartConnectionAttemptInput(input);

    if (account.lifecycleStatus === "deleted") {
      throw new AccountOperationConflictError(
        "Deleted accounts cannot start connection attempts.",
      );
    }

    const platform = this.getPlatform(account.platform);
    const attemptId = this.createAttemptId();
    const timestamp = this.now().toISOString();
    const startResult = await platform.startConnectionAttempt({
      account: toAccountPlatformSnapshot(account),
      connectionMethod: normalizedInput.connectionMethod,
      tokenValue: normalizedInput.tokenValue,
      context: normalizedInput.context,
      requestedExpiresAt: normalizedInput.expiresAt,
    });
    const inputTokenRef =
      normalizedInput.connectionMethod === "manual_token"
        ? createInputTokenRef(account.accountId, attemptId)
        : null;
    const platformSessionRef = startResult.platformSession
      ? createPlatformSessionRef(account.accountId, attemptId)
      : null;
    const candidateTokenRef = startResult.candidateToken
      ? createCandidateTokenRef(account.accountId, attemptId)
      : null;
    const logRef =
      startResult.logs.length > 0
        ? createAttemptLogRef(account.accountId, attemptId)
        : null;

    try {
      if (inputTokenRef && normalizedInput.tokenValue) {
        await this.options.secretStore.writeSecret(inputTokenRef, {
          payload: { token: normalizedInput.tokenValue },
          expiresAt: startResult.expiresAt ?? normalizedInput.expiresAt,
        } satisfies StoredTokenSecret);
      }

      if (platformSessionRef && startResult.platformSession) {
        await this.options.secretStore.writeSecret(
          platformSessionRef,
          startResult.platformSession,
        );
      }

      if (candidateTokenRef && startResult.candidateToken) {
        await this.options.secretStore.writeSecret(candidateTokenRef, {
          payload: startResult.candidateToken,
          expiresAt: startResult.expiresAt ?? normalizedInput.expiresAt,
        } satisfies StoredTokenSecret);
      }

      if (logRef) {
        await this.writeLogs(logRef, startResult.logs);
      }

      const attemptRecord: AccountConnectionAttemptRecord = {
        attemptId,
        accountId: account.accountId,
        platform: account.platform,
        connectionMethod: normalizedInput.connectionMethod,
        attemptStatus: candidateTokenRef
          ? "ready_for_validation"
          : "pending_resolution",
        attemptStatusReason: candidateTokenRef
          ? "Candidate token is ready for validation."
          : "Waiting for token material to be resolved.",
        challenge: startResult.challenge,
        inputTokenRef,
        platformSessionRef,
        candidateTokenRef,
        resolvedPlatformAccountUid: null,
        resolvedDisplayName: null,
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
        logRef,
        expiresAt: startResult.expiresAt ?? normalizedInput.expiresAt,
        validatedAt: null,
        appliedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await this.options.attemptStateStore.createAttempt(attemptRecord);

      const nextLoginStatus = deriveLoginStatusAfterAttemptStarted(account);

      if (
        nextLoginStatus !== account.loginStatus ||
        (nextLoginStatus === "connecting" && account.loginStatusReason !== null)
      ) {
        await this.options.accountStateStore.saveAccount({
          ...account,
          loginStatus: nextLoginStatus,
          loginStatusReason: nextLoginStatus === "connecting" ? null : account.loginStatusReason,
          updatedAt: timestamp,
        });
      }

      return toConnectionAttemptDetail(attemptRecord);
    } catch (error) {
      await this.deleteSecretIfPresent(inputTokenRef);
      await this.deleteSecretIfPresent(platformSessionRef);
      await this.deleteSecretIfPresent(candidateTokenRef);
      await this.deleteSecretIfPresent(logRef);
      throw error;
    }
  }

  async getConnectionAttempt(
    accountId: string,
    attemptId: string,
  ): Promise<AccountConnectionAttemptDetail> {
    const attempt = await this.getAttemptRecord(accountId, attemptId);
    return toConnectionAttemptDetail(attempt);
  }

  async resolveConnectionAttempt(
    accountId: string,
    attemptId: string,
    input: ResolveConnectionAttemptInput,
  ): Promise<AccountConnectionAttemptDetail> {
    const account = await this.getAccountRecord(accountId);
    const attempt = await this.getAttemptRecord(account.accountId, attemptId);
    const normalizedInput = normalizeResolveConnectionAttemptInput(input);

    if (attempt.attemptStatus !== "pending_resolution") {
      throw new AccountOperationConflictError(
        "Only pending-resolution attempts can be resolved.",
      );
    }

    const platform = this.getPlatform(account.platform);
    const result = await platform.resolveConnectionAttempt({
      account: toAccountPlatformSnapshot(account),
      connectionMethod: attempt.connectionMethod,
      context: await this.readJsonObjectSecret(attempt.platformSessionRef),
      platformSession: await this.readJsonObjectSecret(attempt.platformSessionRef),
      resolutionPayload: normalizedInput.resolutionPayload,
    });
    const resolvedAt = this.now().toISOString();
    const platformSessionRef =
      attempt.platformSessionRef ??
      (result.platformSession
        ? createPlatformSessionRef(account.accountId, attempt.attemptId)
        : null);
    const candidateTokenRef =
      attempt.candidateTokenRef ??
      (result.candidateToken
        ? createCandidateTokenRef(account.accountId, attempt.attemptId)
        : null);
    const logRef =
      attempt.logRef ??
      (result.logs.length > 0
        ? createAttemptLogRef(account.accountId, attempt.attemptId)
        : null);

    if (platformSessionRef && result.platformSession) {
      await this.options.secretStore.writeSecret(platformSessionRef, result.platformSession);
    }

    if (candidateTokenRef && result.candidateToken) {
      await this.options.secretStore.writeSecret(candidateTokenRef, {
        payload: result.candidateToken,
        expiresAt: result.expiresAt ?? attempt.expiresAt,
      } satisfies StoredTokenSecret);
    }

    if (logRef) {
      await this.appendLogs(logRef, result.logs);
    }

    const updatedAttempt: AccountConnectionAttemptRecord = {
      ...attempt,
      attemptStatus: candidateTokenRef
        ? "ready_for_validation"
        : "pending_resolution",
      attemptStatusReason:
        result.reason ??
        (candidateTokenRef
          ? "Candidate token is ready for validation."
          : "Waiting for token material to be resolved."),
      platformSessionRef,
      candidateTokenRef,
      logRef,
      expiresAt: result.expiresAt ?? attempt.expiresAt,
      updatedAt: resolvedAt,
    };

    await this.options.attemptStateStore.saveAttempt(updatedAttempt);

    return toConnectionAttemptDetail(updatedAttempt);
  }

  async validateConnectionAttempt(
    accountId: string,
    attemptId: string,
    input: ValidateConnectionAttemptInput,
  ): Promise<ValidateConnectionAttemptResponse> {
    const account = await this.getAccountRecord(accountId);
    const attempt = await this.getAttemptRecord(account.accountId, attemptId);
    const normalizedInput = normalizeValidateConnectionAttemptInput(input);

    if (attempt.attemptStatus !== "ready_for_validation") {
      throw new AccountOperationConflictError(
        "Only ready-for-validation attempts can be validated.",
      );
    }

    if (attempt.candidateTokenRef === null) {
      throw new AccountOperationConflictError(
        "Connection attempt has no candidate token to validate.",
      );
    }

    const platform = this.getPlatform(account.platform);
    const candidateToken = await this.readStoredToken(attempt.candidateTokenRef);
    const validatingAt = this.now().toISOString();
    const validatingAttempt: AccountConnectionAttemptRecord = {
      ...attempt,
      attemptStatus: "validating",
      attemptStatusReason: null,
      updatedAt: validatingAt,
    };

    await this.options.attemptStateStore.saveAttempt(validatingAttempt);

    const result = await platform.validateConnectionAttempt({
      account: toAccountPlatformSnapshot(account),
      connectionMethod: attempt.connectionMethod,
      candidateToken: candidateToken.payload,
      context: await this.readJsonObjectSecret(attempt.platformSessionRef),
      validationPayload: normalizedInput.validationPayload,
    });
    const validatedAt = this.now().toISOString();
    const logRef =
      validatingAttempt.logRef ??
      (result.logs.length > 0
        ? createAttemptLogRef(account.accountId, attempt.attemptId)
        : null);

    if (logRef) {
      await this.appendLogs(logRef, result.logs);
    }

    if (
      result.validationResult === "succeeded" &&
      result.token &&
      result.resolvedPlatformProfile
    ) {
      const activeTokenRef = createActiveTokenRef(account.accountId);
      const finalToken: StoredTokenSecret = {
        payload: result.token,
        expiresAt: result.tokenExpiresAt ?? candidateToken.expiresAt,
      };

      await this.options.secretStore.writeSecret(activeTokenRef, finalToken);

      const updatedAccount: AccountRecord = {
        ...account,
        loginStatus: "connected",
        loginStatusReason: result.reason,
        availabilityStatus: "unknown",
        availabilityStatusReason: "Token updated; availability check has not run yet.",
        resolvedPlatformAccountUid:
          result.resolvedPlatformProfile.resolvedPlatformAccountUid,
        resolvedDisplayName: result.resolvedPlatformProfile.resolvedDisplayName,
        resolvedAvatarUrl: result.resolvedPlatformProfile.resolvedAvatarUrl,
        resolvedProfileMetadata: {
          ...result.resolvedPlatformProfile.resolvedProfileMetadata,
        },
        activeTokenRef,
        activeTokenExpiresAt: finalToken.expiresAt,
        activeTokenUpdatedAt: validatedAt,
        lastConnectedAt: validatedAt,
        lastValidatedAt: validatedAt,
        updatedAt: validatedAt,
      };
      const updatedAttempt: AccountConnectionAttemptRecord = {
        ...validatingAttempt,
        attemptStatus: "validation_succeeded",
        attemptStatusReason: result.reason,
        resolvedPlatformAccountUid:
          result.resolvedPlatformProfile.resolvedPlatformAccountUid,
        resolvedDisplayName: result.resolvedPlatformProfile.resolvedDisplayName,
        resolvedAvatarUrl: result.resolvedPlatformProfile.resolvedAvatarUrl,
        resolvedProfileMetadata: {
          ...result.resolvedPlatformProfile.resolvedProfileMetadata,
        },
        logRef,
        validatedAt,
        appliedAt: validatedAt,
        updatedAt: validatedAt,
      };

      await this.options.accountStateStore.saveAccount(updatedAccount);
      await this.options.attemptStateStore.saveAttempt(updatedAttempt);

      return {
        attemptId: updatedAttempt.attemptId,
        validationResult: result.validationResult,
        validationReason: result.reason,
        tokenApplied: true,
        account: toAccountDetail(updatedAccount, updatedAttempt),
        attempt: toConnectionAttemptDetail(updatedAttempt),
      };
    }

    const updatedAccount: AccountRecord = account.activeTokenRef
      ? {
          ...account,
          lastValidatedAt: validatedAt,
          updatedAt: validatedAt,
        }
      : {
          ...account,
          loginStatus: "login_failed",
          loginStatusReason: result.reason ?? "Token validation failed.",
          lastValidatedAt: validatedAt,
          updatedAt: validatedAt,
        };
    const updatedAttempt: AccountConnectionAttemptRecord = {
      ...validatingAttempt,
      attemptStatus: "validation_failed",
      attemptStatusReason: result.reason ?? "Token validation failed.",
      logRef,
      validatedAt,
      updatedAt: validatedAt,
    };

    await this.options.accountStateStore.saveAccount(updatedAccount);
    await this.options.attemptStateStore.saveAttempt(updatedAttempt);

    return {
      attemptId: updatedAttempt.attemptId,
      validationResult: result.validationResult,
      validationReason: result.reason ?? "Token validation failed.",
      tokenApplied: false,
      account: toAccountDetail(updatedAccount, updatedAttempt),
      attempt: toConnectionAttemptDetail(updatedAttempt),
    };
  }

  async getConnectionAttemptLogs(
    accountId: string,
    attemptId: string,
  ): Promise<ConnectionAttemptLogsResponse> {
    const attempt = await this.getAttemptRecord(accountId, attemptId);
    const entries = attempt.logRef ? await this.readLogs(attempt.logRef) : [];

    return toConnectionAttemptLogsResponse(attempt, entries);
  }

  close(): void {
    this.options.attemptStateStore.close();
  }

  private async getAccountRecord(accountId: string): Promise<AccountRecord> {
    const normalizedAccountId = ensureNonEmptyString(
      accountId,
      "Account ID is required.",
    );
    const record =
      await this.options.accountStateStore.getAccountById(normalizedAccountId);

    if (!record) {
      throw new AccountNotFoundError(normalizedAccountId);
    }

    return this.refreshAccountRuntimeState(record);
  }

  private async getAttemptRecord(
    accountId: string,
    attemptId: string,
  ): Promise<AccountConnectionAttemptRecord> {
    const normalizedAttemptId = ensureNonEmptyString(
      attemptId,
      "Attempt ID is required.",
    );
    const record = await this.options.attemptStateStore.getAttemptById(
      accountId,
      normalizedAttemptId,
    );

    if (!record) {
      throw new AccountConnectionAttemptNotFoundError(accountId, normalizedAttemptId);
    }

    return this.refreshAttemptRuntimeState(record);
  }

  private async refreshAccountRuntimeState(
    record: AccountRecord,
  ): Promise<AccountRecord> {
    const nowIso = this.now().toISOString();
    let nextRecord = record;

    if (record.loginStatus === "connected" && record.activeTokenRef === null) {
      nextRecord = {
        ...nextRecord,
        loginStatus: "not_logged_in",
        loginStatusReason: "No active token is currently applied.",
        updatedAt: nowIso,
      };
    }

    if (
      nextRecord.loginStatus === "connected" &&
      nextRecord.activeTokenExpiresAt !== null &&
      nextRecord.activeTokenExpiresAt <= nowIso
    ) {
      nextRecord = {
        ...nextRecord,
        loginStatus: "expired",
        loginStatusReason: "Active token expired.",
        updatedAt: nowIso,
      };
    }

    if (nextRecord !== record) {
      await this.options.accountStateStore.saveAccount(nextRecord);
    }

    return nextRecord;
  }

  private async refreshAttemptRuntimeState(
    record: AccountConnectionAttemptRecord,
  ): Promise<AccountConnectionAttemptRecord> {
    if (isAttemptTerminal(record) || record.expiresAt === null) {
      return record;
    }

    const nowIso = this.now().toISOString();

    if (record.expiresAt > nowIso) {
      return record;
    }

    const expiredRecord: AccountConnectionAttemptRecord = {
      ...record,
      attemptStatus: "expired",
      attemptStatusReason: "Connection attempt expired.",
      updatedAt: nowIso,
    };

    await this.options.attemptStateStore.saveAttempt(expiredRecord);

    return expiredRecord;
  }

  private getPlatform(platformCode: string): AccountPlatformPort {
    const platform = this.platformRegistry.resolve(platformCode);

    if (!platform) {
      throw new AccountPlatformUnavailableError(
        `Platform "${platformCode}" is not configured.`,
      );
    }

    return platform;
  }

  private async readJsonObjectSecret(secretRef: string | null): Promise<JsonObject> {
    if (!secretRef) {
      return {};
    }

    try {
      const payload = await this.options.secretStore.readSecret<unknown>(secretRef);
      return ensureJsonObject(payload, "Expected a JSON object.");
    } catch {
      return {};
    }
  }

  private async readStoredToken(secretRef: string): Promise<StoredTokenSecret> {
    try {
      return await this.options.secretStore.readSecret<StoredTokenSecret>(secretRef);
    } catch {
      throw new AccountOperationConflictError(
        `Token material referenced by "${secretRef}" is missing.`,
      );
    }
  }

  private async readLogs(secretRef: string): Promise<ConnectionAttemptLogEntry[]> {
    try {
      const stored = await this.options.secretStore.readSecret<StoredAttemptLogs>(
        secretRef,
      );
      return Array.isArray(stored.entries) ? stored.entries : [];
    } catch {
      return [];
    }
  }

  private async writeLogs(
    secretRef: string,
    entries: ConnectionAttemptLogEntry[],
  ): Promise<void> {
    await this.options.secretStore.writeSecret(secretRef, {
      entries,
    } satisfies StoredAttemptLogs);
  }

  private async appendLogs(
    secretRef: string,
    entries: ConnectionAttemptLogEntry[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const currentEntries = await this.readLogs(secretRef);

    await this.writeLogs(secretRef, [...currentEntries, ...entries]);
  }

  private async deleteSecretIfPresent(secretRef: string | null): Promise<void> {
    if (!secretRef) {
      return;
    }

    try {
      await this.options.secretStore.deleteSecret(secretRef);
    } catch {
      // Ignore cleanup failures during rollback.
    }
  }
}

function normalizeStartConnectionAttemptInput(
  input: StartConnectionAttemptInput,
): Required<StartConnectionAttemptInput> {
  const connectionMethod = ensureConnectionMethod(input.connectionMethod);
  const tokenValue = normalizeNullableString(input.tokenValue);

  if (connectionMethod === "manual_token" && tokenValue === null) {
    throw new AccountValidationError(
      "Manual token attempts require tokenValue.",
    );
  }

  return {
    connectionMethod,
    tokenValue,
    context: input.context ? ensureJsonObject(input.context, "Expected context to be a JSON object.") : {},
    expiresAt: normalizeNullableString(input.expiresAt),
  };
}

function normalizeResolveConnectionAttemptInput(
  input: ResolveConnectionAttemptInput,
): { resolutionPayload: JsonObject } {
  return {
    resolutionPayload: input.resolutionPayload
      ? ensureJsonObject(
          input.resolutionPayload,
          "Expected resolutionPayload to be a JSON object.",
        )
      : {},
  };
}

function normalizeValidateConnectionAttemptInput(
  input: ValidateConnectionAttemptInput,
): { validationPayload: JsonObject } {
  return {
    validationPayload: input.validationPayload
      ? ensureJsonObject(
          input.validationPayload,
          "Expected validationPayload to be a JSON object.",
        )
      : {},
  };
}

function deriveLoginStatusAfterAttemptStarted(account: AccountRecord): LoginStatus {
  return account.activeTokenRef ? account.loginStatus : "connecting";
}

function createInputTokenRef(accountId: string, attemptId: string): string {
  return `accounts/${accountId}/connection-attempts/${attemptId}/input-token.json`;
}

function createPlatformSessionRef(accountId: string, attemptId: string): string {
  return `accounts/${accountId}/connection-attempts/${attemptId}/platform-session.json`;
}

function createCandidateTokenRef(accountId: string, attemptId: string): string {
  return `accounts/${accountId}/connection-attempts/${attemptId}/candidate-token.json`;
}

function createAttemptLogRef(accountId: string, attemptId: string): string {
  return `accounts/${accountId}/connection-attempts/${attemptId}/logs.json`;
}

function createActiveTokenRef(accountId: string): string {
  return `accounts/${accountId}/active-token.json`;
}

function ensureConnectionMethod(value: string): ConnectionMethod {
  if (value === "manual_token" || value === "qr_login") {
    return value;
  }

  throw new AccountValidationError(`Unsupported connection method "${value}".`);
}

function ensureJsonObject(value: unknown, message: string): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new AccountValidationError(message);
  }

  return { ...(value as JsonObject) };
}

function normalizeNullableString(value: string | null | undefined): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
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
