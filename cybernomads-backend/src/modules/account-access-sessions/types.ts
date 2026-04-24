import type {
  AccessMode,
  AccessSessionStatus,
  JsonObject,
  ResolvedPlatformProfile,
  VerificationResult,
} from "../accounts/types.js";

export type AccessSessionLogLevel = "info" | "warn" | "error";

export interface AccessSessionLogEntry {
  timestamp: string;
  level: AccessSessionLogLevel;
  message: string;
  details?: JsonObject;
}

export interface StartManualAccessSessionInput {
  token: string;
  expiresAt?: string | null;
}

export interface StartQrAccessSessionInput {
  expiresAt?: string | null;
}

export interface PollAccessSessionInput {
  force?: boolean;
}

export interface VerifyAccessSessionInput {}

export interface AccountAccessSessionRecord {
  sessionId: string;
  accountId: string;
  platform: string;
  accessMode: AccessMode;
  sessionStatus: AccessSessionStatus;
  sessionStatusReason: string | null;
  challenge: JsonObject | null;
  platformSessionRef: string | null;
  candidateCredentialRef: string | null;
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
  logRef: string | null;
  expiresAt: string | null;
  verifiedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountAccessSessionDetail {
  accountId: string;
  sessionId: string;
  platform: string;
  accessMode: AccessMode;
  sessionStatus: AccessSessionStatus;
  sessionStatusReason: string | null;
  challenge: JsonObject | null;
  hasCandidateCredential: boolean;
  credentialApplied: boolean;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  hasLogs: boolean;
  expiresAt: string | null;
  verifiedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface VerifyAccessSessionResponse {
  sessionId: string;
  verificationResult: VerificationResult;
  verificationReason: string | null;
  credentialApplied: boolean;
  account: import("../accounts/types.js").AccountDetail;
  session: AccountAccessSessionDetail;
}

export interface AccessSessionLogsResponse {
  accountId: string;
  sessionId: string;
  entries: AccessSessionLogEntry[];
}
