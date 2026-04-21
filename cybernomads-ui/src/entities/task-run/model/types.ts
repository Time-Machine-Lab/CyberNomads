export type TaskRunStatus = 'queued' | 'running' | 'completed' | 'attention'

export interface TaskRunRecord {
  id: string
  workspaceId: string
  name: string
  summary: string
  status: TaskRunStatus
  statusLabel?: string
  progress: number
  lastRunAt: string
  nextRunAt: string
  code?: string
  x?: number
  y?: number
  accent?: 'cyan' | 'lime' | 'blue' | 'red'
  note?: string
}

export interface ExecutionLogEntry {
  id: string
  workspaceId: string
  level: 'system' | 'agent' | 'warning'
  message: string
  createdAt: string
  sourceLabel?: string
}
