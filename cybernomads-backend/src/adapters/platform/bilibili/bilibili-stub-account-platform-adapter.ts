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
} from "../../../ports/account-platform-port.js";
import type { JsonObject } from "../../../modules/accounts/types.js";
import type { ConnectionAttemptLogEntry } from "../../../modules/account-connection-attempts/types.js";

export class BilibiliStubAccountPlatformAdapter implements AccountPlatformPort {
  readonly platformCode = "bilibili";

  async startConnectionAttempt(
    input: AccountPlatformStartConnectionAttemptInput,
  ): Promise<AccountPlatformStartConnectionAttemptResult> {
    const logs = [createLog("info", "connection attempt started")];

    if (input.connectionMethod === "manual_token") {
      return {
        challenge: null,
        platformSession: { source: "manual_token" },
        candidateToken: input.tokenValue ? { token: input.tokenValue } : null,
        expiresAt: input.requestedExpiresAt,
        logs,
      };
    }

    return {
      challenge: {
        challengeType: "qr_image",
        imageUrl: createStubQrCodeDataUrl(
          `${this.platformCode}:${String(input.context.qrSeed ?? "default")}`,
        ),
        message: "请使用平台客户端扫码，扫码完成后点击解析二维码。",
      },
      platformSession: {
        source: "qr_login",
        qrSeed: String(input.context.qrSeed ?? "stub"),
      },
      candidateToken: null,
      expiresAt: input.requestedExpiresAt,
      logs,
    };
  }

  async resolveConnectionAttempt(
    input: AccountPlatformResolveConnectionAttemptInput,
  ): Promise<AccountPlatformResolveConnectionAttemptResult> {
    const seed = resolveStringValue(
      input.resolutionPayload.tokenSeed,
      input.platformSession.qrSeed,
      "qr-token",
    );

    return {
      platformSession: input.platformSession,
      candidateToken: {
        token: `resolved-${seed}`,
        source: input.connectionMethod,
      },
      reason: "Stub QR token resolved.",
      expiresAt: null,
      logs: [createLog("info", "connection attempt resolved")],
    };
  }

  async validateConnectionAttempt(
    input: AccountPlatformValidateConnectionAttemptInput,
  ): Promise<AccountPlatformValidateConnectionAttemptResult> {
    const forcedResult = resolveStringValue(
      input.validationPayload.forceResult,
      input.candidateToken.forceResult,
    );

    if (forcedResult === "failed") {
      return {
        validationResult: "failed",
        reason:
          resolveStringValue(
            input.validationPayload.reason,
            input.candidateToken.reason,
          ) ?? "Stub token validation failed.",
        resolvedPlatformProfile: null,
        token: null,
        tokenExpiresAt: null,
        logs: [createLog("error", "token validation failed")],
      };
    }

    const tokenSeed =
      resolveStringValue(
        input.validationPayload.resolvedPlatformAccountUid,
        input.candidateToken.resolvedPlatformAccountUid,
        input.candidateToken.token,
      ) ?? "default";

    return {
      validationResult: "succeeded",
      reason:
        resolveStringValue(input.validationPayload.reason) ??
        "Stub token validation succeeded.",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: `stub-bili-uid-${sanitizeSeed(tokenSeed)}`,
        resolvedDisplayName:
          resolveStringValue(input.validationPayload.displayName) ??
          input.account.internalDisplayName,
        resolvedAvatarUrl: resolveStringValue(input.validationPayload.avatarUrl),
        resolvedProfileMetadata: {
          ...input.account.platformMetadata,
          ...resolveObjectValue(input.validationPayload.platformMetadata),
          stubVerified: true,
        },
      },
      token: {
        ...input.candidateToken,
        platform: this.platformCode,
      },
      tokenExpiresAt: resolveStringValue(
        input.validationPayload.tokenExpiresAt,
        input.candidateToken.tokenExpiresAt,
      ),
      logs: [createLog("info", "token validation succeeded")],
    };
  }

  async checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult> {
    const status = resolveStringValue(input.activeToken.availabilityStatus);

    return {
      availabilityStatus:
        status === "risk" ||
        status === "restricted" ||
        status === "offline" ||
        status === "unknown"
          ? status
          : "healthy",
      reason:
        resolveStringValue(input.activeToken.availabilityReason) ??
        "Stub availability check succeeded.",
    };
  }
}

function createLog(
  level: ConnectionAttemptLogEntry["level"],
  message: string,
): ConnectionAttemptLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
}

function resolveStringValue(...values: unknown[]): string | null {
  for (const value of values) {
    if (typeof value === "string" && value.trim().length > 0) {
      return value.trim();
    }
  }

  return null;
}

function resolveObjectValue(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return {};
  }

  return { ...(value as JsonObject) };
}

function sanitizeSeed(value: string): string {
  return value.replace(/[^a-zA-Z0-9_-]/g, "-").slice(0, 48);
}

function createStubQrCodeDataUrl(seed: string): string {
  const svg = `<svg xmlns="http://www.w3.org/2000/svg" width="180" height="180" viewBox="0 0 180 180"><rect width="180" height="180" fill="#0f1115"/><rect x="20" y="20" width="42" height="42" fill="#8ff5ff"/><rect x="118" y="20" width="42" height="42" fill="#8ff5ff"/><rect x="20" y="118" width="42" height="42" fill="#8ff5ff"/><text x="90" y="96" fill="#8ff5ff" font-size="13" text-anchor="middle" font-family="monospace">${seed.slice(0, 12)}</text></svg>`;
  return `data:image/svg+xml;base64,${Buffer.from(svg).toString("base64")}`;
}
