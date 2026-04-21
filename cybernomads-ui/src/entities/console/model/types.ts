import type { AgentNodeRecord } from '@/entities/agent/model/types'

export type ConsoleSetupState = 'unconfigured' | 'configured'

export interface ConsoleOverviewRecord {
  state: ConsoleSetupState
  statusLabel: string
  statusTone: 'primary' | 'secondary' | 'error'
  description: string
  networkLatencyLabel?: string
  nodes: AgentNodeRecord[]
}
