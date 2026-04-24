import type {
  AccessMode,
  AvailabilityStatus,
  JsonObject,
  ResolvedPlatformProfile,
  VerificationResult,
} from "../modules/accounts/types.js";
import type { AccessSessionLogEntry } from "../modules/account-access-sessions/types.js";

export interface AccountPlatformAccountSnapshot {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  platformMetadata: JsonObject;
  resolvedPlatformProfile: ResolvedPlatformProfile;
}

export interface AccountPlatformStartQrSessionInput {
  account: AccountPlatformAccountSnapshot;
  requestedExpiresAt: string | null;
}

export interface AccountPlatformStartQrSessionResult {
  challenge: JsonObject;
  providerSession: JsonObject | null;
  expiresAt: string | null;
  logs: AccessSessionLogEntry[];
}

export type AccountPlatformQrProgressStatus =
  | "waiting_for_scan"
  | "waiting_for_confirmation"
  | "ready_for_verification"
  | "expired";

export interface AccountPlatformPollQrSessionInput {
  account: AccountPlatformAccountSnapshot;
  providerSession: JsonObject;
}

export interface AccountPlatformPollQrSessionResult {
  progressStatus: AccountPlatformQrProgressStatus;
  providerSession: JsonObject | null;
  candidateCredential: JsonObject | null;
  reason: string | null;
  expiresAt: string | null;
  logs: AccessSessionLogEntry[];
}

export interface AccountPlatformVerifyCredentialInput {
  account: AccountPlatformAccountSnapshot;
  accessMode: AccessMode;
  candidateCredential: JsonObject;
  providerSession: JsonObject;
}

export interface AccountPlatformVerifyCredentialResult {
  verificationResult: VerificationResult;
  reason: string | null;
  resolvedPlatformProfile: ResolvedPlatformProfile | null;
  credential: JsonObject | null;
  credentialExpiresAt: string | null;
  logs: AccessSessionLogEntry[];
}

export interface AccountPlatformAvailabilityCheckInput {
  account: AccountPlatformAccountSnapshot;
  activeCredential: JsonObject;
}

export interface AccountPlatformAvailabilityCheckResult {
  availabilityStatus: AvailabilityStatus;
  reason: string | null;
}

export interface AccountPlatformPort {
  platformCode: string;
  startQrSession(
    input: AccountPlatformStartQrSessionInput,
  ): Promise<AccountPlatformStartQrSessionResult>;
  pollQrSession(
    input: AccountPlatformPollQrSessionInput,
  ): Promise<AccountPlatformPollQrSessionResult>;
  verifyCredential(
    input: AccountPlatformVerifyCredentialInput,
  ): Promise<AccountPlatformVerifyCredentialResult>;
  checkAvailability?(
    input: AccountPlatformAvailabilityCheckInput,
  ): Promise<AccountPlatformAvailabilityCheckResult>;
}
