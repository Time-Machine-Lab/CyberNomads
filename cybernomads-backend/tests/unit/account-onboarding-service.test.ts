import { describe, expect, it } from "vitest";

import { AccountOnboardingService } from "../../src/modules/account-onboarding/service.js";
import type { AccountOnboardingStateStore } from "../../src/ports/account-onboarding-state-store-port.js";
import type {
  AccountPlatformOnboardingResolveInput,
  AccountPlatformOnboardingStartInput,
  AccountPlatformPort,
} from "../../src/ports/account-platform-port.js";
import type { AccountSecretStore } from "../../src/ports/account-secret-store-port.js";
import type { AccountStateStore } from "../../src/ports/account-state-store-port.js";
import type {
  ActiveCredentialSecret,
  PlatformAccountRecord,
} from "../../src/modules/accounts/types.js";
import type { AccountOnboardingSessionRecord } from "../../src/modules/account-onboarding/types.js";

describe("account onboarding service", () => {
  it("creates a stable account from a resolved onboarding session", async () => {
    const accountStateStore = new InMemoryAccountStateStore();
    const onboardingStateStore = new InMemoryAccountOnboardingStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountOnboardingService({
      stateStore: onboardingStateStore,
      accountStateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createSessionId: () => "session-1",
      createAccountId: () => "account-1",
    });

    const started = await service.startSession({
      platform: "bilibili",
      authorizationMethod: "token_input",
      expectedCredentialType: "token",
      payload: {
        credentialPayload: {
          token: "fresh-token",
        },
      },
    });

    expect(started.sessionStatus).toBe("pending_resolution");

    const resolved = await service.resolveSession("session-1", {
      resolutionPayload: {},
    });

    expect(resolved.sessionStatus).toBe("resolved");
    expect(resolved.resolvedIdentity?.platformAccountUid).toBe("uid-new");
    expect(resolved.hasCandidateCredential).toBe(true);

    const finalized = await service.finalizeSession("session-1");

    expect(finalized.finalDisposition).toBe("created");
    expect(finalized.accountId).toBe("account-1");
    expect(finalized.account.platformAccountUid).toBe("uid-new");
    expect(finalized.account.authorizationStatus).toBe("authorized");
    expect((await accountStateStore.getAccountById("account-1"))?.activeCredentialRef).toBe(
      "account-1/credentials/onboarding-session-1.json",
    );
    expect(secretStore.has("onboarding-sessions/session-1/candidate-credential.json")).toBe(
      false,
    );
  });

  it("returns an existing account reference without replacing the current credential", async () => {
    const accountStateStore = new InMemoryAccountStateStore();
    const onboardingStateStore = new InMemoryAccountOnboardingStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountOnboardingService({
      stateStore: onboardingStateStore,
      accountStateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createSessionId: () => "session-1",
      createAccountId: () => "new-account",
    });

    const originalCredentialRef = "account-existing/credentials/original.json";
    await accountStateStore.saveAccount(
      buildAccountRecord({
        accountId: "account-existing",
        platformAccountUid: "uid-existing",
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

    platform.onboardingResolveHandler = async () => ({
      verificationResult: "succeeded",
      reason: "resolved existing account",
      resolvedIdentity: {
        platform: "bilibili",
        platformAccountUid: "uid-existing",
      },
      profile: {
        displayName: "Existing Account",
        platformMetadata: {
          region: "cn",
        },
      },
      credential: {
        credentialType: "token",
        payload: {
          token: "candidate-token",
        },
        expiresAt: null,
      },
    });

    await service.startSession({
      platform: "bilibili",
      authorizationMethod: "token_input",
      payload: {
        credentialPayload: {
          token: "candidate-token",
        },
      },
    });
    await service.resolveSession("session-1", {
      resolutionPayload: {},
    });

    const finalized = await service.finalizeSession("session-1");

    expect(finalized.finalDisposition).toBe("existing");
    expect(finalized.accountId).toBe("account-existing");
    expect((await accountStateStore.getAccountById("account-existing"))?.activeCredentialRef).toBe(
      originalCredentialRef,
    );
    expect(secretStore.has(originalCredentialRef)).toBe(true);
  });

  it("restores a deleted account and replaces its active credential", async () => {
    const accountStateStore = new InMemoryAccountStateStore();
    const onboardingStateStore = new InMemoryAccountOnboardingStateStore();
    const secretStore = new InMemoryAccountSecretStore();
    const platform = new FakeAccountPlatform("bilibili");
    const service = new AccountOnboardingService({
      stateStore: onboardingStateStore,
      accountStateStore,
      secretStore,
      platforms: [platform],
      now: createSequentialNow(),
      createSessionId: () => "session-1",
      createAccountId: () => "new-account",
    });

    const originalCredentialRef = "account-deleted/credentials/original.json";
    await accountStateStore.saveAccount(
      buildAccountRecord({
        accountId: "account-deleted",
        platformAccountUid: "uid-deleted",
        lifecycleStatus: "deleted",
        deletedAt: "2026-04-21T08:00:00.000Z",
        authorizationStatus: "authorized",
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

    platform.onboardingResolveHandler = async () => ({
      verificationResult: "succeeded",
      reason: "resolved deleted account",
      resolvedIdentity: {
        platform: "bilibili",
        platformAccountUid: "uid-deleted",
      },
      profile: {
        displayName: "Restored Account",
        platformMetadata: {
          restored: true,
        },
      },
      credential: {
        credentialType: "token",
        payload: {
          token: "restored-token",
        },
        expiresAt: "2026-04-22T08:00:00.000Z",
      },
    });

    await service.startSession({
      platform: "bilibili",
      authorizationMethod: "token_input",
      payload: {
        credentialPayload: {
          token: "restored-token",
        },
      },
    });
    await service.resolveSession("session-1", {
      resolutionPayload: {},
    });

    const finalized = await service.finalizeSession("session-1");

    expect(finalized.finalDisposition).toBe("restored");
    expect(finalized.accountId).toBe("account-deleted");
    expect(finalized.account.lifecycleStatus).toBe("active");
    expect(finalized.account.displayName).toBe("Restored Account");
    expect(secretStore.has(originalCredentialRef)).toBe(false);
    expect(
      (await accountStateStore.getAccountById("account-deleted"))?.activeCredentialRef,
    ).toBe("account-deleted/credentials/onboarding-session-1.json");
  });
});

class InMemoryAccountOnboardingStateStore implements AccountOnboardingStateStore {
  private readonly sessions = new Map<string, AccountOnboardingSessionRecord>();

  async createSession(record: AccountOnboardingSessionRecord): Promise<void> {
    this.sessions.set(record.sessionId, structuredClone(record));
  }

  async saveSession(record: AccountOnboardingSessionRecord): Promise<void> {
    this.sessions.set(record.sessionId, structuredClone(record));
  }

  async getSessionById(
    sessionId: string,
  ): Promise<AccountOnboardingSessionRecord | undefined> {
    const record = this.sessions.get(sessionId);
    return record ? structuredClone(record) : undefined;
  }

  close(): void {}
}

class InMemoryAccountStateStore implements AccountStateStore {
  private readonly accounts = new Map<string, PlatformAccountRecord>();

  async createAccount(record: PlatformAccountRecord): Promise<void> {
    this.accounts.set(record.accountId, structuredClone(record));
  }

  async saveAccount(record: PlatformAccountRecord): Promise<void> {
    this.accounts.set(record.accountId, structuredClone(record));
  }

  async getAccountById(
    accountId: string,
  ): Promise<PlatformAccountRecord | undefined> {
    const record = this.accounts.get(accountId);
    return record ? structuredClone(record) : undefined;
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
        return structuredClone(record);
      }
    }

    return undefined;
  }

  async listAccounts(): Promise<PlatformAccountRecord[]> {
    return Array.from(this.accounts.values()).map((record) =>
      structuredClone(record),
    );
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
  onboardingStartHandler: AccountPlatformPort["startOnboardingSession"] = async (
    input,
  ) => ({
    expectedCredentialType: input.expectedCredentialType ?? "token",
    sessionPayload: {
      ...input.payload,
    },
    expiresAt: input.requestedExpiresAt,
    challenge:
      input.authorizationMethod === "qr_authorization"
        ? {
            challengeType: "stub_qr",
          }
        : null,
  });

  onboardingResolveHandler: AccountPlatformPort["resolveOnboardingSession"] = async (
    _input,
  ) => ({
    verificationResult: "succeeded",
    reason: "resolved onboarding session",
    resolvedIdentity: {
      platform: this.platformCode,
      platformAccountUid: "uid-new",
    },
    profile: {
      displayName: "New Account",
      platformMetadata: {
        source: "stub",
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

  constructor(readonly platformCode: string) {}

  async startOnboardingSession(input: AccountPlatformOnboardingStartInput) {
    return this.onboardingStartHandler(input);
  }

  async resolveOnboardingSession(input: AccountPlatformOnboardingResolveInput) {
    return this.onboardingResolveHandler(input);
  }

  async startAuthorizationAttempt() {
    return {
      expectedCredentialType: "token",
      attemptPayload: {},
      expiresAt: null,
      challenge: null,
    };
  }

  async verifyAuthorizationAttempt() {
    return {
      verificationResult: "succeeded" as const,
      reason: "unused",
      resolvedIdentity: null,
      profile: null,
      credential: null,
    };
  }

  async checkAvailability() {
    return {
      availabilityStatus: "healthy" as const,
      reason: "unused",
    };
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

function createSequentialNow(): () => Date {
  let tick = 0;

  return () => {
    const date = new Date(Date.UTC(2026, 3, 21, 8, 0, tick));
    tick += 1;
    return date;
  };
}
