import { toCurrentAccessSessionSummary } from "../account-access-sessions/model.js";
import type { AccountAccessSessionRecord } from "../account-access-sessions/types.js";
import type {
  AccountDetail,
  AccountRecord,
  AccountSummary,
  ResolvedPlatformProfile,
} from "./types.js";

export function toAccountSummary(record: AccountRecord): AccountSummary {
  return {
    accountId: record.accountId,
    platform: record.platform,
    internalDisplayName: record.internalDisplayName,
    tags: [...record.tags],
    lifecycleStatus: record.lifecycleStatus,
    connectionStatus: record.connectionStatus,
    availabilityStatus: record.availabilityStatus,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    hasCurrentCredential: record.activeCredentialRef !== null,
    updatedAt: record.updatedAt,
  };
}

export function toAccountDetail(
  record: AccountRecord,
  latestAccessSession?: AccountAccessSessionRecord | null,
): AccountDetail {
  return {
    accountId: record.accountId,
    platform: record.platform,
    internalDisplayName: record.internalDisplayName,
    remark: record.remark,
    tags: [...record.tags],
    platformMetadata: { ...record.platformMetadata },
    lifecycleStatus: record.lifecycleStatus,
    connectionStatus: record.connectionStatus,
    connectionStatusReason: record.connectionStatusReason,
    availabilityStatus: record.availabilityStatus,
    availabilityStatusReason: record.availabilityStatusReason,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    currentCredential: {
      hasCredential: record.activeCredentialRef !== null,
      expiresAt: record.activeCredentialExpiresAt,
      updatedAt: record.activeCredentialUpdatedAt,
    },
    currentAccessSession: latestAccessSession
      ? toCurrentAccessSessionSummary(latestAccessSession)
      : null,
    lastConnectedAt: record.lastConnectedAt,
    lastVerifiedAt: record.lastVerifiedAt,
    deletedAt: record.deletedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

export function toResolvedPlatformProfile(
  record: Pick<
    AccountRecord,
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

export function isAccountResolvable(record: AccountRecord): boolean {
  return deriveResolvableReason(record) === null;
}

export function deriveResolvableReason(record: AccountRecord): string | null {
  if (record.lifecycleStatus !== "active") {
    return `Account lifecycle status is ${record.lifecycleStatus}.`;
  }

  if (record.connectionStatus !== "connected") {
    return `Account connection status is ${record.connectionStatus}.`;
  }

  if (record.activeCredentialRef === null) {
    return "Account has no active credential.";
  }

  return null;
}
