export type JsonObject = Record<string, unknown>;

export type LifecycleStatus = "active" | "disabled" | "deleted";

export type AuthorizationStatus =
  | "unauthorized"
  | "authorizing"
  | "authorized"
  | "expired"
  | "revoked";

export type AvailabilityStatus =
  | "unknown"
  | "healthy"
  | "risk"
  | "restricted"
  | "offline";

export type AuthorizationAttemptStatus =
  | "pending_verification"
  | "verification_succeeded"
  | "verification_failed"
  | "expired"
  | "canceled";

export type VerificationResult = "succeeded" | "failed";

export interface CreateAccountInput {
  platform: string;
  platformAccountUid: string;
  displayName: string;
  remark?: string | null;
  tags?: string[];
  platformMetadata?: JsonObject;
}

export interface UpdateAccountInput {
  displayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
}

export interface StartAuthorizationAttemptInput {
  authorizationMethod: string;
  expectedCredentialType?: string | null;
  payload: JsonObject;
  expiresAt?: string | null;
}

export interface VerifyAuthorizationAttemptInput {
  verificationPayload?: JsonObject;
}

export interface ListAccountsFilters {
  platform?: string;
  keyword?: string;
  lifecycleStatus?: LifecycleStatus;
  authorizationStatus?: AuthorizationStatus;
  availabilityStatus?: AvailabilityStatus;
  includeDeleted?: boolean;
  onlyConsumable?: boolean;
}

export interface ActiveCredentialSummary {
  hasCredential: boolean;
  credentialType: string | null;
  expiresAt: string | null;
  updatedAt: string | null;
}

export interface AuthorizationAttemptSummary {
  attemptId: string;
  authorizationMethod: string;
  expectedCredentialType: string | null;
  attemptStatus: AuthorizationAttemptStatus;
  attemptStatusReason: string | null;
  expiresAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AccountSummary {
  accountId: string;
  platform: string;
  platformAccountUid: string;
  displayName: string;
  tags: string[];
  lifecycleStatus: LifecycleStatus;
  authorizationStatus: AuthorizationStatus;
  availabilityStatus: AvailabilityStatus;
  hasActiveCredential: boolean;
  hasPendingAuthorizationAttempt: boolean;
  isConsumable: boolean;
  updatedAt: string;
}

export interface AccountDetail {
  accountId: string;
  platform: string;
  platformAccountUid: string;
  displayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
  lifecycleStatus: LifecycleStatus;
  authorizationStatus: AuthorizationStatus;
  authorizationStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  hasPendingAuthorizationAttempt: boolean;
  isConsumable: boolean;
  activeCredential: ActiveCredentialSummary;
  authorizationAttempt: AuthorizationAttemptSummary | null;
  lastAuthorizedAt: string | null;
  lastAvailabilityCheckedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ListAccountsResult {
  items: AccountSummary[];
}

export interface CreateAccountResult {
  account: AccountDetail;
  restoredFromDeleted: boolean;
}

export interface VerifyAuthorizationAttemptResponse {
  attemptId: string;
  verificationResult: VerificationResult;
  verificationReason: string | null;
  activeCredentialSwitched: boolean;
  account: AccountDetail;
}

export interface AvailabilityCheckResult {
  accountId: string;
  lifecycleStatus: LifecycleStatus;
  authorizationStatus: AuthorizationStatus;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  hasActiveCredential: boolean;
  isConsumable: boolean;
  consumabilityReason: string | null;
  checkedAt: string;
}

export interface PlatformAccountRecord {
  accountId: string;
  platform: string;
  platformAccountUid: string;
  displayName: string;
  remark: string | null;
  tags: string[];
  platformMetadata: JsonObject;
  lifecycleStatus: LifecycleStatus;
  authorizationStatus: AuthorizationStatus;
  authorizationStatusReason: string | null;
  availabilityStatus: AvailabilityStatus;
  availabilityStatusReason: string | null;
  activeCredentialType: string | null;
  activeCredentialRef: string | null;
  activeCredentialExpiresAt: string | null;
  activeCredentialUpdatedAt: string | null;
  authorizationAttemptId: string | null;
  authorizationAttemptMethod: string | null;
  authorizationAttemptExpectedCredentialType: string | null;
  authorizationAttemptPayloadRef: string | null;
  authorizationAttemptStatus: AuthorizationAttemptStatus | null;
  authorizationAttemptStatusReason: string | null;
  authorizationAttemptExpiresAt: string | null;
  authorizationAttemptCreatedAt: string | null;
  authorizationAttemptUpdatedAt: string | null;
  lastAuthorizedAt: string | null;
  lastAvailabilityCheckedAt: string | null;
  deletedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface ActiveCredentialSecret {
  credentialType: string;
  payload: JsonObject;
  expiresAt: string | null;
}

export interface AuthorizationAttemptSecret {
  authorizationMethod: string;
  expectedCredentialType: string | null;
  initialPayload: JsonObject;
  platformAttemptPayload: JsonObject;
  previousAuthorizationStatus: AuthorizationStatus;
  previousAuthorizationStatusReason: string | null;
}

export interface ResolvedActiveCredential {
  credentialType: string;
  credentialRef: string;
  payload: JsonObject;
  expiresAt: string | null;
  updatedAt: string | null;
}
