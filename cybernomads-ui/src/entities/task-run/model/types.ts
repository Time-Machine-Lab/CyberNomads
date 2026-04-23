export type TaskRunStatus = 'queued' | 'running' | 'completed' | 'attention'
export type BackendTaskStatus = 'ready' | 'running' | 'completed' | 'failed'

export interface TaskConditionDto {
  cron: string | null
  relyOnTaskIds: string[]
}

export interface TaskInputNeedDto {
  name: string
  description: string
  source: string
}

export interface TaskSummaryDto {
  taskId: string
  trafficWorkId: string
  name: string
  status: BackendTaskStatus
  condition: TaskConditionDto
  inputNeeds: TaskInputNeedDto[]
  updatedAt: string
}

export interface TaskDetailDto extends TaskSummaryDto {
  instruction: string
  documentRef?: string | null
  contextRef: string
  statusReason?: string | null
  createdAt: string
}

export interface ListTasksResultDto {
  items: TaskSummaryDto[]
}

export interface UpdateTaskStatusRequest {
  status: BackendTaskStatus
  statusReason?: string | null
}

export interface TaskOutputRecordDto {
  outputRecordId: string
  taskId: string
  description: string
  dataLocation: string
  createdAt: string
}

export interface ListTaskOutputRecordsResultDto {
  items: TaskOutputRecordDto[]
}

export interface CreateTaskOutputRecordRequest {
  description: string
  dataLocation: string
}

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
  instruction?: string
  contextRef?: string
  statusReason?: string | null
  inputNeeds?: TaskInputNeedDto[]
  condition?: TaskConditionDto
}

export interface ExecutionLogEntry {
  id: string
  workspaceId: string
  level: 'system' | 'agent' | 'warning'
  message: string
  createdAt: string
  sourceLabel?: string
}
