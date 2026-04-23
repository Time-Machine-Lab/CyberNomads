import type {
  AgentServiceCapabilityStatus,
  AgentServiceConnectionStatus,
  CurrentAgentServiceDto,
} from '@/entities/agent/model/types'

export type ConsoleSetupState =
  | 'not_configured'
  | 'pending_verification'
  | 'connected_not_ready'
  | 'ready'
  | 'connection_failed'
  | 'prepare_failed'
  | 'loading_failed'

export interface ConsoleOverviewRecord {
  state: ConsoleSetupState
  statusLabel: string
  statusTone: 'primary' | 'secondary' | 'warning' | 'error'
  actionLabel: string
  description: string
  connectionStatus: AgentServiceConnectionStatus
  capabilityStatus: AgentServiceCapabilityStatus
  hasCurrentService: boolean
  isUsable: boolean
  currentService: CurrentAgentServiceDto | null
  warning?: string | null
}
