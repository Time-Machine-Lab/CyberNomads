import { describe, expect, it } from "vitest";

import { AccountConnectionAttemptService } from "../../src/modules/account-connection-attempts/service.js";
import type {
  AccountConnectionAttemptRecord,
  ConnectionAttemptLogEntry,
} from "../../src/modules/account-connection-attempts/types.js";
import { AccountService } from "../../src/modules/accounts/service.js";
import type { AccountRecord, StoredTokenSecret } from "../../src/modules/accounts/types.js";
import type { AccountConnectionAttemptStateStore } from "../../src/ports/account-connection-attempt-state-store-port.js";
import type {
  AccountPlatformAvailabilityCheckInput,
  AccountPlatformAvailabilityCheckResult,
  AccountPlatformPort,
  AccountPlatformResolveConnectionAttemptInput,
  AccountPlatformResolveConnectionAttemptResult,
  AccountPlatformStartConnectionAttemptInput,
  AccountPlatformStartConnectionAttemptResult,
  AccountPlatformValidateConnectionAttemptInput,
  AccountPlatformValidateConnectionAttemptResult,
} from "../../src/ports/account-platform-port.js";
import type { AccountSecretStore } from "../../src/ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../src/ports/account-state-store-port.js";

describe("account module services", () => {
  it("creates wrapper accounts before login", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const attemptStore = new InMemoryAttemptStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const accountService = new AccountService({
      stateStore,
      connectionAttemptStateStore: attemptStore,
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
    expect(created.loginStatus).toBe("not_logged_in");
    expect(created.platform).toBe("bilibili");
    expect(created.internalDisplayName).toBe("Bili 主号");
    expect(created.resolvedPlatformProfile.resolvedPlatformAccountUid).toBeNull();
    expect(created.activeToken.hasToken).toBe(false);
  });

  it("applies validated tokens and refreshes resolved profile", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const attemptStore = new InMemoryAttemptStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const now = createSequentialNow();
    const accountService = new AccountService({
      stateStore,
      connectionAttemptStateStore: attemptStore,
      secretStore,
      platforms: [platform],
      now,
      createAccountId: () => "account-1",
    });
    const attemptService = new AccountConnectionAttemptService({
      accountStateStore: stateStore,
      attemptStateStore: attemptStore,
      secretStore,
      platforms: [platform],
      now,
      createAttemptId: () => "attempt-1",
    });

    await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "内部主号",
    });

    platform.validateHandler = async (input) => ({
      validationResult: "succeeded",
      reason: "user info fetched",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: "uid-verified",
        resolvedDisplayName: "平台昵称",
        resolvedAvatarUrl: "https://example.com/avatar.png",
        resolvedProfileMetadata: {
          fanLevel: 7,
        },
      },
      token: {
        token: input.candidateToken.token,
        availabilityStatus: "healthy",
      },
      tokenExpiresAt: "2026-04-25T08:00:00.000Z",
      logs: [logEntry("info", "validation succeeded")],
    });

    const attempt = await attemptService.startConnectionAttempt("account-1", {
      connectionMethod: "manual_token",
      tokenValue: "token-1",
    });

    expect(attempt.attemptStatus).toBe("ready_for_validation");
    expect(attempt.hasCandidateToken).toBe(true);

    const validation = await attemptService.validateConnectionAttempt(
      "account-1",
      "attempt-1",
      {},
    );

    expect(validation.validationResult).toBe("succeeded");
    expect(validation.tokenApplied).toBe(true);
    expect(validation.account.loginStatus).toBe("connected");
    expect(validation.account.internalDisplayName).toBe("内部主号");
    expect(validation.account.resolvedPlatformProfile.resolvedDisplayName).toBe(
      "平台昵称",
    );
    expect(validation.account.activeToken.hasToken).toBe(true);
    expect(validation.attempt.attemptStatus).toBe("validation_succeeded");

    const logs = await attemptService.getConnectionAttemptLogs(
      "account-1",
      "attempt-1",
    );
    expect(logs.entries).toEqual([
      expect.objectContaining({ message: "attempt started" }),
      expect.objectContaining({ message: "validation succeeded" }),
    ]);

    const availability = await accountService.runAvailabilityCheck("account-1");
    expect(availability.availabilityStatus).toBe("healthy");
    expect(availability.isConsumable).toBe(true);

    const resolved = await accountService.resolveActiveToken("account-1");
    expect(resolved.payload).toMatchObject({
      token: "token-1",
    });
  });

  it("preserves the previous active token when replacement validation fails", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const attemptStore = new InMemoryAttemptStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const now = createSequentialNow();
    const accountService = new AccountService({
      stateStore,
      connectionAttemptStateStore: attemptStore,
      secretStore,
      platforms: [platform],
      now,
      createAccountId: () => "account-1",
    });
    const attemptService = new AccountConnectionAttemptService({
      accountStateStore: stateStore,
      attemptStateStore: attemptStore,
      secretStore,
      platforms: [platform],
      now,
      createAttemptId: createSequentialIds("attempt"),
    });

    await accountService.createAccount({
      platform: "bilibili",
      internalDisplayName: "内部主号",
    });

    await attemptService.startConnectionAttempt("account-1", {
      connectionMethod: "manual_token",
      tokenValue: "stable-token",
    });
    await attemptService.validateConnectionAttempt("account-1", "attempt-1", {});

    platform.validateHandler = async () => ({
      validationResult: "failed",
      reason: "token expired",
      resolvedPlatformProfile: null,
      token: null,
      tokenExpiresAt: null,
      logs: [logEntry("error", "validation failed")],
    });

    await attemptService.startConnectionAttempt("account-1", {
      connectionMethod: "manual_token",
      tokenValue: "broken-token",
    });

    const failed = await attemptService.validateConnectionAttempt(
      "account-1",
      "attempt-2",
      {},
    );

    expect(failed.validationResult).toBe("failed");
    expect(failed.tokenApplied).toBe(false);
    expect(failed.account.loginStatus).toBe("connected");
    expect(failed.attempt.attemptStatus).toBe("validation_failed");

    await accountService.runAvailabilityCheck("account-1");

    const resolved = await accountService.resolveActiveToken("account-1");
    expect(resolved.payload).toMatchObject({
      token: "stable-token",
    });
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

class InMemoryAttemptStateStore implements AccountConnectionAttemptStateStore {
  private readonly records = new Map<string, AccountConnectionAttemptRecord>();

  async createAttempt(record: AccountConnectionAttemptRecord): Promise<void> {
    this.records.set(record.attemptId, cloneAttemptRecord(record));
  }

  async saveAttempt(record: AccountConnectionAttemptRecord): Promise<void> {
    this.records.set(record.attemptId, cloneAttemptRecord(record));
  }

  async getAttemptById(
    accountId: string,
    attemptId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined> {
    const record = this.records.get(attemptId);

    if (!record || record.accountId !== accountId) {
      return undefined;
    }

    return cloneAttemptRecord(record);
  }

  async getLatestAttemptForAccount(
    accountId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined> {
    const records = [...this.records.values()]
      .filter((record) => record.accountId === accountId)
      .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt));

    return records[0] ? cloneAttemptRecord(records[0]) : undefined;
  }

  close(): void {}
}

class InMemoryAccountSecretStore implements AccountSecretStore {
  private readonly records = new Map<string, unknown>();

  async writeSecret(secretRef: string, payload: unknown): Promise<void> {
    this.records.set(secretRef, structuredClone(payload));
  }

  async readSecret<T>(secretRef: string): Promise<T> {
    if (!this.records.has(secretRef)) {
      throw new Error(`Secret "${secretRef}" not found.`);
    }

    return structuredClone(this.records.get(secretRef)) as T;
  }

  async deleteSecret(secretRef: string): Promise<void> {
    this.records.delete(secretRef);
  }
}

class FakeAccountPlatform implements AccountPlatformPort {
  readonly platformCode: string;

  startHandler?: (
    input: AccountPlatformStartConnectionAttemptInput,
  ) => Promise<AccountPlatformStartConnectionAttemptResult>;
  resolveHandler?: (
    input: AccountPlatformResolveConnectionAttemptInput,
  ) => Promise<AccountPlatformResolveConnectionAttemptResult>;
  validateHandler?: (
    input: AccountPlatformValidateConnectionAttemptInput,
  ) => Promise<AccountPlatformValidateConnectionAttemptResult>;
  availabilityHandler?: (
    input: AccountPlatformAvailabilityCheckInput,
  ) => Promise<AccountPlatformAvailabilityCheckResult>;

  constructor(platformCode: string) {
    this.platformCode = platformCode;
  }

  async startConnectionAttempt(
    input: AccountPlatformStartConnectionAttemptInput,
  ): Promise<AccountPlatformStartConnectionAttemptResult> {
    if (this.startHandler) {
      return this.startHandler(input);
    }

    return {
      challenge: null,
      platformSession: { source: input.connectionMethod },
      candidateToken: input.tokenValue ? { token: input.tokenValue } : null,
      expiresAt: input.requestedExpiresAt,
      logs: [logEntry("info", "attempt started")],
    };
  }

  async resolveConnectionAttempt(
    input: AccountPlatformResolveConnectionAttemptInput,
  ): Promise<AccountPlatformResolveConnectionAttemptResult> {
    if (this.resolveHandler) {
      return this.resolveHandler(input);
    }

    return {
      platformSession: input.platformSession,
      candidateToken: { token: "resolved-token" },
      reason: "resolved candidate token",
      expiresAt: null,
      logs: [logEntry("info", "attempt resolved")],
    };
  }

  async validateConnectionAttempt(
    input: AccountPlatformValidateConnectionAttemptInput,
  ): Promise<AccountPlatformValidateConnectionAttemptResult> {
    if (this.validateHandler) {
      return this.validateHandler(input);
    }

    return {
      validationResult: "succeeded",
      reason: "validated",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: "uid-default",
        resolvedDisplayName: "默认平台昵称",
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
      },
      token: {
        token: input.candidateToken.token,
        availabilityStatus: "healthy",
      },
      tokenExpiresAt: null,
      logs: [logEntry("info", "token validated")],
    };
  }

  async checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult> {
    if (this.availabilityHandler) {
      return this.availabilityHandler(input);
    }

    return {
      availabilityStatus:
        input.activeToken.availabilityStatus === "risk" ? "risk" : "healthy",
      reason: "availability checked",
    };
  }
}

function cloneAccountRecord(record: AccountRecord): AccountRecord {
  return {
    ...record,
    tags: [...record.tags],
    platformMetadata: structuredClone(record.platformMetadata),
    resolvedProfileMetadata: structuredClone(record.resolvedProfileMetadata),
  };
}

function cloneAttemptRecord(
  record: AccountConnectionAttemptRecord,
): AccountConnectionAttemptRecord {
  return {
    ...record,
    challenge: record.challenge ? structuredClone(record.challenge) : null,
    resolvedProfileMetadata: structuredClone(record.resolvedProfileMetadata),
  };
}

function createSequentialNow(): () => Date {
  let cursor = Date.parse("2026-04-23T08:00:00.000Z");

  return () => {
    const current = new Date(cursor);
    cursor += 1_000;
    return current;
  };
}

function createSequentialIds(prefix: string): () => string {
  let counter = 1;

  return () => `${prefix}-${counter++}`;
}

function logEntry(
  level: ConnectionAttemptLogEntry["level"],
  message: string,
): ConnectionAttemptLogEntry {
  return {
    timestamp: "2026-04-23T08:00:00.000Z",
    level,
    message,
  };
}
