import type {
  LatestConnectionAttemptSummary,
  ResolvedPlatformProfile,
} from "../accounts/types.js";
import type {
  AccountConnectionAttemptDetail,
  AccountConnectionAttemptRecord,
  ConnectionAttemptLogsResponse,
  ConnectionAttemptLogEntry,
} from "./types.js";

export function toConnectionAttemptDetail(
  record: AccountConnectionAttemptRecord,
): AccountConnectionAttemptDetail {
  return {
    accountId: record.accountId,
    attemptId: record.attemptId,
    platform: record.platform,
    connectionMethod: record.connectionMethod,
    attemptStatus: record.attemptStatus,
    attemptStatusReason: record.attemptStatusReason,
    challenge: record.challenge,
    hasCandidateToken: record.candidateTokenRef !== null,
    tokenApplied: record.appliedAt !== null,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    hasLogs: record.logRef !== null,
    expiresAt: record.expiresAt,
    validatedAt: record.validatedAt,
    appliedAt: record.appliedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toLatestConnectionAttemptSummary(
  record: AccountConnectionAttemptRecord,
): LatestConnectionAttemptSummary {
  return {
    attemptId: record.attemptId,
    connectionMethod: record.connectionMethod,
    attemptStatus: record.attemptStatus,
    attemptStatusReason: record.attemptStatusReason,
    challenge: record.challenge,
    hasCandidateToken: record.candidateTokenRef !== null,
    tokenApplied: record.appliedAt !== null,
    hasLogs: record.logRef !== null,
    expiresAt: record.expiresAt,
    validatedAt: record.validatedAt,
    appliedAt: record.appliedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toConnectionAttemptLogsResponse(
  record: AccountConnectionAttemptRecord,
  entries: ConnectionAttemptLogEntry[],
): ConnectionAttemptLogsResponse {
  return {
    accountId: record.accountId,
    attemptId: record.attemptId,
    entries,
  };
}

export function isAttemptTerminal(record: AccountConnectionAttemptRecord): boolean {
  return isAttemptStatusTerminal(record.attemptStatus);
}

export function isAttemptStatusTerminal(status: string): boolean {
  return (
    status === "validation_succeeded" ||
    status === "validation_failed" ||
    status === "expired" ||
    status === "canceled"
  );
}

function toResolvedPlatformProfile(
  record: Pick<
    AccountConnectionAttemptRecord,
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
