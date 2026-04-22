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

  it("creates, authorizes, checks availability, soft deletes, and restores an account through the stub runtime", async () => {
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const createResponse = await fetch(`${application.http.url}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: "bilibili",
        platformAccountUid: "account-bili-main",
        displayName: "Bili Main",
        remark: "primary",
        tags: ["main"],
        platformMetadata: {
          region: "cn",
        },
      }),
    });

    expect(createResponse.status).toBe(201);

    const createdAccount = (await createResponse.json()) as {
      accountId: string;
      platform: string;
      platformAccountUid: string;
      displayName: string;
      lifecycleStatus: string;
      authorizationStatus: string;
      availabilityStatus: string;
      activeCredential: { hasCredential: boolean };
    };

    expect(createdAccount.platform).toBe("bilibili");
    expect(createdAccount.platformAccountUid).toBe("account-bili-main");
    expect(createdAccount.authorizationStatus).toBe("unauthorized");
    expect(createdAccount.availabilityStatus).toBe("unknown");
    expect(createdAccount.activeCredential.hasCredential).toBe(false);

    const startAttemptResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/authorization-attempts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorizationMethod: "token_input",
          expectedCredentialType: "token",
          payload: {
            displayName: "Bili Main Verified",
            platformMetadata: {
              fanLevel: 7,
            },
            credentialPayload: {
              token: "stub-token-1",
              availabilityStatus: "healthy",
              availabilityReason: "stub reports healthy",
            },
          },
        }),
      },
    );

    expect(startAttemptResponse.status).toBe(202);

    const authorizationAttempt = (await startAttemptResponse.json()) as {
      attemptId: string;
      attemptStatus: string;
    };

    expect(authorizationAttempt.attemptStatus).toBe("pending_verification");

    const attemptDatabase = new DatabaseSync(runtimePaths.databaseFile);
    const attemptRow = attemptDatabase
      .prepare(
        `
          SELECT authorization_attempt_payload_ref AS authorizationAttemptPayloadRef
          FROM platform_accounts
          WHERE account_id = ?
        `,
      )
      .get(createdAccount.accountId) as
      | { authorizationAttemptPayloadRef: string }
      | undefined;
    attemptDatabase.close();

    const attemptSecretPath = join(
      runtimePaths.runtimeRoot,
      ".account-secrets",
      attemptRow!.authorizationAttemptPayloadRef,
    );
    await expect(access(attemptSecretPath)).resolves.toBeUndefined();
    await expect(readFile(attemptSecretPath, "utf8")).resolves.toContain(
      '"authorizationMethod":"token_input"',
    );

    const verifyResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/authorization-attempts/${authorizationAttempt.attemptId}/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationPayload: {},
        }),
      },
    );

    expect(verifyResponse.status).toBe(200);

    const verificationResult = (await verifyResponse.json()) as {
      verificationResult: string;
      activeCredentialSwitched: boolean;
      account: {
        displayName: string;
        authorizationStatus: string;
        availabilityStatus: string;
        activeCredential: {
          hasCredential: boolean;
          credentialType: string | null;
        };
        authorizationAttempt: {
          attemptStatus: string;
        } | null;
      };
    };

    expect(verificationResult.verificationResult).toBe("succeeded");
    expect(verificationResult.activeCredentialSwitched).toBe(true);
    expect(verificationResult.account.displayName).toBe("Bili Main Verified");
    expect(verificationResult.account.authorizationStatus).toBe("authorized");
    expect(verificationResult.account.availabilityStatus).toBe("unknown");
    expect(verificationResult.account.activeCredential.hasCredential).toBe(true);
    expect(verificationResult.account.activeCredential.credentialType).toBe("token");
    expect(verificationResult.account.authorizationAttempt?.attemptStatus).toBe(
      "verification_succeeded",
    );

    const credentialDatabase = new DatabaseSync(runtimePaths.databaseFile);
    const credentialRow = credentialDatabase
      .prepare(
        `
          SELECT active_credential_ref AS activeCredentialRef
          FROM platform_accounts
          WHERE account_id = ?
        `,
      )
      .get(createdAccount.accountId) as
      | { activeCredentialRef: string }
      | undefined;
    credentialDatabase.close();

    const credentialSecretPath = join(
      runtimePaths.runtimeRoot,
      ".account-secrets",
      credentialRow!.activeCredentialRef,
    );
    await expect(access(credentialSecretPath)).resolves.toBeUndefined();
    await expect(readFile(credentialSecretPath, "utf8")).resolves.toContain(
      '"token":"stub-token-1"',
    );

    const availabilityResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/availability-checks`,
      {
        method: "POST",
      },
    );

    expect(availabilityResponse.status).toBe(200);
    await expect(availabilityResponse.json()).resolves.toMatchObject({
      accountId: createdAccount.accountId,
      availabilityStatus: "healthy",
      hasActiveCredential: true,
      isConsumable: true,
    });

    const detailResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}`,
    );

    expect(detailResponse.status).toBe(200);

    const detail = (await detailResponse.json()) as Record<string, unknown>;
    expect(detail).not.toHaveProperty("activeCredential.payload");
    expect(detail).not.toHaveProperty("authorizationAttempt.payload");

    const consumableListResponse = await fetch(
      `${application.http.url}/api/accounts?onlyConsumable=true`,
    );
    await expect(consumableListResponse.json()).resolves.toMatchObject({
      items: [
        {
          accountId: createdAccount.accountId,
          isConsumable: true,
        },
      ],
    });

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

    const defaultListResponse = await fetch(`${application.http.url}/api/accounts`);
    await expect(defaultListResponse.json()).resolves.toEqual({
      items: [],
    });

    const includeDeletedResponse = await fetch(
      `${application.http.url}/api/accounts?includeDeleted=true`,
    );
    await expect(includeDeletedResponse.json()).resolves.toMatchObject({
      items: [
        {
          accountId: createdAccount.accountId,
          lifecycleStatus: "deleted",
        },
      ],
    });

    const recreatedResponse = await fetch(`${application.http.url}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: "bilibili",
        platformAccountUid: "account-bili-main",
        displayName: "Bili Main Restored",
      }),
    });

    expect(recreatedResponse.status).toBe(200);
    await expect(recreatedResponse.json()).resolves.toMatchObject({
      accountId: createdAccount.accountId,
      lifecycleStatus: "active",
      displayName: "Bili Main Restored",
    });
  });

  it("returns conflict states for duplicate identities, premature availability checks, and failed verification flows", async () => {
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );

    const createResponse = await fetch(`${application.http.url}/api/accounts`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        platform: "bilibili",
        platformAccountUid: "account-bili-side",
        displayName: "Bili Side",
      }),
    });
    const createdAccount = (await createResponse.json()) as {
      accountId: string;
    };

    const duplicateCreateResponse = await fetch(
      `${application.http.url}/api/accounts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "bilibili",
          platformAccountUid: "account-bili-side",
          displayName: "Bili Side",
        }),
      },
    );

    expect(duplicateCreateResponse.status).toBe(409);
    await expect(duplicateCreateResponse.json()).resolves.toMatchObject({
      code: "ACCOUNT_ALREADY_EXISTS",
    });

    const prematureAvailabilityResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/availability-checks`,
      {
        method: "POST",
      },
    );

    expect(prematureAvailabilityResponse.status).toBe(409);
    await expect(prematureAvailabilityResponse.json()).resolves.toMatchObject({
      code: "ACCOUNT_OPERATION_NOT_ALLOWED",
    });

    const startAttemptResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/authorization-attempts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorizationMethod: "token_input",
          payload: {
            token: "pending-token",
          },
        }),
      },
    );

    const authorizationAttempt = (await startAttemptResponse.json()) as {
      attemptId: string;
    };

    const verifyResponse = await fetch(
      `${application.http.url}/api/accounts/${createdAccount.accountId}/authorization-attempts/${authorizationAttempt.attemptId}/verify`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          verificationPayload: {
            resolvedPlatformAccountUid: "different-uid",
          },
        }),
      },
    );

    expect(verifyResponse.status).toBe(200);
    await expect(verifyResponse.json()).resolves.toMatchObject({
      verificationResult: "failed",
      activeCredentialSwitched: false,
      account: {
        authorizationStatus: "unauthorized",
        authorizationAttempt: {
          attemptStatus: "verification_failed",
        },
      },
    });
  });

  it("creates an account through onboarding sessions and exposes challenge summaries for interactive flows", async () => {
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
    );

    const startSessionResponse = await fetch(
      `${application.http.url}/api/account-onboarding-sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "bilibili",
          authorizationMethod: "token_input",
          expectedCredentialType: "token",
          payload: {
            resolvedPlatformAccountUid: "onboard-bili-main",
            displayName: "Onboarded Bili Main",
            platformMetadata: {
              region: "cn",
            },
            credentialPayload: {
              token: "onboarding-token-1",
            },
          },
        }),
      },
    );

    expect(startSessionResponse.status).toBe(201);

    const startedSession = (await startSessionResponse.json()) as {
      sessionId: string;
      sessionStatus: string;
    };

    expect(startedSession.sessionStatus).toBe("pending_resolution");

    const resolveSessionResponse = await fetch(
      `${application.http.url}/api/account-onboarding-sessions/${startedSession.sessionId}/resolve`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          resolutionPayload: {},
        }),
      },
    );

    expect(resolveSessionResponse.status).toBe(200);
    await expect(resolveSessionResponse.json()).resolves.toMatchObject({
      sessionId: startedSession.sessionId,
      sessionStatus: "resolved",
      resolvedIdentity: {
        platformAccountUid: "onboard-bili-main",
      },
      hasCandidateCredential: true,
    });

    const finalizeSessionResponse = await fetch(
      `${application.http.url}/api/account-onboarding-sessions/${startedSession.sessionId}/finalize`,
      {
        method: "POST",
      },
    );

    expect(finalizeSessionResponse.status).toBe(200);

    const finalizedSession = (await finalizeSessionResponse.json()) as {
      finalDisposition: string;
      accountId: string;
      account: {
        platformAccountUid: string;
        authorizationStatus: string;
      };
    };

    expect(finalizedSession.finalDisposition).toBe("created");
    expect(finalizedSession.account.platformAccountUid).toBe("onboard-bili-main");
    expect(finalizedSession.account.authorizationStatus).toBe("authorized");

    const qrSessionResponse = await fetch(
      `${application.http.url}/api/account-onboarding-sessions`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          platform: "bilibili",
          authorizationMethod: "qr_authorization",
          payload: {},
        }),
      },
    );

    expect(qrSessionResponse.status).toBe(201);
    await expect(qrSessionResponse.json()).resolves.toMatchObject({
      challenge: {
        challengeType: "stub_qr",
      },
    });

    const qrAttemptResponse = await fetch(
      `${application.http.url}/api/accounts/${finalizedSession.accountId}/authorization-attempts`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          authorizationMethod: "qr_authorization",
          payload: {},
        }),
      },
    );

    expect(qrAttemptResponse.status).toBe(202);
    await expect(qrAttemptResponse.json()).resolves.toMatchObject({
      challenge: {
        challengeType: "stub_qr",
      },
    });
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-account-module-"),
  );
  temporaryDirectories.push(workingDirectory);

  const application = await startApplication({
    workingDirectory,
    port: 0,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}
