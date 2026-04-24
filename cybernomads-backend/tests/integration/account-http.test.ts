import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";
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

describe.sequential("account module http api", () => {
  const temporaryDirectories: string[] = [];
  const applications: ApplicationReadyState[] = [];

  afterAll(async () => {
    await Promise.all(applications.map((application) => application.close()));
    await Promise.all(
      temporaryDirectories.map((temporaryDirectory) =>
        rm(temporaryDirectory, { recursive: true, force: true }),
      ),
    );
  });

  it("runs the manual-token flow end to end and preserves the old credential when replacement verification fails", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const createdAccount = await createAccount(application, {
      platform: "bilibili",
      internalDisplayName: "Bili 主号",
      remark: "主账号包装对象",
      tags: ["main"],
      platformMetadata: {
        region: "cn",
      },
    });

    expect(createdAccount.connectionStatus).toBe("not_logged_in");
    expect(createdAccount.currentCredential.hasCredential).toBe(false);

    const startedSession = await startTokenAccessSession(
      application,
      createdAccount.accountId,
      {
        token: "stable-token",
      },
    );

    expect(startedSession.sessionStatus).toBe("ready_for_verification");
    expect(startedSession.hasCandidateCredential).toBe(true);

    const verifiedSession = await verifyAccessSession(
      application,
      createdAccount.accountId,
      startedSession.sessionId,
      {},
    );

    expect(verifiedSession.verificationResult).toBe("succeeded");
    expect(verifiedSession.credentialApplied).toBe(true);
    expect(verifiedSession.account.connectionStatus).toBe("connected");
    expect(
      verifiedSession.account.resolvedPlatformProfile.resolvedPlatformAccountUid,
    ).toContain("stub");
    expect(verifiedSession.account.currentCredential.hasCredential).toBe(true);

    const sessionLogs = await fetchJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/access-sessions/${startedSession.sessionId}/logs`,
    );
    expect(sessionLogs.entries.length).toBeGreaterThan(0);

    const accountDatabase = new DatabaseSync(runtimePaths.databaseFile);
    const activeCredentialRow = accountDatabase
      .prepare(
        `
          SELECT active_credential_ref AS activeCredentialRef
          FROM accounts
          WHERE account_id = ?
        `,
      )
      .get(createdAccount.accountId) as { activeCredentialRef: string } | undefined;
    accountDatabase.close();

    const activeCredentialPath = join(
      runtimePaths.runtimeRoot,
      ".account-secrets",
      activeCredentialRow!.activeCredentialRef,
    );
    await expect(access(activeCredentialPath)).resolves.toBeUndefined();
    await expect(readFile(activeCredentialPath, "utf8")).resolves.toContain(
      '"token":"stable-token"',
    );

    const replacementSession = await startTokenAccessSession(
      application,
      createdAccount.accountId,
      {
        token: "broken-token",
      },
    );
    const failedVerification = await verifyAccessSession(
      application,
      createdAccount.accountId,
      replacementSession.sessionId,
      {},
    );

    expect(failedVerification.verificationResult).toBe("failed");
    expect(failedVerification.credentialApplied).toBe(false);
    expect(failedVerification.account.connectionStatus).toBe("connected");

    await expect(readFile(activeCredentialPath, "utf8")).resolves.toContain(
      '"token":"stable-token"',
    );
  });

  it("runs the qr-login flow, then supports delete and restore", async () => {
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );

    const createdAccount = await createAccount(application, {
      platform: "bilibili",
      internalDisplayName: "Bili 二维码账号",
    });

    const qrSession = await startQrAccessSession(application, createdAccount.accountId, {});

    expect(qrSession.sessionStatus).toBe("waiting_for_scan");
    expect(qrSession.challenge).toMatchObject({
      challengeType: "qr_image",
    });

    const polledSession = await pollAccessSession(
      application,
      createdAccount.accountId,
      qrSession.sessionId,
      {},
    );
    expect(
      ["waiting_for_scan", "waiting_for_confirmation", "ready_for_verification", "expired"],
    ).toContain(polledSession.sessionStatus);

    const deleteResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}`,
      {
        method: "DELETE",
      },
    );
    expect(deleteResponse.status).toBe(200);
    await expect(deleteResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "deleted",
    });

    const restoreResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/restore`,
      {
        method: "POST",
      },
    );
    expect(restoreResponse.status).toBe(200);
    await expect(restoreResponse.json()).resolves.toMatchObject({
      lifecycleStatus: "active",
    });
  });

  it("expires an unscanned qr session after one minute and falls back to not_logged_in", async () => {
    const now = createMutableNow("2026-04-24T08:00:00.000Z");
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      { now: now.current },
    );

    const createdAccount = await createAccount(application, {
      platform: "bilibili",
      internalDisplayName: "Bili 超时二维码账号",
    });

    const qrSession = await startQrAccessSession(application, createdAccount.accountId, {});

    expect(qrSession.sessionStatus).toBe("waiting_for_scan");
    expect(qrSession.expiresAt).toBe("2026-04-24T08:01:00.000Z");

    now.set("2026-04-24T08:01:01.000Z");

    const detail = await fetchJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}`,
    );

    expect(detail.connectionStatus).toBe("not_logged_in");
    expect(detail.connectionStatusReason).toContain("QR access session expired");
    expect(detail.currentAccessSession.sessionStatus).toBe("expired");
  });

  it("keeps the active credential valid after qr session timeout once login already succeeded", async () => {
    const now = createMutableNow("2026-04-24T08:00:00.000Z");
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      { now: now.current },
    );

    const createdAccount = await createAccount(application, {
      platform: "bilibili",
      internalDisplayName: "Bili 扫码登录成功账号",
    });

    const qrSession = await startQrAccessSession(
      application,
      createdAccount.accountId,
      {},
    );
    const polledSession = await pollAccessSession(
      application,
      createdAccount.accountId,
      qrSession.sessionId,
      {},
    );

    expect(polledSession.sessionStatus).toBe("ready_for_verification");

    const verification = await verifyAccessSession(
      application,
      createdAccount.accountId,
      qrSession.sessionId,
      {},
    );

    expect(verification.verificationResult).toBe("succeeded");
    expect(verification.account.connectionStatus).toBe("connected");
    expect(verification.account.currentCredential.expiresAt).toBeNull();

    now.set("2026-04-24T08:01:30.000Z");

    const detail = await fetchJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}`,
    );

    expect(detail.connectionStatus).toBe("connected");
    expect(detail.currentCredential.expiresAt).toBeNull();
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
  options: { now?: () => Date } = {},
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(join(tmpdir(), "cybernomads-account-http-"));
  temporaryDirectories.push(workingDirectory);
  const application = await startApplication({
    workingDirectory,
    port: 0,
    accountPlatforms: [new FakeHttpAccountPlatform()],
    now: options.now,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}

async function createAccount(
  application: ApplicationReadyState,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(`${application.http.url}/api/accounts`, payload);
  expect(response.status).toBe(201);
  return response.json();
}

async function startTokenAccessSession(
  application: ApplicationReadyState,
  accountId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/access-sessions/token`,
    payload,
  );
  expect(response.status).toBe(201);
  return response.json();
}

async function startQrAccessSession(
  application: ApplicationReadyState,
  accountId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/access-sessions/qr`,
    payload,
  );
  expect(response.status).toBe(201);
  return response.json();
}

async function pollAccessSession(
  application: ApplicationReadyState,
  accountId: string,
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/access-sessions/${sessionId}/poll`,
    payload,
  );
  expect(response.status).toBe(200);
  return response.json();
}

async function verifyAccessSession(
  application: ApplicationReadyState,
  accountId: string,
  sessionId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/access-sessions/${sessionId}/verify`,
    payload,
  );
  expect(response.status).toBe(200);
  return response.json();
}

async function fetchJson(url: string): Promise<any> {
  const response = await fetch(url);
  expect(response.status).toBe(200);
  return response.json();
}

async function postJson(
  url: string,
  payload: Record<string, unknown>,
  includeBody = true,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: includeBody
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: includeBody ? JSON.stringify(payload) : undefined,
  });
}

class FakeHttpAccountPlatform implements AccountPlatformPort {
  readonly platformCode = "bilibili";

  async startQrSession(
    input: AccountPlatformStartQrSessionInput,
  ): Promise<AccountPlatformStartQrSessionResult> {
    return {
      challenge: {
        challengeType: "qr_image",
        imageUrl: "data:image/svg+xml;base64,PHN2Zy8+",
      },
      providerSession: {
        qrcodeKey: "qr-1",
      },
      expiresAt: input.requestedExpiresAt,
      logs: [
        {
          timestamp: "2026-04-24T08:00:00.000Z",
          level: "info",
          message: "qr started",
        },
      ],
    };
  }

  async pollQrSession(
    _input: AccountPlatformPollQrSessionInput,
  ): Promise<AccountPlatformPollQrSessionResult> {
    return {
      progressStatus: "ready_for_verification",
      providerSession: {
        qrcodeKey: "qr-1",
      },
      candidateCredential: {
        token: "qr-token",
      },
      candidateCredentialExpiresAt: null,
      reason: "credential resolved",
      expiresAt: null,
      logs: [
        {
          timestamp: "2026-04-24T08:00:01.000Z",
          level: "info",
          message: "qr resolved",
        },
      ],
    };
  }

  async verifyCredential(
    input: AccountPlatformVerifyCredentialInput,
  ): Promise<AccountPlatformVerifyCredentialResult> {
    if (String(input.candidateCredential.token).includes("broken")) {
      return {
        verificationResult: "failed",
        reason: "token invalid",
        resolvedPlatformProfile: null,
        credential: null,
        credentialExpiresAt: null,
        logs: [
          {
            timestamp: "2026-04-24T08:00:02.000Z",
            level: "error",
            message: "verification failed",
          },
        ],
      };
    }

    return {
      verificationResult: "succeeded",
      reason: "verified",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: `stub-${String(input.candidateCredential.token)}`,
        resolvedDisplayName: "平台账号",
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
      },
      credential: {
        token: input.candidateCredential.token,
      },
      credentialExpiresAt: null,
      logs: [
        {
          timestamp: "2026-04-24T08:00:03.000Z",
          level: "info",
          message: "verification succeeded",
        },
      ],
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
