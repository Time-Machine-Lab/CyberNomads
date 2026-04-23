import type { AccountPlatformAccountSnapshot } from "../../ports/account-platform-port.js";
import { toLatestConnectionAttemptSummary } from "../account-connection-attempts/model.js";
import type { AccountConnectionAttemptRecord } from "../account-connection-attempts/types.js";
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
    loginStatus: record.loginStatus,
    availabilityStatus: record.availabilityStatus,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    hasActiveToken: record.activeTokenRef !== null,
    isConsumable: isAccountConsumable(record),
    updatedAt: record.updatedAt,
  };
}

export function toAccountDetail(
  record: AccountRecord,
  latestAttempt?: AccountConnectionAttemptRecord | null,
): AccountDetail {
  return {
    accountId: record.accountId,
    platform: record.platform,
    internalDisplayName: record.internalDisplayName,
    remark: record.remark,
    tags: [...record.tags],
    platformMetadata: { ...record.platformMetadata },
    lifecycleStatus: record.lifecycleStatus,
    loginStatus: record.loginStatus,
    loginStatusReason: record.loginStatusReason,
    availabilityStatus: record.availabilityStatus,
    availabilityStatusReason: record.availabilityStatusReason,
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
    activeToken: {
      hasToken: record.activeTokenRef !== null,
      expiresAt: record.activeTokenExpiresAt,
      updatedAt: record.activeTokenUpdatedAt,
    },
    latestConnectionAttempt: latestAttempt
      ? toLatestConnectionAttemptSummary(latestAttempt)
      : null,
    isConsumable: isAccountConsumable(record),
    lastConnectedAt: record.lastConnectedAt,
    lastValidatedAt: record.lastValidatedAt,
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

export function toAccountPlatformSnapshot(
  record: AccountRecord,
): AccountPlatformAccountSnapshot {
  return {
    accountId: record.accountId,
    platform: record.platform,
    internalDisplayName: record.internalDisplayName,
    platformMetadata: { ...record.platformMetadata },
    resolvedPlatformProfile: toResolvedPlatformProfile(record),
  };
}

export function isAccountConsumable(record: AccountRecord): boolean {
  return deriveConsumabilityReason(record) === null;
}

export function deriveConsumabilityReason(record: AccountRecord): string | null {
  if (record.lifecycleStatus !== "active") {
    return `Account lifecycle status is ${record.lifecycleStatus}.`;
  }

  if (record.loginStatus !== "connected") {
    return `Account login status is ${record.loginStatus}.`;
  }

  if (record.availabilityStatus !== "healthy") {
    return `Account availability status is ${record.availabilityStatus}.`;
  }

  if (record.activeTokenRef === null) {
    return "Account has no active token.";
  }

  return null;
}
