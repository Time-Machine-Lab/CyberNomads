export type JsonObject = Record<string, unknown>;

export type LifecycleStatus = "active" | "disabled" | "deleted";
export type LoginStatus =
  | "not_logged_in"
  | "connecting"
  | "connected"
  | "login_failed"
  | "expired";
export type AvailabilityStatus =
  | "unknown"
  | "healthy"
  | "risk"
  | "restricted"
  | "offline";
export type ConnectionMethod = "manual_token" | "qr_login";
export type ConnectionAttemptStatus =
  | "pending_resolution"
  | "ready_for_validation"
  | "validating"
  | "validation_succeeded"
  | "validation_failed"
  | "expired"
  | "canceled";
export type ValidationResult = "succeeded" | "failed";

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
  loginStatus?: LoginStatus;
  availabilityStatus?: AvailabilityStatus;
  includeDeleted?: boolean;
  onlyConsumable?: boolean;
}

export interface ResolvedPlatformProfile {
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
}

export interface ActiveTokenSummary {
  hasToken: boolean;
  expiresAt: string | null;
  updatedAt: string | null;
}

export interface LatestConnectionAttemptSummary {
  attemptId: string;
  connectionMethod: ConnectionMethod;
  attemptStatus: ConnectionAttemptStatus;
  attemptStatusReason: string | null;
  challenge: JsonObject | null;
  hasCandidateToken: boolean;
  tokenApplied: boolean;
  hasLogs: boolean;
  expiresAt: string | null;
  validatedAt: string | null;
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
  loginStatus: LoginStatus;
  availabilityStatus: AvailabilityStatus;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  hasActiveToken: boolean;
  isConsumable: boolean;
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
  loginStatus: LoginStatus;
  loginStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  resolvedPlatformProfile: ResolvedPlatformProfile;
  activeToken: ActiveTokenSummary;
  latestConnectionAttempt: LatestConnectionAttemptSummary | null;
  isConsumable: boolean;
  lastConnectedAt: string | null;
  lastValidatedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResult {
  items: AccountSummary[];
}

export interface AvailabilityCheckResult {
  accountId: string;
  lifecycleStatus: LifecycleStatus;
  loginStatus: LoginStatus;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  hasActiveToken: boolean;
  isConsumable: boolean;
  consumabilityReason: string | null;
  checkedAt: string;
}

export interface AccountRecord {
  accountId: string;
  platform: string;
  internalDisplayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
  lifecycleStatus: LifecycleStatus;
  loginStatus: LoginStatus;
  loginStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  resolvedPlatformAccountUid: string | null;
  resolvedDisplayName: string | null;
  resolvedAvatarUrl: string | null;
  resolvedProfileMetadata: JsonObject;
  activeTokenRef: string | null;
  activeTokenExpiresAt: string | null;
  activeTokenUpdatedAt: string | null;
  lastConnectedAt: string | null;
  lastValidatedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface StoredTokenSecret {
  payload: JsonObject;
  expiresAt: string | null;
}
