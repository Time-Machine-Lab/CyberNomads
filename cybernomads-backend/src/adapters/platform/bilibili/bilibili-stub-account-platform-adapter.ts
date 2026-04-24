import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

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
} from "../../../ports/account-platform-port.js";
import type { JsonObject } from "../../../modules/accounts/types.js";
import type { AccessSessionLogEntry } from "../../../modules/account-access-sessions/types.js";
import { resolveBundledRuntimeSkillsDirectory } from "../../skill/local/runtime-skill-assets.js";
import { runJsonScriptCommand } from "../shared/node-script-command-runner.js";

export class BilibiliStubAccountPlatformAdapter implements AccountPlatformPort {
  readonly platformCode = "bilibili";
  private skillDirectoryPromise: Promise<string> | null = null;

  async startQrSession(
    _input: AccountPlatformStartQrSessionInput,
  ): Promise<AccountPlatformStartQrSessionResult> {
    const payload = await this.runSkillCommand("auth", "qr-start");
    const data = ensureObject(payload.data);
    const loginUrl = ensureNonEmptyString(data.loginUrl, "Bilibili qr-start did not return loginUrl.");
    const qrcodeKey = ensureNonEmptyString(
      data.qrcodeKey,
      "Bilibili qr-start did not return qrcodeKey.",
    );
    const { default: QRCode } = await import("qrcode");
    const imageUrl = await QRCode.toDataURL(loginUrl, {
      margin: 1,
      width: 220,
    });

    return {
      challenge: {
        challengeType: "qr_image",
        imageUrl,
        loginUrl,
        message: "请使用 Bilibili App 扫码，并在扫码后点击验证连接。",
      },
      providerSession: {
        qrcodeKey,
        loginUrl,
      },
      expiresAt: null,
      logs: [createLog("info", "bilibili qr session started")],
    };
  }

  async pollQrSession(
    input: AccountPlatformPollQrSessionInput,
  ): Promise<AccountPlatformPollQrSessionResult> {
    const qrcodeKey = ensureNonEmptyString(
      input.providerSession.qrcodeKey,
      "Bilibili QR session is missing qrcodeKey.",
    );
    const payload = await this.runSkillCommand("auth", "qr-poll", "--qrcodeKey", qrcodeKey);
    const data = ensureObject(payload.data);
    const status = ensureNonEmptyString(
      data.status,
      "Bilibili qr-poll did not return status.",
    );

    if (status === "waiting_scan") {
      return {
        progressStatus: "waiting_for_scan",
        providerSession: input.providerSession,
        candidateCredential: null,
        candidateCredentialExpiresAt: null,
        reason: stringOrNull(data.message) ?? "Waiting for QR scan.",
        expiresAt: null,
        logs: [createLog("info", "waiting for bilibili qr scan")],
      };
    }

    if (status === "waiting_confirm") {
      return {
        progressStatus: "waiting_for_confirmation",
        providerSession: input.providerSession,
        candidateCredential: null,
        candidateCredentialExpiresAt: null,
        reason: stringOrNull(data.message) ?? "Waiting for QR confirmation.",
        expiresAt: null,
        logs: [createLog("info", "bilibili qr scanned, waiting for confirmation")],
      };
    }

    if (status === "expired") {
      return {
        progressStatus: "expired",
        providerSession: input.providerSession,
        candidateCredential: null,
        candidateCredentialExpiresAt: null,
        reason: stringOrNull(data.message) ?? "QR code expired.",
        expiresAt: null,
        logs: [createLog("warn", "bilibili qr session expired")],
      };
    }

    if (status !== "success") {
      throw new Error(`Unexpected bilibili qr status "${status}".`);
    }

    const cookie = ensureNonEmptyString(
      data.cookie,
      "Bilibili qr-poll did not return cookie.",
    );

    return {
      progressStatus: "ready_for_verification",
      providerSession: input.providerSession,
      candidateCredential: {
        token: cookie,
        refreshToken: stringOrNull(data.refreshToken),
        cookieInfo: ensureOptionalObject(data.cookieInfo),
        platformUserSnapshot: ensureOptionalObject(data.userInfo),
      },
      candidateCredentialExpiresAt: null,
      reason: "QR login succeeded. Credential is ready for verification.",
      expiresAt: null,
      logs: [createLog("info", "bilibili qr credential resolved")],
    };
  }

  async verifyCredential(
    input: AccountPlatformVerifyCredentialInput,
  ): Promise<AccountPlatformVerifyCredentialResult> {
    const token = ensureNonEmptyString(
      input.candidateCredential.token,
      "Bilibili credential token is required.",
    );
    const payload = await this.runSkillCommand(
      "account",
      "self-get",
      "--cookie",
      token,
    );
    const data = ensureObject(payload.data);
    const mid = ensureStringLike(data.mid, "Bilibili self-get did not return mid.");
    const uname = ensureNonEmptyString(
      data.uname,
      "Bilibili self-get did not return uname.",
    );

    return {
      verificationResult: "succeeded",
      reason: "Bilibili credential verified successfully.",
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: String(mid),
        resolvedDisplayName: uname,
        resolvedAvatarUrl: stringOrNull(data.avatar),
        resolvedProfileMetadata: {
          sign: stringOrNull(data.sign),
          levelInfo: data.levelInfo ?? null,
          vipStatus: data.vipStatus ?? null,
          vipType: data.vipType ?? null,
        },
      },
      credential: {
        ...input.candidateCredential,
        platform: this.platformCode,
      },
      credentialExpiresAt: null,
      logs: [createLog("info", "bilibili credential verified")],
    };
  }

  async checkAvailability(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult> {
    try {
      const token = ensureNonEmptyString(
        input.activeCredential.token,
        "Bilibili active credential token is required.",
      );
      await this.runSkillCommand("account", "self-get", "--cookie", token);
      return {
        availabilityStatus: "healthy",
        reason: "Bilibili account self-get succeeded.",
      };
    } catch (error) {
      return {
        availabilityStatus: "offline",
        reason: error instanceof Error ? error.message : "Availability check failed.",
      };
    }
  }

  private async runSkillCommand(
    group: string,
    command: string,
    ...args: string[]
  ): Promise<JsonObject> {
    const skillDirectory = await this.resolveSkillDirectory();
    const payload = await runJsonScriptCommand({
      cwd: skillDirectory,
      scriptPath: join(skillDirectory, "scripts", "bili.js"),
      args: [group, command, ...args],
      timeoutMs: 20_000,
    });
    const parsed = ensureObject(payload);

    if (parsed.ok !== true) {
      const error = ensureOptionalObject(parsed.error);
      throw new Error(
        stringOrNull(error?.message) ??
          `Bilibili command ${group}.${command} failed.`,
      );
    }

    return parsed;
  }

  private async resolveSkillDirectory(): Promise<string> {
    if (!this.skillDirectoryPromise) {
      this.skillDirectoryPromise = (async () => {
        const explicitSkillsRoot = join(
          dirname(fileURLToPath(import.meta.url)),
          "../../../../runtime-assets/skills",
        );
        const skillsRoot = await resolveBundledRuntimeSkillsDirectory(
          explicitSkillsRoot,
        );
        return join(skillsRoot, "bilibili-web-api");
      })();
    }

    return this.skillDirectoryPromise;
  }
}

function createLog(
  level: AccessSessionLogEntry["level"],
  message: string,
): AccessSessionLogEntry {
  return {
    timestamp: new Date().toISOString(),
    level,
    message,
  };
}

function ensureObject(value: unknown): JsonObject {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    throw new Error("Expected a JSON object.");
  }

  return { ...(value as JsonObject) };
}

function ensureOptionalObject(value: unknown): JsonObject | null {
  if (!value || Array.isArray(value) || typeof value !== "object") {
    return null;
  }

  return { ...(value as JsonObject) };
}

function ensureNonEmptyString(value: unknown, message: string): string {
  if (typeof value !== "string" || value.trim().length === 0) {
    throw new Error(message);
  }

  return value.trim();
}

function ensureStringLike(value: unknown, message: string): string | number {
  if (typeof value === "string" && value.trim().length > 0) {
    return value.trim();
  }

  if (typeof value === "number") {
    return value;
  }

  throw new Error(message);
}

function stringOrNull(value: unknown): string | null {
  return typeof value === "string" && value.trim().length > 0
    ? value.trim()
    : null;
}
