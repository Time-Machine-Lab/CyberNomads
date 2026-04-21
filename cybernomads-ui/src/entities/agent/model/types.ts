export type AgentNodeType = 'openclaw' | 'codex' | 'bridge'
export type AgentNodeStatus = 'active' | 'idle' | 'missing'
export type AgentCapabilityStatus = 'ready' | 'pending' | 'missing'

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

export interface SaveOpenClawConfigInput {
  id?: string
  name: string
  endpoint: string
  notes: string
  installPath?: string
  gatewayUrl?: string
  authToken?: string
  parallelLimit?: number
}
