export type AgentNodeType = 'openclaw' | 'codex' | 'bridge'
export type AgentNodeStatus = 'active' | 'idle' | 'missing'
export type AgentCapabilityStatus = 'ready' | 'pending' | 'missing'
export type AgentServiceConnectionStatus =
  | 'not_configured'
  | 'pending_verification'
  | 'connected'
  | 'connection_failed'
export type AgentServiceCapabilityStatus =
  | 'not_ready'
  | 'preparing'
  | 'ready'
  | 'prepare_failed'

export interface AgentNodeConfigRecord {
  installPath: string
  gatewayUrl: string
  authToken: string
  parallelLimit: number
  diagnosticsStatus: 'awaiting' | 'connected' | 'offline'
  diagnosticsLogs: string[]
}

export interface AgentNodeRecord {
  id: string
  name: string
  type: AgentNodeType
  endpoint: string
  status: AgentNodeStatus
  capabilityStatus: AgentCapabilityStatus
  notes: string
  roleLabel?: string
  versionLabel?: string
  badgeLabel?: string
  latencyMs?: number
  avatarUrl?: string
  config?: AgentNodeConfigRecord
}

export interface OpenClawSetupFormInput {
  endpointUrl: string
  authenticationKind: string
  secret: string
}

export interface AgentServiceRecoverableError {
  status: number
  message: string
  payload?: unknown
}

export interface AgentServiceAuthenticationInput {
  kind: string
  secret: string
}

export interface ConfigureAgentServiceRequest {
  providerCode: string
  endpointUrl: string
  authentication: AgentServiceAuthenticationInput
}

export type UpdateAgentServiceRequest = ConfigureAgentServiceRequest

export interface CurrentAgentServiceDto {
  agentServiceId: string
  providerCode: string
  endpointUrl: string
  authenticationKind: string
  hasCredential: boolean
  connectionStatus: AgentServiceConnectionStatus
  connectionStatusReason?: string | null
  capabilityStatus: AgentServiceCapabilityStatus
  capabilityStatusReason?: string | null
  isActive: boolean
  isUsable: boolean
  lastVerifiedAt?: string | null
  lastConnectedAt?: string | null
  capabilityPreparedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface AgentServiceStatusSnapshotDto {
  hasCurrentService: boolean
  currentService: CurrentAgentServiceDto | null
  connectionStatus: AgentServiceConnectionStatus
  capabilityStatus: AgentServiceCapabilityStatus
  isUsable: boolean
  warning?: string | null
}

export interface ConnectionVerificationResultDto {
  agentServiceId: string
  connectionStatus: AgentServiceConnectionStatus
  reason: string | null
  isUsable: boolean
  verifiedAt: string
}

export interface CapabilityProvisioningResultDto {
  agentServiceId: string
  capabilityStatus: AgentServiceCapabilityStatus
  reason: string | null
  connectionStatus: AgentServiceConnectionStatus
  isUsable: boolean
  preparedAt?: string | null
}
