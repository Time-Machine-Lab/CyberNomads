import type {
  AccountPlatformOnboardingResolveInput,
  AccountPlatformOnboardingStartInput,
  AccountPlatformOnboardingStartResult,
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

  async startOnboardingSession(
    input: AccountPlatformOnboardingStartInput,
  ): Promise<AccountPlatformOnboardingStartResult> {
    const sessionPayload = {
      ...ensureJsonObject(input.payload),
      platformCode: this.platformCode,
      authorizationMethod: input.authorizationMethod,
    };

    return {
      expectedCredentialType:
        input.expectedCredentialType ??
        inferCredentialType(input.authorizationMethod),
      sessionPayload,
      expiresAt: input.requestedExpiresAt,
      challenge:
        input.authorizationMethod === "qr_authorization"
          ? {
              challengeType: "stub_qr",
              imageUrl: createStubQrCodeDataUrl(
                `${this.platformCode}:${input.authorizationMethod}`,
              ),
              message: "Stub QR challenge created.",
            }
          : null,
    };
  }

  async resolveOnboardingSession(
    input: AccountPlatformOnboardingResolveInput,
  ): Promise<AccountPlatformAuthorizationVerifyResult> {
    const sessionPayload = ensureJsonObject(input.sessionPayload);
    const resolutionPayload = ensureJsonObject(input.resolutionPayload);
    const inputPayload = ensureJsonObject(input.inputPayload);
    const credentialSeed = resolveCredentialSeed(
      inputPayload,
      sessionPayload,
      resolutionPayload,
    );
    const forcedResult = resolveStringValue(
      resolutionPayload.forceResult,
      sessionPayload.forceResult,
      inputPayload.forceResult,
    );

    if (forcedResult === "failed") {
      return {
        verificationResult: "failed",
        reason:
          resolveStringValue(
            resolutionPayload.reason,
            sessionPayload.reason,
            inputPayload.reason,
          ) ?? "Stub onboarding resolution failed.",
        resolvedIdentity: null,
        profile: null,
        credential: null,
      };
    }

    const resolvedPlatformAccountUid =
      resolveStringValue(
        resolutionPayload.resolvedPlatformAccountUid,
        sessionPayload.resolvedPlatformAccountUid,
        inputPayload.resolvedPlatformAccountUid,
      ) ??
      (credentialSeed ? `stub-${this.platformCode}-${credentialSeed}` : null) ??
      `stub-${this.platformCode}-uid`;
    const resolvedDisplayName =
      resolveStringValue(
        resolutionPayload.displayName,
        sessionPayload.displayName,
        inputPayload.displayName,
      ) ??
      (credentialSeed ? `Stub ${this.platformCode} ${credentialSeed}` : null) ??
      `Stub ${this.platformCode} account`;
    const credentialPayload = resolveCredentialPayload(
      resolutionPayload,
      sessionPayload,
      resolvedPlatformAccountUid,
    );
    const expiresAt =
      resolveNullableString(
        resolutionPayload.credentialExpiresAt,
        sessionPayload.credentialExpiresAt,
        inputPayload.credentialExpiresAt,
      ) ?? null;

    return {
      verificationResult: "succeeded",
      reason:
        resolveStringValue(
          resolutionPayload.reason,
          sessionPayload.reason,
          inputPayload.reason,
        ) ?? "Stub onboarding resolution succeeded.",
      resolvedIdentity: {
        platform: this.platformCode,
        platformAccountUid: resolvedPlatformAccountUid,
      },
      profile: {
        displayName: resolvedDisplayName,
        platformMetadata: {
          ...resolveObjectValue(inputPayload.platformMetadata),
          ...resolveObjectValue(sessionPayload.platformMetadata),
          ...resolveObjectValue(resolutionPayload.platformMetadata),
          stubResolved: true,
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

function createStubQrCodeDataUrl(label: string): string {
  const svg = `
    <svg xmlns="http://www.w3.org/2000/svg" width="240" height="240" viewBox="0 0 240 240">
      <rect width="240" height="240" fill="#ffffff"/>
      <rect x="20" y="20" width="200" height="200" rx="16" fill="#111111"/>
      <rect x="36" y="36" width="54" height="54" fill="#ffffff"/>
      <rect x="42" y="42" width="42" height="42" fill="#111111"/>
      <rect x="48" y="48" width="30" height="30" fill="#ffffff"/>
      <rect x="150" y="36" width="54" height="54" fill="#ffffff"/>
      <rect x="156" y="42" width="42" height="42" fill="#111111"/>
      <rect x="162" y="48" width="30" height="30" fill="#ffffff"/>
      <rect x="36" y="150" width="54" height="54" fill="#ffffff"/>
      <rect x="42" y="156" width="42" height="42" fill="#111111"/>
      <rect x="48" y="162" width="30" height="30" fill="#ffffff"/>
      <g fill="#ffffff">
        <rect x="112" y="112" width="12" height="12"/>
        <rect x="136" y="112" width="12" height="12"/>
        <rect x="160" y="112" width="12" height="12"/>
        <rect x="112" y="136" width="12" height="12"/>
        <rect x="148" y="136" width="12" height="12"/>
        <rect x="172" y="136" width="12" height="12"/>
        <rect x="100" y="160" width="12" height="12"/>
        <rect x="124" y="160" width="12" height="12"/>
        <rect x="148" y="160" width="12" height="12"/>
        <rect x="172" y="160" width="12" height="12"/>
        <rect x="112" y="184" width="12" height="12"/>
        <rect x="136" y="184" width="12" height="12"/>
        <rect x="184" y="184" width="12" height="12"/>
      </g>
      <text x="120" y="224" fill="#111111" font-size="12" text-anchor="middle" font-family="Arial, sans-serif">${escapeXml(
        label,
      )}</text>
    </svg>
  `.trim();

  return `data:image/svg+xml;charset=UTF-8,${encodeURIComponent(svg)}`;
}

function escapeXml(value: string): string {
  return value
    .replaceAll("&", "&amp;")
    .replaceAll("<", "&lt;")
    .replaceAll(">", "&gt;")
    .replaceAll('"', "&quot;")
    .replaceAll("'", "&apos;");
}

function resolveCredentialSeed(...values: JsonObject[]): string | null {
  for (const value of values) {
    const credentialPayload = resolveObjectValue(value.credentialPayload);
    const rawSeed =
      resolveStringValue(
        credentialPayload?.token,
        credentialPayload?.cookie,
        value.token,
        value.cookie,
      ) ?? null;

    if (!rawSeed) {
      continue;
    }

    const normalized = rawSeed
      .trim()
      .toLowerCase()
      .replaceAll(/[^a-z0-9]+/g, "-")
      .replaceAll(/^-+|-+$/g, "");

    if (normalized.length > 0) {
      return normalized.slice(0, 32);
    }
  }

  return null;
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
