import { describe, expect, it } from "vitest";

import { AccountService } from "../../src/modules/accounts/service.js";
import type {
  AccountPlatformAuthorizationStartInput,
  AccountPlatformPort,
} from "../../src/ports/account-platform-port.js";
import type { AccountSecretStore } from "../../src/ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../src/ports/account-state-store-port.js";
import type {
  ActiveCredentialSecret,
  PlatformAccountRecord,
} from "../../src/modules/accounts/types.js";

describe("account service", () => {
  it("keeps the current credential active until replacement authorization is verified", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountService({
      stateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createAttemptId: () => "attempt-1",
    });

    const originalCredentialRef = "account-1/credentials/original.json";
    await stateStore.saveAccount(
      buildAccountRecord({
        accountId: "account-1",
        authorizationStatus: "authorized",
        availabilityStatus: "healthy",
        activeCredentialType: "token",
        activeCredentialRef: originalCredentialRef,
        activeCredentialUpdatedAt: "2026-04-21T08:00:00.000Z",
      }),
    );
    await secretStore.writeSecret(originalCredentialRef, {
      credentialType: "token",
      payload: {
        token: "old-token",
      },
      expiresAt: null,
    } satisfies ActiveCredentialSecret);

    platform.verifyHandler = async (input) => ({
      verificationResult: "succeeded",
      reason: "stub verification succeeded",
      resolvedIdentity: {
        platform: "bilibili",
        platformAccountUid: input.account.platformAccountUid,
      },
      profile: {
        displayName: "Verified Main Account",
        platformMetadata: {
          verified: true,
        },
      },
      credential: {
        credentialType: "token",
        payload: {
          token: "new-token",
          availabilityStatus: "healthy",
        },
        expiresAt: "2026-04-22T08:00:00.000Z",
      },
    });

    const startedAttempt = await service.startAuthorizationAttempt("account-1", {
      authorizationMethod: "token_input",
      expectedCredentialType: "token",
      payload: {
        credentialPayload: {
          token: "new-token",
        },
      },
    });

    expect(startedAttempt.attemptStatus).toBe("pending_verification");
    expect((await stateStore.getAccountById("account-1"))?.authorizationStatus).toBe(
      "authorized",
    );
    expect((await stateStore.getAccountById("account-1"))?.activeCredentialRef).toBe(
      originalCredentialRef,
    );

    const verification = await service.verifyAuthorizationAttempt(
      "account-1",
      "attempt-1",
      {
        verificationPayload: {},
      },
    );

    expect(verification.verificationResult).toBe("succeeded");
    expect(verification.activeCredentialSwitched).toBe(true);
    expect(verification.account.displayName).toBe("Verified Main Account");
    expect(verification.account.authorizationStatus).toBe("authorized");
    expect(verification.account.availabilityStatus).toBe("unknown");
    expect(verification.account.authorizationAttempt?.attemptStatus).toBe(
      "verification_succeeded",
    );
    expect(verification.account.activeCredential.credentialType).toBe("token");

    const updatedRecord = await stateStore.getAccountById("account-1");
    expect(updatedRecord?.activeCredentialRef).not.toBe(originalCredentialRef);
    expect(updatedRecord?.lastAuthorizedAt).not.toBeNull();
    expect(secretStore.has(originalCredentialRef)).toBe(false);
    expect(secretStore.has(updatedRecord!.activeCredentialRef!)).toBe(true);
  });

  it("restores the previous authorization semantics when verification fails", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountService({
      stateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createAccountId: () => "account-1",
      createAttemptId: () => "attempt-1",
    });

    await service.createAccount({
      platform: "bilibili",
      platformAccountUid: "uid-1",
      displayName: "Main Account",
    });

    platform.verifyHandler = async () => ({
      verificationResult: "failed",
      reason: "stub verification failed",
      resolvedIdentity: null,
      profile: null,
      credential: null,
    });

    await service.startAuthorizationAttempt("account-1", {
      authorizationMethod: "token_input",
      payload: {
        token: "pending-token",
      },
    });

    expect((await stateStore.getAccountById("account-1"))?.authorizationStatus).toBe(
      "authorizing",
    );

    const verification = await service.verifyAuthorizationAttempt(
      "account-1",
      "attempt-1",
      {
        verificationPayload: {},
      },
    );

    expect(verification.verificationResult).toBe("failed");
    expect(verification.activeCredentialSwitched).toBe(false);
    expect(verification.account.authorizationStatus).toBe("unauthorized");
    expect(verification.account.authorizationAttempt?.attemptStatus).toBe(
      "verification_failed",
    );
  });

  it("rejects identity mismatch without replacing the current credential", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountService({
      stateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createAttemptId: () => "attempt-1",
    });

    const originalCredentialRef = "account-1/credentials/original.json";
    await stateStore.saveAccount(
      buildAccountRecord({
        accountId: "account-1",
        authorizationStatus: "authorized",
        availabilityStatus: "healthy",
        activeCredentialType: "token",
        activeCredentialRef: originalCredentialRef,
        activeCredentialUpdatedAt: "2026-04-21T08:00:00.000Z",
      }),
    );
    await secretStore.writeSecret(originalCredentialRef, {
      credentialType: "token",
      payload: {
        token: "old-token",
      },
      expiresAt: null,
    } satisfies ActiveCredentialSecret);

    platform.verifyHandler = async () => ({
      verificationResult: "succeeded",
      reason: "stub verification succeeded",
      resolvedIdentity: {
        platform: "bilibili",
        platformAccountUid: "other-uid",
      },
      profile: {
        displayName: "Other Account",
        platformMetadata: {
          verified: true,
        },
      },
      credential: {
        credentialType: "token",
        payload: {
          token: "new-token",
        },
        expiresAt: null,
      },
    });

    await service.startAuthorizationAttempt("account-1", {
      authorizationMethod: "token_input",
      payload: {
        token: "pending-token",
      },
    });

    const verification = await service.verifyAuthorizationAttempt(
      "account-1",
      "attempt-1",
      {
        verificationPayload: {},
      },
    );

    expect(verification.verificationResult).toBe("failed");
    expect(verification.activeCredentialSwitched).toBe(false);
    expect(verification.account.authorizationStatus).toBe("authorized");
    expect(verification.account.authorizationAttempt?.attemptStatus).toBe(
      "verification_failed",
    );
    expect((await stateStore.getAccountById("account-1"))?.activeCredentialRef).toBe(
      originalCredentialRef,
    );
    expect(secretStore.has(originalCredentialRef)).toBe(true);
  });

  it("supports soft delete, explicit restore, and restore-on-create for the same platform identity", async () => {
    const service = new AccountService({
      stateStore: new InMemoryAccountStateStore(),
      secretStore: new InMemoryAccountSecretStore(),
      platforms: [new FakeAccountPlatform("bilibili")],
      now: createSequentialNow(),
      createAccountId: () => "account-1",
    });

    const created = await service.createAccount({
      platform: "bilibili",
      platformAccountUid: "uid-1",
      displayName: "Main Account",
      tags: ["main"],
    });

    const deleted = await service.softDeleteAccount(created.account.accountId);
    expect(deleted.lifecycleStatus).toBe("deleted");
    expect(deleted.deletedAt).not.toBeNull();

    const restored = await service.restoreAccount(created.account.accountId);
    expect(restored.lifecycleStatus).toBe("active");
    expect(restored.deletedAt).toBeNull();

    await service.softDeleteAccount(created.account.accountId);

    const recreated = await service.createAccount({
      platform: "bilibili",
      platformAccountUid: "uid-1",
      displayName: "Recreated Account",
      tags: ["restored"],
    });

    expect(recreated.restoredFromDeleted).toBe(true);
    expect(recreated.account.accountId).toBe(created.account.accountId);
    expect(recreated.account.displayName).toBe("Recreated Account");
    expect(recreated.account.tags).toEqual(["restored"]);
  });

  it("only resolves active credentials after the account becomes consumable", async () => {
    const stateStore = new InMemoryAccountStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountService({
      stateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
    });

    const credentialRef = "account-1/credentials/original.json";
    await stateStore.saveAccount(
      buildAccountRecord({
        accountId: "account-1",
        authorizationStatus: "authorized",
        availabilityStatus: "unknown",
        activeCredentialType: "token",
        activeCredentialRef: credentialRef,
        activeCredentialUpdatedAt: "2026-04-21T08:00:00.000Z",
      }),
    );
    await secretStore.writeSecret(credentialRef, {
      credentialType: "token",
      payload: {
        token: "old-token",
      },
      expiresAt: null,
    } satisfies ActiveCredentialSecret);

    platform.availabilityHandler = async () => ({
      availabilityStatus: "healthy",
      reason: "stub availability healthy",
    });

    await expect(service.resolveActiveCredential("account-1")).rejects.toMatchObject({
      code: "ACCOUNT_OPERATION_NOT_ALLOWED",
    });

    const availabilityResult = await service.runAvailabilityCheck("account-1");
    expect(availabilityResult.availabilityStatus).toBe("healthy");
    expect(availabilityResult.isConsumable).toBe(true);

    const resolvedCredential = await service.resolveActiveCredential("account-1");
    expect(resolvedCredential.credentialRef).toBe(credentialRef);
    expect(resolvedCredential.payload).toEqual({
      token: "old-token",
    });
  });
});

class InMemoryAccountStateStore implements AccountStateStore {
  private readonly accounts = new Map<string, PlatformAccountRecord>();

  async createAccount(record: PlatformAccountRecord): Promise<void> {
    this.accounts.set(record.accountId, cloneRecord(record));
  }

  async saveAccount(record: PlatformAccountRecord): Promise<void> {
    this.accounts.set(record.accountId, cloneRecord(record));
  }

  async getAccountById(
    accountId: string,
  ): Promise<PlatformAccountRecord | undefined> {
    const record = this.accounts.get(accountId);
    return record ? cloneRecord(record) : undefined;
  }

  async getAccountByPlatformIdentity(
    platform: string,
    platformAccountUid: string,
  ): Promise<PlatformAccountRecord | undefined> {
    for (const record of this.accounts.values()) {
      if (
        record.platform === platform &&
        record.platformAccountUid === platformAccountUid
      ) {
        return cloneRecord(record);
      }
    }

    return undefined;
  }

  async listAccounts(): Promise<PlatformAccountRecord[]> {
    return Array.from(this.accounts.values()).map(cloneRecord);
  }

  close(): void {}
}

class InMemoryAccountSecretStore implements AccountSecretStore {
  private readonly secrets = new Map<string, unknown>();

  async writeSecret(secretRef: string, payload: unknown): Promise<void> {
    this.secrets.set(secretRef, structuredClone(payload));
  }

  async readSecret<T>(secretRef: string): Promise<T> {
    const payload = this.secrets.get(secretRef);

    if (!payload) {
      throw new Error(`Secret "${secretRef}" was not found.`);
    }

    return structuredClone(payload) as T;
  }

  async deleteSecret(secretRef: string): Promise<void> {
    this.secrets.delete(secretRef);
  }

  has(secretRef: string): boolean {
    return this.secrets.has(secretRef);
  }
}

class FakeAccountPlatform implements AccountPlatformPort {
  verifyHandler: AccountPlatformPort["verifyAuthorizationAttempt"] = async (
    input,
  ) => ({
    verificationResult: "succeeded",
    reason: "stub verification succeeded",
    resolvedIdentity: {
      platform: this.platformCode,
      platformAccountUid: input.account.platformAccountUid,
    },
    profile: null,
    credential: {
      credentialType: input.expectedCredentialType ?? "token",
      payload: {
        token: "default-token",
      },
      expiresAt: null,
    },
  });

  availabilityHandler: AccountPlatformPort["checkAvailability"] = async () => ({
    availabilityStatus: "healthy",
    reason: "stub availability healthy",
  });

  constructor(readonly platformCode: string) {}

  async startAuthorizationAttempt(input: AccountPlatformAuthorizationStartInput) {
    void input.account;

    return {
      expectedCredentialType: input.expectedCredentialType,
      attemptPayload: {
        ...input.payload,
      },
      expiresAt: input.requestedExpiresAt,
      challenge: null,
    };
  }

  async verifyAuthorizationAttempt(
    input: Parameters<AccountPlatformPort["verifyAuthorizationAttempt"]>[0],
  ) {
    return this.verifyHandler(input);
  }

  async checkAvailability(
    input: Parameters<AccountPlatformPort["checkAvailability"]>[0],
  ) {
    return this.availabilityHandler(input);
  }
}

function buildAccountRecord(
  overrides: Partial<PlatformAccountRecord> = {},
): PlatformAccountRecord {
  return {
    accountId: "account-1",
    platform: "bilibili",
    platformAccountUid: "uid-1",
    displayName: "Main Account",
    remark: null,
    tags: [],
    platformMetadata: {},
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
    createdAt: "2026-04-21T08:00:00.000Z",
    updatedAt: "2026-04-21T08:00:00.000Z",
    ...overrides,
  };
}

function cloneRecord(record: PlatformAccountRecord): PlatformAccountRecord {
  return structuredClone(record);
}

function createSequentialNow(): () => Date {
  let tick = 0;

  return () => {
    const date = new Date(Date.UTC(2026, 3, 21, 8, 0, tick));
    tick += 1;
    return date;
  };
}
