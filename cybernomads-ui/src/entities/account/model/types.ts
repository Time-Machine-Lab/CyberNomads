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
export type ConnectionStatus = 'not_logged_in' | 'connecting' | 'connected' | 'connect_failed' | 'expired'
export type AvailabilityStatus = 'unknown' | 'healthy' | 'risk' | 'restricted' | 'offline'
export type AccessMode = 'manual_token' | 'qr_login'
export type AccessSessionStatus =
  | 'waiting_for_scan'
  | 'waiting_for_confirmation'
  | 'ready_for_verification'
  | 'verifying'
  | 'verified'
  | 'verify_failed'
  | 'expired'
  | 'canceled'
export type VerificationResult = 'succeeded' | 'failed'
export type AccessSessionLogLevel = 'info' | 'warn' | 'error'

export interface ListAccountsQuery {
  platform?: string
  keyword?: string
  lifecycleStatus?: LifecycleStatus
  connectionStatus?: ConnectionStatus
  availabilityStatus?: AvailabilityStatus
  includeDeleted?: boolean
  onlyConnected?: boolean
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

export interface StartTokenAccessSessionInput {
  token: string
  expiresAt?: string | null
}

export interface StartQrAccessSessionInput {
  expiresAt?: string | null
}

export interface PollAccessSessionInput {
  force?: boolean
}

export type VerifyAccessSessionInput = Record<string, never>

export interface ResolvedPlatformProfileDto {
  resolvedPlatformAccountUid: string | null
  resolvedDisplayName: string | null
  resolvedAvatarUrl: string | null
  resolvedProfileMetadata: JsonObject
}

export interface CurrentCredentialSummaryDto {
  hasCredential: boolean
  expiresAt: string | null
  updatedAt: string | null
}

export interface CurrentAccessSessionSummaryDto {
  sessionId: string
  accessMode: AccessMode
  sessionStatus: AccessSessionStatus
  sessionStatusReason: string | null
  challenge: JsonObject | null
  hasCandidateCredential: boolean
  credentialApplied: boolean
  hasLogs: boolean
  expiresAt: string | null
  verifiedAt: string | null
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
  connectionStatus: ConnectionStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  hasCurrentCredential: boolean
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
  connectionStatus: ConnectionStatus
  connectionStatusReason: string | null
  availabilityStatus: AvailabilityStatus
  availabilityStatusReason: string | null
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  currentCredential: CurrentCredentialSummaryDto
  currentAccessSession: CurrentAccessSessionSummaryDto | null
  lastConnectedAt: string | null
  lastVerifiedAt: string | null
  deletedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface ListAccountsResultDto {
  items: AccountSummaryDto[]
}

export interface AccessSessionDetailDto {
  accountId: string
  sessionId: string
  platform: string
  accessMode: AccessMode
  sessionStatus: AccessSessionStatus
  sessionStatusReason: string | null
  challenge: JsonObject | null
  hasCandidateCredential: boolean
  credentialApplied: boolean
  resolvedPlatformProfile: ResolvedPlatformProfileDto
  hasLogs: boolean
  expiresAt: string | null
  verifiedAt: string | null
  appliedAt: string | null
  createdAt: string
  updatedAt: string
}

export interface AccessSessionLogEntryDto {
  timestamp: string
  level: AccessSessionLogLevel
  message: string
  details?: JsonObject
}

export interface AccessSessionLogsResponseDto {
  accountId: string
  sessionId: string
  entries: AccessSessionLogEntryDto[]
}

export interface VerifyAccessSessionResponseDto {
  sessionId: string
  verificationResult: VerificationResult
  verificationReason: string | null
  credentialApplied: boolean
  account: AccountDetailDto
  session: AccessSessionDetailDto
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

export type ResolvedPlatformProfileRecord = ResolvedPlatformProfileDto

export interface CurrentCredentialSummaryRecord extends CurrentCredentialSummaryDto {
  expiresAtLabel: string | null
  updatedAtLabel: string | null
}

export interface CurrentAccessSessionSummaryRecord extends CurrentAccessSessionSummaryDto {
  createdAtLabel: string | null
  updatedAtLabel: string | null
  verifiedAtLabel: string | null
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
  connectionStatus: ConnectionStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileRecord
  hasCurrentCredential: boolean
  updatedAt: string
  updatedAtLabel: string
  state: AccountStateView
}

export interface AccountDetailRecord extends AccountRecord {
  connectionStatusReason: string | null
  availabilityStatusReason: string | null
  platformMetadata: JsonObject
  currentCredential: CurrentCredentialSummaryRecord
  currentAccessSession: CurrentAccessSessionSummaryRecord | null
  lastConnectedAt: string | null
  lastConnectedAtLabel: string | null
  lastVerifiedAt: string | null
  lastVerifiedAtLabel: string | null
  createdAt: string
  createdAtLabel: string | null
  deletedAt: string | null
  deletedAtLabel: string | null
}

export interface AccessSessionDetailRecord extends AccessSessionDetailDto {
  stateLabel: string
  stateTone: AccountStateTone
  challengeImageUrl: string | null
  challengeMessage: string | null
  createdAtLabel: string | null
  updatedAtLabel: string | null
  verifiedAtLabel: string | null
  appliedAtLabel: string | null
  expiresAtLabel: string | null
}

export interface AccessSessionLogEntryRecord extends AccessSessionLogEntryDto {
  timestampLabel: string | null
}

export interface AccessSessionLogsRecord {
  accountId: string
  sessionId: string
  entries: AccessSessionLogEntryRecord[]
}
