import { describe, expect, it } from "vitest";

import { AccountAccessSessionService } from "../../src/modules/account-access-sessions/service.js";
import type {
  AccountAccessSessionRecord,
  AccessSessionLogEntry,
} from "../../src/modules/account-access-sessions/types.js";
import { AccountService } from "../../src/modules/accounts/service.js";
import type {
  AccountRecord,
  JsonObject,
  StoredCredentialSecret,
} from "../../src/modules/accounts/types.js";
import type { AccountAccessSessionStateStore } from "../../src/ports/account-access-session-state-store-port.js";
import type {
  AccountPlatformAvailabilityCheckInput,
  AccountPlatformAvailabilityCheckResult,
  AccountPlatformPollQrSessionInput,
  AccountPlatformPollQrSessionResult,
  AccountPlatformPort,
  AccountPlatformStartQrSessionInput,
  AccountPlatformStartQrSessionResult,
  AccountPlatformVerifyCredentialInput,
  AccountPlatformVerifyCredentialResult,
} from "../../src/ports/account-platform-port.js";
import type { AccountSecretStore } from "../../src/ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../src/ports/account-state-store-port.js";

describe("account module services", () => {
  it("creates wrapper accounts before login", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const sessionStore = new InMemoryAccessSessionStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const accountService = new AccountService({
      stateStore,
      accessSessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      createAccountId: () => "account-1",
    });

    const created = await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "Bili 主号",
      remark: "运营包装对象",
      tags: ["main", "bili"],
      platformMetadata: {
        region: "cn",
      },
    });

    expect(created.accountId).toBe("account-1");
    expect(created.connectionStatus).toBe("not_logged_in");
    expect(created.platform).toBe("bilibili");
    expect(created.internalDisplayName).toBe("Bili 主号");
    expect(created.resolvedPlatformProfile.resolvedPlatformAccountUid).toBeNull();
    expect(created.currentCredential.hasCredential).toBe(false);
  });

  it("applies verified credentials and refreshes resolved profile", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const sessionStore = new InMemoryAccessSessionStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const now = createSequentialNow();
    const accountService = new AccountService({
      stateStore,
      accessSessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now,
      createAccountId: () => "account-1",
    });
    const accessSessionService = new AccountAccessSessionService({
      accountStateStore: stateStore,
      sessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now,
      createSessionId: () => "session-1",
    });

    await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "内部主号",
    });

    platform.verifyHandler = async (input) => ({
      verificationResult: "succeeded",
      reason: "user info fetched",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: "uid-verified",
        resolvedDisplayName: "平台昵称",
        resolvedAvatarUrl: "https://example.com/avatar.png",
        resolvedProfileMetadata: {
          fanLevel: 7,
        },
      },
      credential: {
        token: input.candidateCredential.token,
        availabilityStatus: "healthy",
      },
      credentialExpiresAt: "2026-04-25T08:00:00.000Z",
      logs: [logEntry("info", "verification succeeded")],
    });

    const session = await accessSessionService.startManualAccessSession("account-1", {
      token: "token-1",
    });

    expect(session.sessionStatus).toBe("ready_for_verification");
    expect(session.hasCandidateCredential).toBe(true);

    const verification = await accessSessionService.verifyAccessSession(
      "account-1",
      "session-1",
      {},
    );

    expect(verification.verificationResult).toBe("succeeded");
    expect(verification.credentialApplied).toBe(true);
    expect(verification.account.connectionStatus).toBe("connected");
    expect(verification.account.internalDisplayName).toBe("内部主号");
    expect(
      verification.account.resolvedPlatformProfile.resolvedDisplayName,
    ).toBe("平台昵称");
    expect(verification.account.currentCredential.hasCredential).toBe(true);
    expect(verification.session.sessionStatus).toBe("verified");

    const logs = await accessSessionService.getAccessSessionLogs(
      "account-1",
      "session-1",
    );
    expect(logs.entries).toEqual([
      expect.objectContaining({ message: "manual token received" }),
      expect.objectContaining({ message: "verification succeeded" }),
    ]);

    const resolved = await accountService.resolveActiveCredential("account-1");
    expect(resolved.payload).toMatchObject({
      token: "token-1",
    });
  });

  it("preserves the previous active credential when replacement verification fails", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const sessionStore = new InMemoryAccessSessionStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const now = createSequentialNow();
    const accountService = new AccountService({
      stateStore,
      accessSessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now,
      createAccountId: () => "account-1",
    });
    const accessSessionService = new AccountAccessSessionService({
      accountStateStore: stateStore,
      sessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now,
      createSessionId: createSequentialIds("session"),
    });

    await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "内部主号",
    });

    await accessSessionService.startManualAccessSession("account-1", {
      token: "stable-token",
    });
    await accessSessionService.verifyAccessSession("account-1", "session-1", {});

    platform.verifyHandler = async () => ({
      verificationResult: "failed",
      reason: "token expired",
      resolvedPlatformProfile: null,
      credential: null,
      credentialExpiresAt: null,
      logs: [logEntry("error", "verification failed")],
    });

    await accessSessionService.startManualAccessSession("account-1", {
      token: "broken-token",
    });

    const failed = await accessSessionService.verifyAccessSession(
      "account-1",
      "session-2",
      {},
    );

    expect(failed.verificationResult).toBe("failed");
    expect(failed.credentialApplied).toBe(false);
    expect(failed.account.connectionStatus).toBe("connected");
    expect(failed.session.sessionStatus).toBe("verify_failed");

    const resolved = await accountService.resolveActiveCredential("account-1");
    expect(resolved.payload).toMatchObject({
      token: "stable-token",
    });
  });

  it("expires an unscanned qr session after one minute and falls back to not_logged_in", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const sessionStore = new InMemoryAccessSessionStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const now = createMutableNow("2026-04-24T08:00:00.000Z");
    const accountService = new AccountService({
      stateStore,
      accessSessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now: now.current,
      createAccountId: () => "account-1",
    });
    const accessSessionService = new AccountAccessSessionService({
      accountStateStore: stateStore,
      sessionStateStore: sessionStore,
      secretStore,
      platforms: [platform],
      now: now.current,
      createSessionId: () => "session-qr-1",
    });

    await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "二维码账号",
    });

    const session = await accessSessionService.startQrAccessSession("account-1", {});

    expect(session.sessionStatus).toBe("waiting_for_scan");
    expect(session.expiresAt).toBe("2026-04-24T08:01:00.000Z");

    now.set("2026-04-24T08:01:01.000Z");

    const detail = await accountService.getAccountDetail("account-1");

    expect(detail.connectionStatus).toBe("not_logged_in");
    expect(detail.connectionStatusReason).toContain("QR access session expired");
    expect(detail.currentAccessSession?.sessionStatus).toBe("expired");
  });
});

class InMemoryAccountStateStore implements AccountStateStore {
  private readonly records = new Map<string, AccountRecord>();

  async createAccount(record: AccountRecord): Promise<void> {
    this.records.set(record.accountId, cloneAccountRecord(record));
  }

  async saveAccount(record: AccountRecord): Promise<void> {
    this.records.set(record.accountId, cloneAccountRecord(record));
  }

  async getAccountById(accountId: string): Promise<AccountRecord | undefined> {
    const record = this.records.get(accountId);
    return record ? cloneAccountRecord(record) : undefined;
  }

  async listAccounts(): Promise<AccountRecord[]> {
    return [...this.records.values()].map(cloneAccountRecord);
  }

  close(): void {}
}

class InMemoryAccessSessionStateStore implements AccountAccessSessionStateStore {
  private readonly records = new Map<string, AccountAccessSessionRecord>();

  async createSession(record: AccountAccessSessionRecord): Promise<void> {
    this.records.set(record.sessionId, cloneAccessSessionRecord(record));
  }

  async saveSession(record: AccountAccessSessionRecord): Promise<void> {
    this.records.set(record.sessionId, cloneAccessSessionRecord(record));
  }

  async getSessionById(
    accountId: string,
    sessionId: string,
  ): Promise<AccountAccessSessionRecord | undefined> {
    const record = this.records.get(sessionId);

    if (!record || record.accountId !== accountId) {
      return undefined;
    }

    return cloneAccessSessionRecord(record);
  }

  async getLatestSessionForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord | undefined> {
    return [...this.records.values()]
      .filter((record) => record.accountId === accountId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))[0];
  }

  async listSessionsForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord[]> {
    return [...this.records.values()]
      .filter((record) => record.accountId === accountId)
      .map(cloneAccessSessionRecord);
  }

  close(): void {}
}

class InMemoryAccountSecretStore implements AccountSecretStore {
  private readonly values = new Map<string, unknown>();

  async writeSecret(secretRef: string, payload: unknown): Promise<void> {
    this.values.set(secretRef, structuredClone(payload));
  }

  async readSecret<T>(secretRef: string): Promise<T> {
    if (!this.values.has(secretRef)) {
      throw new Error(`Secret "${secretRef}" not found.`);
    }

    return structuredClone(this.values.get(secretRef)) as T;
  }

  async deleteSecret(secretRef: string): Promise<void> {
    this.values.delete(secretRef);
  }
}

class FakeAccountPlatform implements AccountPlatformPort {
  readonly platformCode: string;

  verifyHandler:
    | ((input: AccountPlatformVerifyCredentialInput) => Promise<AccountPlatformVerifyCredentialResult>)
    | null = null;

  constructor(platformCode: string) {
    this.platformCode = platformCode;
  }

  async startQrSession(
    input: AccountPlatformStartQrSessionInput,
  ): Promise<AccountPlatformStartQrSessionResult> {
    return {
      challenge: {
        challengeType: "qr_image",
        imageUrl: "data:image/png;base64,stub",
      },
      providerSession: {
        qrcodeKey: "stub-key",
      },
      expiresAt: input.requestedExpiresAt,
      logs: [logEntry("info", "qr session started")],
    };
  }

  async pollQrSession(
    _input: AccountPlatformPollQrSessionInput,
  ): Promise<AccountPlatformPollQrSessionResult> {
    return {
      progressStatus: "ready_for_verification",
      providerSession: {
        qrcodeKey: "stub-key",
      },
      candidateCredential: {
        token: "resolved-token",
      },
      reason: "credential resolved",
      expiresAt: null,
      logs: [logEntry("info", "qr session polled")],
    };
  }

  async verifyCredential(
    input: AccountPlatformVerifyCredentialInput,
  ): Promise<AccountPlatformVerifyCredentialResult> {
    if (this.verifyHandler) {
      return this.verifyHandler(input);
    }

    return {
      verificationResult: "succeeded",
      reason: "verified",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: "uid-default",
        resolvedDisplayName: "平台账号",
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
      },
      credential: {
        token: input.candidateCredential.token,
      },
      credentialExpiresAt: null,
      logs: [logEntry("info", "verification succeeded")],
    };
  }

  async checkAvailability(
    _input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult> {
    return {
      availabilityStatus: "healthy",
      reason: "healthy",
    };
  }
}

function cloneAccountRecord(record: AccountRecord): AccountRecord {
  return {
    ...record,
    tags: [...record.tags],
    platformMetadata: { ...record.platformMetadata },
    resolvedProfileMetadata: { ...record.resolvedProfileMetadata },
  };
}

function cloneAccessSessionRecord(
  record: AccountAccessSessionRecord,
): AccountAccessSessionRecord {
  return {
    ...record,
    challenge: record.challenge ? { ...record.challenge } : null,
    resolvedProfileMetadata: { ...record.resolvedProfileMetadata },
  };
}

function createSequentialNow(): () => Date {
  let counter = 0;
  return () => new Date(`2026-04-24T08:00:${String(counter++).padStart(2, "0")}.000Z`);
}

function createSequentialIds(prefix: string): () => string {
  let counter = 1;
  return () => `${prefix}-${counter++}`;
}

function createMutableNow(initialIso: string): {
  current: () => Date;
  set(nextIso: string): void;
} {
  let value = initialIso;

  return {
    current: () => new Date(value),
    set(nextIso: string) {
      value = nextIso;
    },
  };
}

function logEntry(
  level: AccessSessionLogEntry["level"],
  message: string,
  details?: JsonObject,
): AccessSessionLogEntry {
  return {
    timestamp: "2026-04-24T08:00:00.000Z",
    level,
    message,
    details,
  };
}
