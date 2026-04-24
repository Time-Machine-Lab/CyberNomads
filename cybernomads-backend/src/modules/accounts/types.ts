export type JsonObject = Record<string, unknown>;

export type LifecycleStatus = "active" | "disabled" | "deleted";
export type ConnectionStatus =
  | "not_logged_in"
  | "connecting"
  | "connected"
  | "connect_failed"
  | "expired";
export type AvailabilityStatus =
  | "unknown"
  | "healthy"
  | "risk"
  | "restricted"
  | "offline";
export type AccessMode = "manual_token" | "qr_login";
export type AccessSessionStatus =
  | "waiting_for_scan"
  | "waiting_for_confirmation"
  | "ready_for_verification"
  | "verifying"
  | "verified"
  | "verify_failed"
  | "expired"
  | "canceled";
export type VerificationResult = "succeeded" | "failed";

export interface CreateAccountInput {
  platform: string;
  internalDisplayName: string;
  remark?: string | null;
  tags?: string[];
  platformMetadata?: JsonObject;
}

export interface UpdateAccountInput {
  internalDisplayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
}

export interface ListAccountsFilters {
  platform?: string;
  keyword?: string;
  lifecycleStatus?: LifecycleStatus;
  connectionStatus?: ConnectionStatus;
  availabilityStatus?: AvailabilityStatus;
  includeDeleted?: boolean;
  onlyConnected?: boolean;
}

export interface ResolvedPlatformProfile {
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
}

export interface CurrentCredentialSummary {
  hasCredential: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
}

export interface CurrentAccessSessionSummary {
  sessionId: string;
  accessMode: AccessMode;
  sessionStatus: AccessSessionStatus;
  sessionStatusReason: string | null;
  challenge: JsonObject | null;
  hasCandidateCredential: boolean;
  credentialApplied: boolean;
  hasLogs: boolean;
  expiresAt: string | null;
  verifiedAt: string | null;
  appliedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  tags: string[];
  lifecycleStatus: LifecycleStatus;
  connectionStatus: ConnectionStatus;
  availabilityStatus: AvailabilityStatus;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  hasCurrentCredential: boolean;
  updatedAt: string;
}

export interface AccountDetail {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
  lifecycleStatus: LifecycleStatus;
  connectionStatus: ConnectionStatus;
  connectionStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  currentCredential: CurrentCredentialSummary;
  currentAccessSession: CurrentAccessSessionSummary | null;
  lastConnectedAt: string | null;
  lastVerifiedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResult {
  items: AccountSummary[];
}

export interface AccountRecord {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
  lifecycleStatus: LifecycleStatus;
  connectionStatus: ConnectionStatus;
  connectionStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
  activeCredentialRef: string | null;
  activeCredentialExpiresAt: string | null;
  activeCredentialUpdatedAt: string | null;
  lastConnectedAt: string | null;
  lastVerifiedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredCredentialSecret {
  payload: JsonObject;
  expiresAt: string | null;
}
