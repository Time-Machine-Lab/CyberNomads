import type {
  ConnectionAttemptStatus,
  ConnectionMethod,
  JsonObject,
  ResolvedPlatformProfile,
  ValidationResult,
} from "../accounts/types.js";

export type ConnectionAttemptLogLevel = "info" | "warn" | "error";

export interface ConnectionAttemptLogEntry {
  timestamp: string;
  level: ConnectionAttemptLogLevel;
  message: string;
  details?: JsonObject;
}

export interface StartConnectionAttemptInput {
  connectionMethod: ConnectionMethod;
  tokenValue?: string | null;
  context?: JsonObject;
  expiresAt?: string | null;
}

export interface ResolveConnectionAttemptInput {
  resolutionPayload?: JsonObject;
}

export interface ValidateConnectionAttemptInput {
  validationPayload?: JsonObject;
}

export interface AccountConnectionAttemptRecord {
  attemptId: string;
  accountId: string;
  platform: string;
  connectionMethod: ConnectionMethod;
  attemptStatus: ConnectionAttemptStatus;
  attemptStatusReason: string | null;
  challenge: JsonObject | null;
  inputTokenRef: string | null;
  platformSessionRef: string | null;
  candidateTokenRef: string | null;
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
  logRef: string | null;
  expiresAt: string | null;
  validatedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountConnectionAttemptDetail {
  accountId: string;
  attemptId: string;
  platform: string;
  connectionMethod: ConnectionMethod;
  attemptStatus: ConnectionAttemptStatus;
  attemptStatusReason: string | null;
  challenge: JsonObject | null;
  hasCandidateToken: boolean;
  tokenApplied: boolean;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  hasLogs: boolean;
  expiresAt: string | null;
  validatedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ValidateConnectionAttemptResponse {
  attemptId: string;
  validationResult: ValidationResult;
  validationReason: string | null;
  tokenApplied: boolean;
  account: import("../accounts/types.js").AccountDetail;
  attempt: AccountConnectionAttemptDetail;
}

export interface ConnectionAttemptLogsResponse {
  accountId: string;
  attemptId: string;
  entries: ConnectionAttemptLogEntry[];
}
