import type {
  CurrentAccessSessionSummary,
  ResolvedPlatformProfile,
} from "../accounts/types.js";
import type {
  AccountAccessSessionDetail,
  AccountAccessSessionRecord,
  AccessSessionLogsResponse,
  AccessSessionLogEntry,
} from "./types.js";

export function toAccessSessionDetail(
  record: AccountAccessSessionRecord,
): AccountAccessSessionDetail {
  return {
    accountId: record.accountId,
    sessionId: record.sessionId,
    platform: record.platform,
    accessMode: record.accessMode,
    sessionStatus: record.sessionStatus,
    sessionStatusReason: record.sessionStatusReason,
    challenge: record.challenge,
    hasCandidateCredential: record.candidateCredentialRef !== null,
    credentialApplied: record.appliedAt !== null,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    hasLogs: record.logRef !== null,
    expiresAt: record.expiresAt,
    verifiedAt: record.verifiedAt,
    appliedAt: record.appliedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toCurrentAccessSessionSummary(
  record: AccountAccessSessionRecord,
): CurrentAccessSessionSummary {
  return {
    sessionId: record.sessionId,
    accessMode: record.accessMode,
    sessionStatus: record.sessionStatus,
    sessionStatusReason: record.sessionStatusReason,
    challenge: record.challenge,
    hasCandidateCredential: record.candidateCredentialRef !== null,
    credentialApplied: record.appliedAt !== null,
    hasLogs: record.logRef !== null,
    expiresAt: record.expiresAt,
    verifiedAt: record.verifiedAt,
    appliedAt: record.appliedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toAccessSessionLogsResponse(
  record: AccountAccessSessionRecord,
  entries: AccessSessionLogEntry[],
): AccessSessionLogsResponse {
  return {
    accountId: record.accountId,
    sessionId: record.sessionId,
    entries,
  };
}

export function isAccessSessionTerminal(record: AccountAccessSessionRecord): boolean {
  return isAccessSessionStatusTerminal(record.sessionStatus);
}

export function isAccessSessionStatusTerminal(status: string): boolean {
  return (
    status === "verified" ||
    status === "verify_failed" ||
    status === "expired" ||
    status === "canceled"
  );
}

function toResolvedPlatformProfile(
  record: Pick<
    AccountAccessSessionRecord,
    | "resolvedPlatformAccountUid"
    | "resolvedDisplayName"
    | "resolvedAvatarUrl"
    | "resolvedProfileMetadata"
  >,
): ResolvedPlatformProfile {
  return {
    resolvedPlatformAccountUid: record.resolvedPlatformAccountUid,
    resolvedDisplayName: record.resolvedDisplayName,
    resolvedAvatarUrl: record.resolvedAvatarUrl,
    resolvedProfileMetadata: { ...record.resolvedProfileMetadata },
  };
}
