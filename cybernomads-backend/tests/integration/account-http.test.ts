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

  it("runs the manual-token flow end to end and preserves the old token when replacement validation fails", async () => {
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

    expect(createdAccount.loginStatus).toBe("not_logged_in");
    expect(createdAccount.activeToken.hasToken).toBe(false);

    const startedAttempt = await startConnectionAttempt(application, createdAccount.accountId, {
      connectionMethod: "manual_token",
      tokenValue: "stable-token",
    });

    expect(startedAttempt.attemptStatus).toBe("ready_for_validation");
    expect(startedAttempt.hasCandidateToken).toBe(true);

    const validatedAttempt = await validateConnectionAttempt(
      application,
      createdAccount.accountId,
      startedAttempt.attemptId,
      {},
    );

    expect(validatedAttempt.validationResult).toBe("succeeded");
    expect(validatedAttempt.tokenApplied).toBe(true);
    expect(validatedAttempt.account.loginStatus).toBe("connected");
    expect(
      validatedAttempt.account.resolvedPlatformProfile.resolvedPlatformAccountUid,
    ).toContain("stub-bili-uid");
    expect(validatedAttempt.account.activeToken.hasToken).toBe(true);

    const attemptLogs = await fetchJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/connection-attempts/${startedAttempt.attemptId}/logs`,
    );
    expect(attemptLogs.entries.length).toBeGreaterThan(0);

    const availabilityCheck = await postJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/availability-checks`,
      {},
      false,
    );
    expect(availabilityCheck.status).toBe(200);
    await expect(availabilityCheck.json()).resolves.toMatchObject({
      accountId: createdAccount.accountId,
      availabilityStatus: "healthy",
      isConsumable: true,
    });

    const accountDatabase = new DatabaseSync(runtimePaths.databaseFile);
    const activeTokenRow = accountDatabase
      .prepare(
        `
          SELECT active_token_ref AS activeTokenRef
          FROM accounts
          WHERE account_id = ?
        `,
      )
      .get(createdAccount.accountId) as { activeTokenRef: string } | undefined;
    accountDatabase.close();

    const activeTokenPath = join(
      runtimePaths.runtimeRoot,
      ".account-secrets",
      activeTokenRow!.activeTokenRef,
    );
    await expect(access(activeTokenPath)).resolves.toBeUndefined();
    await expect(readFile(activeTokenPath, "utf8")).resolves.toContain(
      '"token":"stable-token"',
    );

    const replacementAttempt = await startConnectionAttempt(
      application,
      createdAccount.accountId,
      {
        connectionMethod: "manual_token",
        tokenValue: "broken-token",
      },
    );
    const failedValidation = await validateConnectionAttempt(
      application,
      createdAccount.accountId,
      replacementAttempt.attemptId,
      {
        validationPayload: {
          forceResult: "failed",
          reason: "token expired",
        },
      },
    );

    expect(failedValidation.validationResult).toBe("failed");
    expect(failedValidation.tokenApplied).toBe(false);
    expect(failedValidation.account.loginStatus).toBe("connected");
    expect(failedValidation.attempt.attemptStatus).toBe("validation_failed");

    const detail = await fetchJson(
      `${application.http.url}/api/accounts/${createdAccount.accountId}`,
    );
    expect(detail.activeToken.hasToken).toBe(true);
    expect(detail.latestConnectionAttempt.attemptStatus).toBe("validation_failed");

    await expect(readFile(activeTokenPath, "utf8")).resolves.toContain(
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

    const qrAttempt = await startConnectionAttempt(application, createdAccount.accountId, {
      connectionMethod: "qr_login",
      context: {
        qrSeed: "qr-account",
      },
    });

    expect(qrAttempt.attemptStatus).toBe("pending_resolution");
    expect(qrAttempt.challenge).toMatchObject({
      challengeType: "qr_image",
    });

    const resolvedAttempt = await resolveConnectionAttempt(
      application,
      createdAccount.accountId,
      qrAttempt.attemptId,
      {},
    );
    expect(resolvedAttempt.attemptStatus).toBe("ready_for_validation");
    expect(resolvedAttempt.hasCandidateToken).toBe(true);

    const validatedAttempt = await validateConnectionAttempt(
      application,
      createdAccount.accountId,
      qrAttempt.attemptId,
      {},
    );
    expect(validatedAttempt.validationResult).toBe("succeeded");
    expect(validatedAttempt.account.loginStatus).toBe("connected");

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
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(join(tmpdir(), "cybernomads-account-http-"));
  temporaryDirectories.push(workingDirectory);
  const application = await startApplication({ workingDirectory, port: 0 });
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

async function startConnectionAttempt(
  application: ApplicationReadyState,
  accountId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/connection-attempts`,
    payload,
  );
  expect(response.status).toBe(201);
  return response.json();
}

async function resolveConnectionAttempt(
  application: ApplicationReadyState,
  accountId: string,
  attemptId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/connection-attempts/${attemptId}/resolve`,
    payload,
  );
  expect(response.status).toBe(200);
  return response.json();
}

async function validateConnectionAttempt(
  application: ApplicationReadyState,
  accountId: string,
  attemptId: string,
  payload: Record<string, unknown>,
): Promise<any> {
  const response = await postJson(
    `${application.http.url}/api/accounts/${accountId}/connection-attempts/${attemptId}/validate`,
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
  sendBody = true,
): Promise<Response> {
  return fetch(url, {
    method: "POST",
    headers: sendBody
      ? {
          "Content-Type": "application/json",
        }
      : undefined,
    body: sendBody ? JSON.stringify(payload) : undefined,
  });
}
