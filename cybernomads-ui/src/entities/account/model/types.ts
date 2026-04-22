export type AccountStatus = 'connected' | 'needs-auth' | 'error'

export interface LegacyMockAccountRecord {
  id: string
  name: string
  platform: string
  owner: string
  uid: string
  avatarUrl?: string
  tags: string[]
  statusLabel?: string
  lastActiveLabel?: string
  status: AccountStatus
  lastSyncedAt: string
}

export type JsonObject = Record<string, unknown>

export type LifecycleStatus = 'active' | 'disabled' | 'deleted'

export type AuthorizationStatus =
  | 'unauthorized'
  | 'authorizing'
  | 'authorized'
  | 'expired'
  | 'revoked'

export type AvailabilityStatus = 'unknown' | 'healthy' | 'risk' | 'restricted' | 'offline'

export type AuthorizationAttemptStatus =
  | 'pending_verification'
  | 'verification_succeeded'
  | 'verification_failed'
  | 'expired'
  | 'canceled'

export type VerificationResult = 'succeeded' | 'failed'
export type ChallengeSummary = JsonObject | null
export type AccountOnboardingSessionStatus =
  | 'pending_resolution'
  | 'resolved'
  | 'resolution_failed'
  | 'expired'
  | 'consumed'
  | 'canceled'
export type AccountOnboardingFinalDisposition = 'created' | 'restored' | 'existing'

export interface ListAccountsQuery {
  platform?: string
  keyword?: string
  lifecycleStatus?: LifecycleStatus
  authorizationStatus?: AuthorizationStatus
  availabilityStatus?: AvailabilityStatus
  includeDeleted?: boolean
  onlyConsumable?: boolean
}

export interface UpdateAccountInput {
  displayName: string
  remark: string | null
  tags: string[]
  platformMetadata: JsonObject
}

export interface StartAuthorizationAttemptInput {
  authorizationMethod: string
  expectedCredentialType?: string | null
  payload: JsonObject
  expiresAt?: string | null
}

export interface VerifyAuthorizationAttemptInput {
  verificationPayload?: JsonObject
}

export interface StartAccountOnboardingSessionInput {
  platform: string
  authorizationMethod: string
  expectedCredentialType?: string | null
  payload?: JsonObject
  expiresAt?: string | null
}

export interface ResolveAccountOnboardingSessionInput {
  resolutionPayload?: JsonObject
}

export interface ActiveCredentialSummary {
  hasCredential: boolean
  credentialType: string | null
  expiresAt: string | null
  updatedAt: string | null
}

export interface AuthorizationAttemptSummary {
  attemptId: string
  authorizationMethod: string
  expectedCredentialType: string | null
  attemptStatus: AuthorizationAttemptStatus
  attemptStatusReason: string | null
  expiresAt: string | null
  createdAt: string
  updatedAt: string
  challenge: ChallengeSummary
}

export interface AccountOnboardingResolvedIdentity {
  platform: string
  platformAccountUid: string
}

export interface AccountOnboardingResolvedProfile {
  displayName: string | null
  platformMetadata: JsonObject
}

export interface AccountOnboardingSessionDetailDto {
  sessionId: string
  platform: string
  authorizationMethod: string
  expectedCredentialType: string | null
  sessionStatus: AccountOnboardingSessionStatus
  sessionStatusReason: string | null
  challenge: ChallengeSummary
  resolvedIdentity: AccountOnboardingResolvedIdentity | null
  resolvedProfile: AccountOnboardingResolvedProfile | null
  hasCandidateCredential: boolean
  candidateCredentialType: string | null
  finalDisposition: AccountOnboardingFinalDisposition | null
  targetAccountId: string | null
  expiresAt: string | null
  consumedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface FinalizeAccountOnboardingSessionResponseDto {
  sessionId: string
  finalDisposition: AccountOnboardingFinalDisposition
  accountId: string
  account: AccountDetailDto
}

export interface AccountSummaryDto {
  accountId: string
  platform: string
  platformAccountUid: string
  displayName: string
  tags: string[]
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  hasActiveCredential: boolean
  hasPendingAuthorizationAttempt: boolean
  isConsumable: boolean
  updatedAt: string
}

export interface AccountDetailDto {
  accountId: string
  platform: string
  platformAccountUid: string
  displayName: string
  remark: string | null
  tags: string[]
  platformMetadata: JsonObject
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  authorizationStatusReason: string | null
  availabilityStatus: AvailabilityStatus
  availabilityStatusReason: string | null
  hasPendingAuthorizationAttempt: boolean
  isConsumable: boolean
  activeCredential: ActiveCredentialSummary
  authorizationAttempt: AuthorizationAttemptSummary | null
  lastAuthorizedAt: string | null
  lastAvailabilityCheckedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListAccountsResultDto {
  items: AccountSummaryDto[]
}

export interface VerifyAuthorizationAttemptResponseDto {
  attemptId: string
  verificationResult: VerificationResult
  verificationReason: string | null
  activeCredentialSwitched: boolean
  account: AccountDetailDto
}

export interface AvailabilityCheckResultDto {
  accountId: string
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  availabilityStatusReason: string | null
  hasActiveCredential: boolean
  isConsumable: boolean
  consumabilityReason: string | null
  checkedAt: string
}

export type AccountStateTone = 'healthy' | 'warning' | 'danger' | 'neutral' | 'muted'

export type AccountStateSignal = 'primary' | 'warning' | 'danger' | 'muted'

export type AccountPlatformColor = 'primary' | 'red' | 'default' | 'blue' | 'amber' | 'slate'

export interface AccountStateView {
  label: string
  detail: string
  tone: AccountStateTone
  signal: AccountStateSignal
}

export interface AccountPlatformView {
  label: string
  icon: string
  color: AccountPlatformColor
}

export interface AccountRecord {
  id: string
  name: string
  displayName: string
  platform: string
  platformView: AccountPlatformView
  owner: string
  remark: string | null
  uid: string
  platformAccountUid: string
  avatarUrl?: string
  tags: string[]
  statusLabel: string
  lastActiveLabel: string
  status: AccountStatus
  lastSyncedAt: string
  updatedAt: string
  updatedAtLabel: string
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  hasActiveCredential: boolean
  hasPendingAuthorizationAttempt: boolean
  isConsumable: boolean
  state: AccountStateView
}

export interface AccountDetailRecord extends AccountRecord {
  authorizationStatusReason: string | null
  availabilityStatusReason: string | null
  platformMetadata: JsonObject
  activeCredential: ActiveCredentialSummary
  authorizationAttempt: AuthorizationAttemptSummary | null
  lastAuthorizedAt: string | null
  lastAuthorizedAtLabel: string | null
  lastAvailabilityCheckedAt: string | null
  lastAvailabilityCheckedAtLabel: string | null
  deletedAt: string | null
  deletedAtLabel: string | null
  createdAt: string
  createdAtLabel: string
}
