import { listTasks } from '@/entities/task-run/api/task-service'
import type {
  CreateTrafficWorkRequest,
  CreateWorkspaceInput,
  ListTrafficWorksResultDto,
  TrafficWorkContextPreparationStatus,
  TrafficWorkDetailDto,
  TrafficWorkLifecycleStatus,
  TrafficWorkSummaryDto,
  UpdateTrafficWorkRequest,
  WorkspaceExecutionView,
  WorkspaceRecord,
  WorkspaceStatus,
} from '@/entities/workspace/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

const TRAFFIC_WORK_API_ROOT = '/traffic-works'

export interface ListTrafficWorksOptions {
  productId?: string
  strategyId?: string
  keyword?: string
  lifecycleStatus?: TrafficWorkLifecycleStatus
  contextPreparationStatus?: TrafficWorkContextPreparationStatus
}

function mapLifecycleStatus(status: TrafficWorkLifecycleStatus): WorkspaceStatus {
  if (status === 'running') return 'running'
  if (status === 'ready') return 'ready'
  if (status === 'ended' || status === 'archived') return 'draft'
  return 'attention'
}

function resolveLifecycleLabel(status: TrafficWorkLifecycleStatus) {
  if (status === 'ready') return '已就绪'
  if (status === 'running') return '运行中'
  if (status === 'ended') return '已结束'
  if (status === 'archived') return '已归档'
  return '已删除'
}

function resolvePreparationLabel(status: TrafficWorkContextPreparationStatus) {
  if (status === 'prepared') return '已准备'
  if (status === 'failed') return '准备失败'
  return '准备中'
}

function localizeTrafficWorkReason(reason?: string | null) {
  if (!reason) {
    return null
  }

  const knownReasons: Record<string, string> = {
    'The current active agent service is not configured.': '当前未配置可用的 Agent 服务。',
    'Traffic work archived.': '工作区已归档。',
    'Traffic work deleted.': '工作区已删除。',
    'Traffic work ended.': '工作区已结束。',
    'Traffic work started.': '工作区已启动。',
    'Traffic work paused.': '工作区已暂停。',
    'Traffic work context prepared.': '工作区上下文已准备完成。',
    'Traffic work context preparation failed.': '工作区上下文准备失败。',
  }

  return knownReasons[reason] ?? reason
}

function resolveContextBanner(status: TrafficWorkContextPreparationStatus, reason?: string | null) {
  if (status === 'prepared') return undefined
  if (status === 'failed') return localizeTrafficWorkReason(reason) ?? '上下文准备失败'
  return localizeTrafficWorkReason(reason) ?? '上下文准备中'
}

function mapTrafficWorkToWorkspace(
  dto: TrafficWorkSummaryDto | TrafficWorkDetailDto,
): WorkspaceRecord {
  const objectBindings = 'objectBindings' in dto ? dto.objectBindings : undefined
  const objectBindingCount = 'objectBindings' in dto ? dto.objectBindings.length : dto.objectBindingCount
  const lifecycleStatusLabel = resolveLifecycleLabel(dto.lifecycleStatus)
  const contextPreparationStatusLabel = resolvePreparationLabel(dto.contextPreparationStatus)
  const lifecycleStatusReason =
    'lifecycleStatusReason' in dto ? localizeTrafficWorkReason(dto.lifecycleStatusReason) : null
  const contextPreparationStatusReason =
    'contextPreparationStatusReason' in dto
      ? localizeTrafficWorkReason(dto.contextPreparationStatusReason)
      : null

  return {
    id: dto.trafficWorkId,
    name: dto.displayName,
    summary: `${dto.product.name} / ${dto.strategy.name}`,
    status: mapLifecycleStatus(dto.lifecycleStatus),
    statusLabel: `${lifecycleStatusLabel} / ${contextPreparationStatusLabel}`,
    assetId: dto.product.productId,
    assetName: dto.product.name,
    strategyId: dto.strategy.strategyId,
    strategyName: dto.strategy.name,
    accountIds: (objectBindings ?? []).map((binding) => binding.resourceId).filter(Boolean),
    taskIds: [],
    lastRunAt: 'lastStartedAt' in dto ? (dto.lastStartedAt ?? dto.updatedAt) : dto.updatedAt,
    nextRunAt: 'contextPreparedAt' in dto ? (dto.contextPreparedAt ?? dto.updatedAt) : dto.updatedAt,
    assignedAgentLabels: (objectBindings ?? []).map((binding) => binding.resourceLabel ?? binding.resourceId).filter(Boolean),
    highlightBanner: resolveContextBanner(
      dto.contextPreparationStatus,
      contextPreparationStatusReason,
    ),
    themeColor: dto.lifecycleStatus === 'running' ? 'cyan' : dto.contextPreparationStatus === 'failed' ? 'red' : 'blue',
    lifecycleStatus: dto.lifecycleStatus,
    lifecycleStatusLabel,
    lifecycleStatusReason,
    contextPreparationStatus: dto.contextPreparationStatus,
    contextPreparationStatusLabel,
    contextPreparationStatusReason,
    objectBindingCount,
    objectBindings,
    createdAt: 'createdAt' in dto ? dto.createdAt : dto.updatedAt,
    updatedAt: dto.updatedAt,
  }
}

function mapCreateWorkspaceInput(input: CreateWorkspaceInput): CreateTrafficWorkRequest {
  return {
    displayName: input.name,
    productId: input.assetId,
    strategyId: input.strategyId,
    objectBindings: input.objectBindings,
  }
}

export async function listWorkspaces(options: ListTrafficWorksOptions = {}): Promise<WorkspaceRecord[]> {
  const result = await requestJson<ListTrafficWorksResultDto>(TRAFFIC_WORK_API_ROOT, {
    query: {
      productId: options.productId,
      strategyId: options.strategyId,
      keyword: options.keyword,
      lifecycleStatus: options.lifecycleStatus,
      contextPreparationStatus: options.contextPreparationStatus,
    },
  })

  return result.items.map(mapTrafficWorkToWorkspace)
}

export async function getWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
  try {
    const dto = await requestJson<TrafficWorkDetailDto>(`${TRAFFIC_WORK_API_ROOT}/${encodeURIComponent(id)}`)
    return mapTrafficWorkToWorkspace(dto)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function getWorkspaceExecution(workspaceId: string): Promise<WorkspaceExecutionView | null> {
  const workspace = await getWorkspaceById(workspaceId)

  if (!workspace) {
    return null
  }

  const tasks = await listTasks({ trafficWorkId: workspaceId })

  return {
    workspace: {
      ...workspace,
      taskIds: tasks.map((task) => task.id),
    },
    tasks,
    logs: [],
  }
}

export async function createTrafficWork(input: CreateTrafficWorkRequest): Promise<WorkspaceRecord> {
  const dto = await requestJson<TrafficWorkDetailDto>(TRAFFIC_WORK_API_ROOT, {
    method: 'POST',
    body: input,
  })

  return mapTrafficWorkToWorkspace(dto)
}

export async function updateTrafficWork(
  trafficWorkId: string,
  input: UpdateTrafficWorkRequest,
): Promise<WorkspaceRecord> {
  const dto = await requestJson<TrafficWorkDetailDto>(
    `${TRAFFIC_WORK_API_ROOT}/${encodeURIComponent(trafficWorkId)}`,
    {
      method: 'PUT',
      body: input,
    },
  )

  return mapTrafficWorkToWorkspace(dto)
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord> {
  return createTrafficWork(mapCreateWorkspaceInput(input))
}

async function postLifecycleAction(trafficWorkId: string, action: 'start' | 'pause' | 'end' | 'archive') {
  const dto = await requestJson<TrafficWorkDetailDto>(
    `${TRAFFIC_WORK_API_ROOT}/${encodeURIComponent(trafficWorkId)}/${action}`,
    {
      method: 'POST',
    },
  )

  return mapTrafficWorkToWorkspace(dto)
}

export function startTrafficWork(trafficWorkId: string) {
  return postLifecycleAction(trafficWorkId, 'start')
}

export function pauseTrafficWork(trafficWorkId: string) {
  return postLifecycleAction(trafficWorkId, 'pause')
}

export function endTrafficWork(trafficWorkId: string) {
  return postLifecycleAction(trafficWorkId, 'end')
}

export function archiveTrafficWork(trafficWorkId: string) {
  return postLifecycleAction(trafficWorkId, 'archive')
}

export async function deleteTrafficWork(trafficWorkId: string): Promise<WorkspaceRecord> {
  const dto = await requestJson<TrafficWorkDetailDto>(
    `${TRAFFIC_WORK_API_ROOT}/${encodeURIComponent(trafficWorkId)}`,
    {
      method: 'DELETE',
    },
  )

  return mapTrafficWorkToWorkspace(dto)
}

export async function tickWorkspaceExecution(
  workspaceId: string,
): Promise<WorkspaceExecutionView | null> {
  return getWorkspaceExecution(workspaceId)
}
