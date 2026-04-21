import type { ExecutionLogEntry, TaskRunRecord } from '@/entities/task-run/model/types'

export type WorkspaceStatus = 'draft' | 'ready' | 'running' | 'attention'

export interface WorkspaceRecord {
  id: string
  name: string
  summary: string
  status: WorkspaceStatus
  statusLabel?: string
  assetId: string
  strategyId: string
  accountIds: string[]
  taskIds: string[]
  lastRunAt: string
  nextRunAt: string
  assignedAgentLabels?: string[]
  highlightBanner?: string
  themeColor?: 'cyan' | 'lime' | 'blue' | 'red'
}

export interface CreateWorkspaceInput {
  name: string
  summary: string
  assetId: string
  strategyId: string
  accountIds: string[]
}

export interface WorkspaceExecutionView {
  workspace: WorkspaceRecord
  tasks: TaskRunRecord[]
  logs: ExecutionLogEntry[]
}
