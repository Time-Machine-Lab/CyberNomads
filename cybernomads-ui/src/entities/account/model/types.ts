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
export type LoginStatus = 'not_logged_in' | 'connecting' | 'connected' | 'login_failed' | 'expired'
export type AvailabilityStatus = 'unknown' | 'healthy' | 'risk' | 'restricted' | 'offline'
export type ConnectionMethod = 'manual_token' | 'qr_login'
export type ConnectionAttemptStatus =
  | 'pending_resolution'
  | 'ready_for_validation'
  | 'validating'
  | 'validation_succeeded'
  | 'validation_failed'
  | 'expired'
  | 'canceled'
export type ValidationResult = 'succeeded' | 'failed'
export type ConnectionAttemptLogLevel = 'info' | 'warn' | 'error'

export interface ListAccountsQuery {
  platform?: string
  keyword?: string
  lifecycleStatus?: LifecycleStatus
  loginStatus?: LoginStatus
  availabilityStatus?: AvailabilityStatus
  includeDeleted?: boolean
  onlyConsumable?: boolean
}

export interface CreateAccountInput {
  platform: string
  internalDisplayName: string
  remark?: string | null
  tags?: string[]
  platformMetadata?: JsonObject
}

export interface UpdateAccountInput {
  internalDisplayName: string
  remark: string | null
  tags: string[]
  platformMetadata: JsonObject
}

export interface StartConnectionAttemptInput {
  connectionMethod: ConnectionMethod
  tokenValue?: string | null
  context?: JsonObject
  expiresAt?: string | null
}

export interface ResolveConnectionAttemptInput {
  resolutionPayload?: JsonObject
}

export interface ValidateConnectionAttemptInput {
  validationPayload?: JsonObject
}

export interface ResolvedPlatformProfileDto {
  resolvedPlatformAccountUid: string | null
  resolvedDisplayName: string | null
  resolvedAvatarUrl: string | null
  resolvedProfileMetadata: JsonObject
}

export interface ActiveTokenSummaryDto {
  hasToken: boolean
  expiresAt: string | null
  updatedAt: string | null
}

export interface LatestConnectionAttemptSummaryDto {
  attemptId: string
  connectionMethod: ConnectionMethod
  attemptStatus: ConnectionAttemptStatus
  attemptStatusReason: string | null
  challenge: JsonObject | null
  hasCandidateToken: boolean
  tokenApplied: boolean
  hasLogs: boolean
  expiresAt: string | null
  validatedAt: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AccountSummaryDto {
  accountId: string
  platform: string
  internalDisplayName: string
  tags: string[]
  lifecycleStatus: LifecycleStatus
  loginStatus: LoginStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  hasActiveToken: boolean
  isConsumable: boolean
  updatedAt: string
}

export interface AccountDetailDto {
  accountId: string
  platform: string
  internalDisplayName: string
  remark: string | null
  tags: string[]
  platformMetadata: JsonObject
  lifecycleStatus: LifecycleStatus
  loginStatus: LoginStatus
  loginStatusReason: string | null
  availabilityStatus: AvailabilityStatus
  availabilityStatusReason: string | null
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  activeToken: ActiveTokenSummaryDto
  latestConnectionAttempt: LatestConnectionAttemptSummaryDto | null
  isConsumable: boolean
  lastConnectedAt: string | null
  lastValidatedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListAccountsResultDto {
  items: AccountSummaryDto[]
}

export interface AccountConnectionAttemptDetailDto {
  accountId: string
  attemptId: string
  platform: string
  connectionMethod: ConnectionMethod
  attemptStatus: ConnectionAttemptStatus
  attemptStatusReason: string | null
  challenge: JsonObject | null
  hasCandidateToken: boolean
  tokenApplied: boolean
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  hasLogs: boolean
  expiresAt: string | null
  validatedAt: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ConnectionAttemptLogEntryDto {
  timestamp: string
  level: ConnectionAttemptLogLevel
  message: string
  details?: JsonObject
}

export interface ConnectionAttemptLogsResponseDto {
  accountId: string
  attemptId: string
  entries: ConnectionAttemptLogEntryDto[]
}

export interface ValidateConnectionAttemptResponseDto {
  attemptId: string
  validationResult: ValidationResult
  validationReason: string | null
  tokenApplied: boolean
  account: AccountDetailDto
  attempt: AccountConnectionAttemptDetailDto
}

export interface AvailabilityCheckResultDto {
  accountId: string
  lifecycleStatus: LifecycleStatus
  loginStatus: LoginStatus
  availabilityStatus: AvailabilityStatus
  availabilityStatusReason: string | null
  hasActiveToken: boolean
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

export interface ResolvedPlatformProfileRecord extends ResolvedPlatformProfileDto {}

export interface ActiveTokenSummaryRecord extends ActiveTokenSummaryDto {
  expiresAtLabel: string | null
  updatedAtLabel: string | null
}

export interface LatestConnectionAttemptSummaryRecord extends LatestConnectionAttemptSummaryDto {
  createdAtLabel: string | null
  updatedAtLabel: string | null
  validatedAtLabel: string | null
  appliedAtLabel: string | null
  expiresAtLabel: string | null
  challengeImageUrl: string | null
  challengeMessage: string | null
  stateLabel: string
  stateTone: AccountStateTone
}

export interface AccountRecord {
  id: string
  platform: string
  platformView: AccountPlatformView
  internalDisplayName: string
  remark: string | null
  tags: string[]
  lifecycleStatus: LifecycleStatus
  loginStatus: LoginStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileRecord
  hasActiveToken: boolean
  isConsumable: boolean
  updatedAt: string
  updatedAtLabel: string
  state: AccountStateView
}

export interface AccountDetailRecord extends AccountRecord {
  loginStatusReason: string | null
  availabilityStatusReason: string | null
  platformMetadata: JsonObject
  activeToken: ActiveTokenSummaryRecord
  latestConnectionAttempt: LatestConnectionAttemptSummaryRecord | null
  lastConnectedAt: string | null
  lastConnectedAtLabel: string | null
  lastValidatedAt: string | null
  lastValidatedAtLabel: string | null
  createdAt: string
  createdAtLabel: string | null
  deletedAt: string | null
  deletedAtLabel: string | null
}

export interface AccountConnectionAttemptDetailRecord extends AccountConnectionAttemptDetailDto {
  stateLabel: string
  stateTone: AccountStateTone
  challengeImageUrl: string | null
  challengeMessage: string | null
  createdAtLabel: string | null
  updatedAtLabel: string | null
  validatedAtLabel: string | null
  appliedAtLabel: string | null
  expiresAtLabel: string | null
}

export interface ConnectionAttemptLogEntryRecord extends ConnectionAttemptLogEntryDto {
  timestampLabel: string | null
}

export interface ConnectionAttemptLogsRecord {
  accountId: string
  attemptId: string
  entries: ConnectionAttemptLogEntryRecord[]
}
