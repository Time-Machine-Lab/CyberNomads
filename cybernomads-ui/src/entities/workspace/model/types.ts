import type { ExecutionLogEntry, TaskRunRecord } from '@/entities/task-run/model/types'

export type WorkspaceStatus = 'draft' | 'ready' | 'running' | 'attention'
export type TrafficWorkLifecycleStatus = 'ready' | 'running' | 'ended' | 'archived' | 'deleted'
export type TrafficWorkContextPreparationStatus = 'pending' | 'prepared' | 'failed'

export interface ObjectBindingItem {
  objectType: string
  objectKey: string
  resourceId: string
  resourceLabel?: string | null
}

export type StrategyParameterBindingType = string

export interface StrategyParameterBinding {
  type: StrategyParameterBindingType
  key: string
  value: string
}

export interface TrafficWorkBindingSummary {
  productId?: string
  strategyId?: string
  name: string
}

export interface TrafficWorkSummaryDto {
  trafficWorkId: string
  displayName: string
  product: { productId: string; name: string }
  strategy: { strategyId: string; name: string }
  objectBindingCount: number
  lifecycleStatus: TrafficWorkLifecycleStatus
  contextPreparationStatus: TrafficWorkContextPreparationStatus
  updatedAt: string
}

export interface TrafficWorkDetailDto {
  trafficWorkId: string
  displayName: string
  product: { productId: string; name: string }
  strategy: { strategyId: string; name: string }
  objectBindings: ObjectBindingItem[]
  parameterBindings: StrategyParameterBinding[]
  lifecycleStatus: TrafficWorkLifecycleStatus
  lifecycleStatusReason?: string | null
  contextPreparationStatus: TrafficWorkContextPreparationStatus
  contextPreparationStatusReason?: string | null
  contextPreparedAt?: string | null
  lastStartedAt?: string | null
  endedAt?: string | null
  archivedAt?: string | null
  deletedAt?: string | null
  createdAt: string
  updatedAt: string
}

export interface ListTrafficWorksResultDto {
  items: TrafficWorkSummaryDto[]
}

export interface CreateTrafficWorkRequest {
  displayName: string
  productId: string
  strategyId: string
  objectBindings: ObjectBindingItem[]
  parameterBindings: StrategyParameterBinding[]
}

export type UpdateTrafficWorkRequest = CreateTrafficWorkRequest

export interface WorkspaceRecord {
  id: string
  name: string
  summary: string
  status: WorkspaceStatus
  statusLabel?: string
  assetId: string
  assetName?: string
  strategyId: string
  strategyName?: string
  accountIds: string[]
  taskIds: string[]
  lastRunAt: string
  nextRunAt: string
  assignedAgentLabels?: string[]
  highlightBanner?: string
  themeColor?: 'cyan' | 'lime' | 'blue' | 'red'
  lifecycleStatus?: TrafficWorkLifecycleStatus
  lifecycleStatusReason?: string | null
  contextPreparationStatus?: TrafficWorkContextPreparationStatus
  contextPreparationStatusReason?: string | null
  objectBindings?: ObjectBindingItem[]
  parameterBindings?: StrategyParameterBinding[]
  createdAt?: string
  updatedAt?: string
}

export interface CreateWorkspaceInput {
  name: string
  summary: string
  assetId: string
  strategyId: string
  accountIds: string[]
  parameterBindings: StrategyParameterBinding[]
}

export interface WorkspaceExecutionView {
  workspace: WorkspaceRecord
  tasks: TaskRunRecord[]
  logs: ExecutionLogEntry[]
}
