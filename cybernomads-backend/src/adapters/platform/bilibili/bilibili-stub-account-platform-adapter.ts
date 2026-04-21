import type {
  AccountPlatformAuthorizationStartInput,
  AccountPlatformAuthorizationStartResult,
  AccountPlatformAuthorizationVerifyInput,
  AccountPlatformAuthorizationVerifyResult,
  AccountPlatformAvailabilityCheckInput,
  AccountPlatformAvailabilityCheckResult,
  AccountPlatformPort,
} from "../../../ports/account-platform-port.js";
import type { AvailabilityStatus, JsonObject } from "../../../modules/accounts/types.js";

export class BilibiliStubAccountPlatformAdapter implements AccountPlatformPort {
  readonly platformCode = "bilibili";

  async startAuthorizationAttempt(
    input: AccountPlatformAuthorizationStartInput,
  ): Promise<AccountPlatformAuthorizationStartResult> {
    const attemptPayload = {
      ...ensureJsonObject(input.payload),
      platformCode: this.platformCode,
      authorizationMethod: input.authorizationMethod,
    };

    return {
      expectedCredentialType:
        input.expectedCredentialType ??
        inferCredentialType(input.authorizationMethod),
      attemptPayload,
      expiresAt: input.requestedExpiresAt,
      challenge:
        input.authorizationMethod === "qr_authorization"
          ? {
              challengeType: "stub_qr",
              message: "Stub QR challenge created.",
            }
          : null,
    };
  }

  async verifyAuthorizationAttempt(
    input: AccountPlatformAuthorizationVerifyInput,
  ): Promise<AccountPlatformAuthorizationVerifyResult> {
    const attemptPayload = ensureJsonObject(input.attemptPayload);
    const verificationPayload = ensureJsonObject(input.verificationPayload);
    const forcedResult = resolveStringValue(
      verificationPayload.forceResult,
      attemptPayload.forceResult,
    );

    if (forcedResult === "failed") {
      return {
        verificationResult: "failed",
        reason:
          resolveStringValue(
            verificationPayload.reason,
            attemptPayload.reason,
          ) ?? "Stub verification failed.",
        resolvedIdentity: null,
        profile: null,
        credential: null,
      };
    }

    const resolvedPlatformAccountUid =
      resolveStringValue(
        verificationPayload.resolvedPlatformAccountUid,
        attemptPayload.resolvedPlatformAccountUid,
      ) ?? input.account.platformAccountUid;
    const resolvedDisplayName =
      resolveStringValue(
        verificationPayload.displayName,
        attemptPayload.displayName,
      ) ?? input.account.displayName;
    const credentialPayload = resolveCredentialPayload(
      verificationPayload,
      attemptPayload,
      input.account.platformAccountUid,
    );
    const expiresAt =
      resolveNullableString(
        verificationPayload.credentialExpiresAt,
        attemptPayload.credentialExpiresAt,
      ) ?? null;

    return {
      verificationResult: "succeeded",
      reason:
        resolveStringValue(
          verificationPayload.reason,
          attemptPayload.reason,
        ) ?? "Stub verification succeeded.",
      resolvedIdentity: {
        platform: this.platformCode,
        platformAccountUid: resolvedPlatformAccountUid,
      },
      profile: {
        displayName: resolvedDisplayName,
        platformMetadata: {
          ...input.account.platformMetadata,
          ...resolveObjectValue(attemptPayload.platformMetadata),
          ...resolveObjectValue(verificationPayload.platformMetadata),
          stubVerified: true,
          lastAuthorizationMethod: input.authorizationMethod,
        },
      },
      credential: {
        credentialType:
          input.expectedCredentialType ??
          inferCredentialType(input.authorizationMethod),
        payload: credentialPayload,
        expiresAt,
      },
    };
  }

  async checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult> {
    const payload = ensureJsonObject(input.activeCredential.payload);
    const availabilityStatus = resolveAvailabilityStatus(payload.availabilityStatus);

    return {
      availabilityStatus,
      reason:
        resolveStringValue(payload.availabilityReason) ??
        (availabilityStatus === "healthy"
          ? "Stub availability check succeeded."
          : `Stub availability reported ${availabilityStatus}.`),
    };
  }
}

function inferCredentialType(authorizationMethod: string): string {
  switch (authorizationMethod) {
    case "cookie_input":
      return "cookie";
    case "qr_authorization":
      return "session";
    case "token_input":
    default:
      return "token";
  }
}

function resolveCredentialPayload(
  verificationPayload: JsonObject,
  attemptPayload: JsonObject,
  platformAccountUid: string,
): JsonObject {
  const candidatePayload =
    resolveObjectValue(verificationPayload.credentialPayload) ??
    resolveObjectValue(attemptPayload.credentialPayload);

  if (candidatePayload) {
    return candidatePayload;
  }

  return {
    token: `stub-token-${platformAccountUid}`,
    availabilityStatus:
      resolveAvailabilityStatus(
        verificationPayload.availabilityStatus ?? attemptPayload.availabilityStatus,
      ),
    availabilityReason:
      resolveStringValue(
        verificationPayload.availabilityReason,
        attemptPayload.availabilityReason,
      ) ?? "Stub availability check succeeded.",
  };
}

function resolveAvailabilityStatus(value: unknown): AvailabilityStatus {
  if (
    value === "healthy" ||
    value === "risk" ||
    value === "restricted" ||
    value === "offline"
  ) {
    return value;
  }

  return "healthy";
}

function resolveStringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveNullableString(...values: unknown[]): string | undefined {
  for (const value of values) {
    if (value === null) {
      return undefined;
    }

    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return undefined;
}

function resolveObjectValue(value: unknown): JsonObject | null {
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
