import { randomUUID } from "node:crypto";

import { createAccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountPlatformRegistry } from "../../adapters/platform/account-platform-registry.js";
import type { AccountAccessSessionStateStore } from "../../ports/account-access-session-state-store-port.js";
import type { AccountPlatformPort } from "../../ports/account-platform-port.js";
import type { AccountSecretStore } from "../../ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../ports/account-state-store-port.js";
import {
  AccountAccessSessionNotFoundError,
  AccountNotFoundError,
  AccountOperationConflictError,
  AccountPlatformUnavailableError,
  AccountValidationError,
} from "../accounts/errors.js";
import { toAccountDetail, toResolvedPlatformProfile } from "../accounts/model.js";
import type {
  AccountRecord,
  AccessMode,
  JsonObject,
  StoredCredentialSecret,
} from "../accounts/types.js";
import {
  isAccessSessionTerminal,
  toAccessSessionDetail,
  toAccessSessionLogsResponse,
} from "./model.js";
import type {
  AccountAccessSessionDetail,
  AccountAccessSessionRecord,
  AccessSessionLogEntry,
  AccessSessionLogsResponse,
  PollAccessSessionInput,
  StartManualAccessSessionInput,
  StartQrAccessSessionInput,
  VerifyAccessSessionResponse,
  VerifyAccessSessionInput,
} from "./types.js";

interface StoredAccessSessionLogs {
  entries: AccessSessionLogEntry[];
}

export interface AccountAccessSessionServiceOptions {
  accountStateStore: AccountStateStore;
  sessionStateStore: AccountAccessSessionStateStore;
  secretStore: AccountSecretStore;
  platforms?: Iterable<AccountPlatformPort>;
  now?: () => Date;
  createSessionId?: () => string;
}

export class AccountAccessSessionService {
  private readonly platformRegistry: AccountPlatformRegistry;
  private readonly now: () => Date;
  private readonly createSessionId: () => string;

  constructor(private readonly options: AccountAccessSessionServiceOptions) {
    this.platformRegistry = createAccountPlatformRegistry(options.platforms ?? []);
    this.now = options.now ?? (() => new Date());
    this.createSessionId = options.createSessionId ?? (() => randomUUID());
  }

  async startManualAccessSession(
    accountId: string,
    input: StartManualAccessSessionInput,
  ): Promise<AccountAccessSessionDetail> {
    const account = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeStartManualAccessSessionInput(input);
    await this.cancelOpenSessions(account.accountId);

    const sessionId = this.createSessionId();
    const timestamp = this.now().toISOString();
    const candidateCredentialRef = createCandidateCredentialRef(
      account.accountId,
      sessionId,
    );
    const logRef = createSessionLogRef(account.accountId, sessionId);

    await this.options.secretStore.writeSecret(candidateCredentialRef, {
      payload: {
        token: normalizedInput.token,
      },
      expiresAt: normalizedInput.expiresAt,
    } satisfies StoredCredentialSecret);
    await this.writeLogs(logRef, [createLog("info", "manual token received")]);

    const sessionRecord: AccountAccessSessionRecord = {
      sessionId,
      accountId: account.accountId,
      platform: account.platform,
      accessMode: "manual_token",
      sessionStatus: "ready_for_verification",
      sessionStatusReason: "Candidate credential is ready for verification.",
      challenge: null,
      platformSessionRef: null,
      candidateCredentialRef: candidateCredentialRef,
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedAvatarUrl: null,
      resolvedProfileMetadata: {},
      logRef,
      expiresAt: normalizedInput.expiresAt,
      verifiedAt: null,
      appliedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.options.sessionStateStore.createSession(sessionRecord);
    await this.options.accountStateStore.saveAccount({
      ...account,
      connectionStatus: "connecting",
      connectionStatusReason: "Credential is waiting for verification.",
      updatedAt: timestamp,
    });

    return toAccessSessionDetail(sessionRecord);
  }

  async startQrAccessSession(
    accountId: string,
    input: StartQrAccessSessionInput,
  ): Promise<AccountAccessSessionDetail> {
    const account = await this.getAccountRecord(accountId);
    const normalizedInput = normalizeStartQrAccessSessionInput(input);
    const requestedExpiresAt =
      normalizedInput.expiresAt ?? createDefaultQrSessionExpiresAt(this.now);
    await this.cancelOpenSessions(account.accountId);

    const provider = this.getPlatform(account.platform);
    const sessionId = this.createSessionId();
    const timestamp = this.now().toISOString();
    const result = await provider.startQrSession({
      account: toAccountPlatformSnapshot(account),
      requestedExpiresAt,
    });

    const providerSessionRef = result.providerSession
      ? createProviderSessionRef(account.accountId, sessionId)
      : null;
    const logRef = createSessionLogRef(account.accountId, sessionId);

    if (providerSessionRef && result.providerSession) {
      await this.options.secretStore.writeSecret(
        providerSessionRef,
        result.providerSession,
      );
    }
    await this.writeLogs(logRef, result.logs);

    const sessionRecord: AccountAccessSessionRecord = {
      sessionId,
      accountId: account.accountId,
      platform: account.platform,
      accessMode: "qr_login",
      sessionStatus: "waiting_for_scan",
      sessionStatusReason: "QR challenge created. Waiting for scan.",
      challenge: result.challenge,
      platformSessionRef: providerSessionRef,
      candidateCredentialRef: null,
      resolvedPlatformAccountUid: null,
      resolvedDisplayName: null,
      resolvedAvatarUrl: null,
      resolvedProfileMetadata: {},
      logRef,
      expiresAt: result.expiresAt ?? requestedExpiresAt,
      verifiedAt: null,
      appliedAt: null,
      createdAt: timestamp,
      updatedAt: timestamp,
    };

    await this.options.sessionStateStore.createSession(sessionRecord);
    await this.options.accountStateStore.saveAccount({
      ...account,
      connectionStatus: "connecting",
      connectionStatusReason: "QR login is in progress.",
      updatedAt: timestamp,
    });

    return toAccessSessionDetail(sessionRecord);
  }

  async getAccessSession(
    accountId: string,
    sessionId: string,
  ): Promise<AccountAccessSessionDetail> {
    const sessionRecord = await this.getSessionRecord(accountId, sessionId);
    return toAccessSessionDetail(sessionRecord);
  }

  async pollAccessSession(
    accountId: string,
    sessionId: string,
    _input: PollAccessSessionInput = {},
  ): Promise<AccountAccessSessionDetail> {
    const account = await this.getAccountRecord(accountId);
    const sessionRecord = await this.getSessionRecord(
      account.accountId,
      sessionId,
    );

    if (sessionRecord.accessMode !== "qr_login") {
      throw new AccountOperationConflictError(
        "Only QR access sessions can be polled.",
      );
    }

    if (isAccessSessionTerminal(sessionRecord)) {
      return toAccessSessionDetail(sessionRecord);
    }

    const provider = this.getPlatform(account.platform);
    const result = await provider.pollQrSession({
      account: toAccountPlatformSnapshot(account),
      providerSession: await this.readJsonObjectSecret(
        sessionRecord.platformSessionRef,
      ),
    });
    const polledAt = this.now().toISOString();
    const providerSessionRef =
      sessionRecord.platformSessionRef ??
      (result.providerSession
        ? createProviderSessionRef(account.accountId, sessionRecord.sessionId)
        : null);
    const candidateCredentialRef =
      sessionRecord.candidateCredentialRef ??
      (result.candidateCredential
        ? createCandidateCredentialRef(account.accountId, sessionRecord.sessionId)
        : null);

    if (providerSessionRef && result.providerSession) {
      await this.options.secretStore.writeSecret(
        providerSessionRef,
        result.providerSession,
      );
    }
    if (candidateCredentialRef && result.candidateCredential) {
      await this.options.secretStore.writeSecret(candidateCredentialRef, {
        payload: result.candidateCredential,
        expiresAt: result.candidateCredentialExpiresAt ?? null,
      } satisfies StoredCredentialSecret);
    }
    if (sessionRecord.logRef) {
      await this.appendLogs(sessionRecord.logRef, result.logs);
    }

    const updatedSession: AccountAccessSessionRecord = {
      ...sessionRecord,
      sessionStatus: mapProgressStatus(result.progressStatus),
      sessionStatusReason:
        result.reason ?? defaultReasonForProgress(result.progressStatus),
      platformSessionRef: providerSessionRef,
      candidateCredentialRef: candidateCredentialRef,
      expiresAt: result.expiresAt ?? sessionRecord.expiresAt,
      updatedAt: polledAt,
    };

    await this.options.sessionStateStore.saveSession(updatedSession);
    return toAccessSessionDetail(updatedSession);
  }

  async verifyAccessSession(
    accountId: string,
    sessionId: string,
    _input: VerifyAccessSessionInput = {},
  ): Promise<VerifyAccessSessionResponse> {
    const account = await this.getAccountRecord(accountId);
    const sessionRecord = await this.getSessionRecord(account.accountId, sessionId);

    if (sessionRecord.sessionStatus !== "ready_for_verification") {
      throw new AccountOperationConflictError(
        "Only ready-for-verification sessions can be verified.",
      );
    }

    if (sessionRecord.candidateCredentialRef === null) {
      throw new AccountOperationConflictError(
        "Access session has no candidate credential to verify.",
      );
    }

    const provider = this.getPlatform(account.platform);
    const candidateCredential = await this.readStoredCredential(
      sessionRecord.candidateCredentialRef,
    );
    const verifyingAt = this.now().toISOString();
    const verifyingSession: AccountAccessSessionRecord = {
      ...sessionRecord,
      sessionStatus: "verifying",
      sessionStatusReason: null,
      updatedAt: verifyingAt,
    };

    await this.options.sessionStateStore.saveSession(verifyingSession);

    const result = await provider.verifyCredential({
      account: toAccountPlatformSnapshot(account),
      accessMode: sessionRecord.accessMode,
      candidateCredential: candidateCredential.payload,
      providerSession: await this.readJsonObjectSecret(
        sessionRecord.platformSessionRef,
      ),
    });
    const verifiedAt = this.now().toISOString();

    if (verifyingSession.logRef) {
      await this.appendLogs(verifyingSession.logRef, result.logs);
    }

    if (
      result.verificationResult === "succeeded" &&
      result.credential &&
      result.resolvedPlatformProfile
    ) {
      const activeCredentialRef = createActiveCredentialRef(account.accountId);
      const finalCredential: StoredCredentialSecret = {
        payload: result.credential,
        expiresAt: result.credentialExpiresAt ?? candidateCredential.expiresAt,
      };

      await this.options.secretStore.writeSecret(activeCredentialRef, finalCredential);

      const updatedAccount: AccountRecord = {
        ...account,
        connectionStatus: "connected",
        connectionStatusReason: result.reason,
        availabilityStatus: "unknown",
        availabilityStatusReason: "Credential updated; availability has not been checked.",
        resolvedPlatformAccountUid:
          result.resolvedPlatformProfile.resolvedPlatformAccountUid,
        resolvedDisplayName: result.resolvedPlatformProfile.resolvedDisplayName,
        resolvedAvatarUrl: result.resolvedPlatformProfile.resolvedAvatarUrl,
        resolvedProfileMetadata: {
          ...result.resolvedPlatformProfile.resolvedProfileMetadata,
        },
        activeCredentialRef,
        activeCredentialExpiresAt: finalCredential.expiresAt,
        activeCredentialUpdatedAt: verifiedAt,
        lastConnectedAt: verifiedAt,
        lastVerifiedAt: verifiedAt,
        updatedAt: verifiedAt,
      };
      const updatedSession: AccountAccessSessionRecord = {
        ...verifyingSession,
        sessionStatus: "verified",
        sessionStatusReason: result.reason,
        resolvedPlatformAccountUid:
          result.resolvedPlatformProfile.resolvedPlatformAccountUid,
        resolvedDisplayName: result.resolvedPlatformProfile.resolvedDisplayName,
        resolvedAvatarUrl: result.resolvedPlatformProfile.resolvedAvatarUrl,
        resolvedProfileMetadata: {
          ...result.resolvedPlatformProfile.resolvedProfileMetadata,
        },
        verifiedAt: verifiedAt,
        appliedAt: verifiedAt,
        updatedAt: verifiedAt,
      };

      await this.options.accountStateStore.saveAccount(updatedAccount);
      await this.options.sessionStateStore.saveSession(updatedSession);

      return {
        sessionId: updatedSession.sessionId,
        verificationResult: result.verificationResult,
        verificationReason: result.reason,
        credentialApplied: true,
        account: toAccountDetail(updatedAccount, updatedSession),
        session: toAccessSessionDetail(updatedSession),
      };
    }

    const updatedAccount: AccountRecord = account.activeCredentialRef
      ? {
          ...account,
          connectionStatus: "connected",
          connectionStatusReason: account.connectionStatusReason,
          lastVerifiedAt: verifiedAt,
          updatedAt: verifiedAt,
        }
      : {
          ...account,
          connectionStatus: "connect_failed",
          connectionStatusReason: result.reason ?? "Credential verification failed.",
          lastVerifiedAt: verifiedAt,
          updatedAt: verifiedAt,
        };
    const updatedSession: AccountAccessSessionRecord = {
      ...verifyingSession,
      sessionStatus: "verify_failed",
      sessionStatusReason: result.reason ?? "Credential verification failed.",
      verifiedAt: verifiedAt,
      updatedAt: verifiedAt,
    };

    await this.options.accountStateStore.saveAccount(updatedAccount);
    await this.options.sessionStateStore.saveSession(updatedSession);

    return {
      sessionId: updatedSession.sessionId,
      verificationResult: result.verificationResult,
      verificationReason: result.reason ?? "Credential verification failed.",
      credentialApplied: false,
      account: toAccountDetail(updatedAccount, updatedSession),
      session: toAccessSessionDetail(updatedSession),
    };
  }

  async getAccessSessionLogs(
    accountId: string,
    sessionId: string,
  ): Promise<AccessSessionLogsResponse> {
    const sessionRecord = await this.getSessionRecord(accountId, sessionId);
    const entries = sessionRecord.logRef
      ? await this.readLogs(sessionRecord.logRef)
      : [];

    return toAccessSessionLogsResponse(sessionRecord, entries);
  }

  close(): void {
    this.options.sessionStateStore.close();
  }

  private async cancelOpenSessions(accountId: string): Promise<void> {
    const existing = await this.options.sessionStateStore.listSessionsForAccount(
      accountId,
    );
    const canceledAt = this.now().toISOString();

    await Promise.all(
      existing
        .filter((sessionRecord) => !isAccessSessionTerminal(sessionRecord))
        .map((sessionRecord) =>
          this.options.sessionStateStore.saveSession({
            ...sessionRecord,
            sessionStatus: "canceled",
            sessionStatusReason: "Superseded by a newer access session.",
            updatedAt: canceledAt,
          }),
        ),
    );
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

  private async getSessionRecord(
    accountId: string,
    sessionId: string,
  ): Promise<AccountAccessSessionRecord> {
    const normalizedSessionId = ensureNonEmptyString(
      sessionId,
      "Access session ID is required.",
    );
    const record = await this.options.sessionStateStore.getSessionById(
      accountId,
      normalizedSessionId,
    );

    if (!record) {
      throw new AccountAccessSessionNotFoundError(accountId, normalizedSessionId);
    }

    return this.refreshSessionRuntimeState(record);
  }

  private async refreshAccountRuntimeState(
    record: AccountRecord,
  ): Promise<AccountRecord> {
    const nowIso = this.now().toISOString();
    let nextRecord = record;

    if (nextRecord.connectionStatus === "connecting") {
      const latestSession =
        await this.options.sessionStateStore.getLatestSessionForAccount(
          nextRecord.accountId,
        );
      const refreshedLatestSession = latestSession
        ? await this.refreshSessionRuntimeState(latestSession)
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
        connectionStatusReason: "No current credential is currently applied.",
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
      await this.options.accountStateStore.saveAccount(nextRecord);
    }

    return nextRecord;
  }

  private async refreshSessionRuntimeState(
    record: AccountAccessSessionRecord,
  ): Promise<AccountAccessSessionRecord> {
    if (isAccessSessionTerminal(record) || record.expiresAt === null) {
      return record;
    }

    const nowIso = this.now().toISOString();

    if (record.expiresAt > nowIso) {
      return record;
    }

    const expiredRecord: AccountAccessSessionRecord = {
      ...record,
      sessionStatus: "expired",
      sessionStatusReason: "Access session expired.",
      updatedAt: nowIso,
    };

    await this.options.sessionStateStore.saveSession(expiredRecord);

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

  private async readStoredCredential(secretRef: string): Promise<StoredCredentialSecret> {
    try {
      return await this.options.secretStore.readSecret<StoredCredentialSecret>(
        secretRef,
      );
    } catch {
      throw new AccountOperationConflictError(
        `Credential material referenced by "${secretRef}" is missing.`,
      );
    }
  }

  private async readLogs(secretRef: string): Promise<AccessSessionLogEntry[]> {
    try {
      const stored = await this.options.secretStore.readSecret<StoredAccessSessionLogs>(
        secretRef,
      );
      return Array.isArray(stored.entries) ? stored.entries : [];
    } catch {
      return [];
    }
  }

  private async writeLogs(
    secretRef: string,
    entries: AccessSessionLogEntry[],
  ): Promise<void> {
    await this.options.secretStore.writeSecret(secretRef, {
      entries,
    } satisfies StoredAccessSessionLogs);
  }

  private async appendLogs(
    secretRef: string,
    entries: AccessSessionLogEntry[],
  ): Promise<void> {
    if (entries.length === 0) {
      return;
    }

    const currentEntries = await this.readLogs(secretRef);
    await this.writeLogs(secretRef, [...currentEntries, ...entries]);
  }
}

function normalizeStartManualAccessSessionInput(
  input: StartManualAccessSessionInput,
): Required<StartManualAccessSessionInput> {
  const token = normalizeRequiredString(input.token, "Token is required.");
  return {
    token,
    expiresAt: normalizeNullableString(input.expiresAt),
  };
}

function normalizeStartQrAccessSessionInput(
  input: StartQrAccessSessionInput,
): Required<StartQrAccessSessionInput> {
  return {
    expiresAt: normalizeNullableString(input.expiresAt),
  };
}

function createDefaultQrSessionExpiresAt(now: () => Date): string {
  return new Date(now().getTime() + 60_000).toISOString();
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

function toAccountPlatformSnapshot(account: AccountRecord) {
  return {
    accountId: account.accountId,
    platform: account.platform,
    internalDisplayName: account.internalDisplayName,
    platformMetadata: { ...account.platformMetadata },
    resolvedPlatformProfile: toResolvedPlatformProfile(account),
  };
}

function createProviderSessionRef(accountId: string, sessionId: string): string {
  return `accounts/${accountId}/access-sessions/${sessionId}/provider-session.json`;
}

function createCandidateCredentialRef(accountId: string, sessionId: string): string {
  return `accounts/${accountId}/access-sessions/${sessionId}/candidate-credential.json`;
}

function createSessionLogRef(accountId: string, sessionId: string): string {
  return `accounts/${accountId}/access-sessions/${sessionId}/logs.json`;
}

function createActiveCredentialRef(accountId: string): string {
  return `accounts/${accountId}/current-credential.json`;
}

function createLog(
  level: AccessSessionLogEntry["level"],
  message: string,
  details?: JsonObject,
): AccessSessionLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
    details,
  };
}

function mapProgressStatus(
  progressStatus:
    | "waiting_for_scan"
    | "waiting_for_confirmation"
    | "ready_for_verification"
    | "expired",
) {
  return progressStatus;
}

function defaultReasonForProgress(
  progressStatus:
    | "waiting_for_scan"
    | "waiting_for_confirmation"
    | "ready_for_verification"
    | "expired",
): string {
  switch (progressStatus) {
    case "waiting_for_scan":
      return "Waiting for QR scan.";
    case "waiting_for_confirmation":
      return "QR scanned. Waiting for confirmation.";
    case "ready_for_verification":
      return "Candidate credential is ready for verification.";
    default:
      return "Access session expired.";
  }
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

function normalizeRequiredString(value: string | undefined, message: string): string {
  if (typeof value !== "string") {
    throw new AccountValidationError(message);
  }

  const normalized = value.trim();

  if (normalized.length === 0) {
    throw new AccountValidationError(message);
  }

  return normalized;
}

function ensureNonEmptyString(value: string | undefined, message: string): string {
  return normalizeRequiredString(value, message);
}
