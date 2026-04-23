import { listTasks } from '@/entities/task-run/api/task-service'
import type {
  CreateTrafficWorkRequest,
  CreateWorkspaceInput,
  ListTrafficWorksResultDto,
  ObjectBindingItem,
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
  if (status === 'ready') return 'Ready'
  if (status === 'running') return 'Running'
  if (status === 'ended') return 'Ended'
  if (status === 'archived') return 'Archived'
  return 'Deleted'
}

function resolveContextBanner(status: TrafficWorkContextPreparationStatus, reason?: string | null) {
  if (status === 'prepared') return undefined
  if (status === 'failed') return reason ?? 'Context preparation failed'
  return 'Context preparation pending'
}

function mapTrafficWorkToWorkspace(
  dto: TrafficWorkSummaryDto | TrafficWorkDetailDto,
): WorkspaceRecord {
  const objectBindings =
    'objectBindings' in dto
      ? dto.objectBindings
      : Array.from({ length: dto.objectBindingCount }, (_, index): ObjectBindingItem => ({
          objectType: 'account',
          objectKey: `account-${index + 1}`,
          resourceId: '',
          resourceLabel: `Account ${index + 1}`,
        }))

  return {
    id: dto.trafficWorkId,
    name: dto.displayName,
    summary: `${dto.product.name} / ${dto.strategy.name}`,
    status: mapLifecycleStatus(dto.lifecycleStatus),
    statusLabel: `${resolveLifecycleLabel(dto.lifecycleStatus)} / ${dto.contextPreparationStatus}`,
    assetId: dto.product.productId,
    strategyId: dto.strategy.strategyId,
    accountIds: objectBindings.map((binding) => binding.resourceId).filter(Boolean),
    taskIds: [],
    lastRunAt: 'lastStartedAt' in dto ? (dto.lastStartedAt ?? dto.updatedAt) : dto.updatedAt,
    nextRunAt: 'contextPreparedAt' in dto ? (dto.contextPreparedAt ?? dto.updatedAt) : dto.updatedAt,
    assignedAgentLabels: objectBindings.map((binding) => binding.resourceLabel ?? binding.resourceId).filter(Boolean),
    highlightBanner: resolveContextBanner(
      dto.contextPreparationStatus,
      'contextPreparationStatusReason' in dto ? dto.contextPreparationStatusReason : null,
    ),
    themeColor: dto.lifecycleStatus === 'running' ? 'cyan' : dto.contextPreparationStatus === 'failed' ? 'red' : 'blue',
    lifecycleStatus: dto.lifecycleStatus,
    contextPreparationStatus: dto.contextPreparationStatus,
    objectBindings,
  }
}

function mapCreateWorkspaceInput(input: CreateWorkspaceInput): CreateTrafficWorkRequest {
  return {
    displayName: input.name,
    productId: input.assetId,
    strategyId: input.strategyId,
    objectBindings: input.accountIds.map((accountId, index) => ({
      objectType: 'account',
      objectKey: index === 0 ? 'primary-account' : `account-${index + 1}`,
      resourceId: accountId,
      resourceLabel: `Account ${index + 1}`,
    })),
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
