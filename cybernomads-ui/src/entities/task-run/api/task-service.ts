import type {
  BackendTaskStatus,
  CreateTaskOutputRecordRequest,
  ListTaskOutputRecordsResultDto,
  ListTasksResultDto,
  TaskDetailDto,
  TaskOutputRecordDto,
  TaskRunRecord,
  TaskSummaryDto,
  UpdateTaskStatusRequest,
} from '@/entities/task-run/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

const TASK_API_ROOT = '/tasks'

export interface ListTasksOptions {
  trafficWorkId?: string
  status?: BackendTaskStatus
  keyword?: string
}

function mapBackendStatus(status: BackendTaskStatus): TaskRunRecord['status'] {
  if (status === 'ready') return 'queued'
  if (status === 'failed') return 'attention'
  return status
}

function resolveStatusLabel(status: BackendTaskStatus) {
  if (status === 'ready') return 'Ready'
  if (status === 'running') return 'Running'
  if (status === 'completed') return 'Completed'
  return 'Failed'
}

function mapTaskSummaryToRunRecord(dto: TaskSummaryDto, index = 0): TaskRunRecord {
  const progressByStatus: Record<BackendTaskStatus, number> = {
    ready: 0,
    running: 55,
    completed: 100,
    failed: 80,
  }

  return {
    id: dto.taskId,
    workspaceId: dto.trafficWorkId,
    name: dto.name,
    summary: dto.inputNeeds.map((need) => need.description).join(' / ') || dto.condition.cron || 'Contract-backed task',
    status: mapBackendStatus(dto.status),
    statusLabel: resolveStatusLabel(dto.status),
    progress: progressByStatus[dto.status],
    lastRunAt: dto.updatedAt,
    nextRunAt: dto.condition.cron ?? dto.updatedAt,
    code: `TASK-${String(index + 1).padStart(2, '0')}`,
    accent: dto.status === 'failed' ? 'red' : dto.status === 'completed' ? 'lime' : 'cyan',
    note: dto.condition.cron ?? 'No schedule declared',
    condition: dto.condition,
    inputNeeds: dto.inputNeeds,
  }
}

function mapTaskDetailToRunRecord(dto: TaskDetailDto): TaskRunRecord {
  return {
    ...mapTaskSummaryToRunRecord(dto),
    summary: dto.instruction,
    instruction: dto.instruction,
    contextRef: dto.contextRef,
    statusReason: dto.statusReason,
  }
}

export async function listTasks(options: ListTasksOptions = {}): Promise<TaskRunRecord[]> {
  const result = await requestJson<ListTasksResultDto>(TASK_API_ROOT, {
    query: {
      trafficWorkId: options.trafficWorkId,
      status: options.status,
      keyword: options.keyword,
    },
  })

  return applyTaskGraphLayout(result.items.map(mapTaskSummaryToRunRecord))
}

export async function getTaskById(taskId: string): Promise<TaskRunRecord | null> {
  try {
    const dto = await requestJson<TaskDetailDto>(`${TASK_API_ROOT}/${encodeURIComponent(taskId)}`)
    return applyTaskGraphLayout([mapTaskDetailToRunRecord(dto)])[0] ?? null
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

function applyTaskGraphLayout(tasks: TaskRunRecord[]): TaskRunRecord[] {
  if (tasks.length === 0) {
    return tasks
  }

  const tasksById = new Map(tasks.map((task) => [task.id, task]))
  const depthCache = new Map<string, number>()

  const resolveDepth = (taskId: string, stack = new Set<string>()): number => {
    if (depthCache.has(taskId)) {
      return depthCache.get(taskId) ?? 0
    }

    if (stack.has(taskId)) {
      return 0
    }

    const task = tasksById.get(taskId)

    if (!task?.condition?.relyOnTaskIds.length) {
      depthCache.set(taskId, 0)
      return 0
    }

    stack.add(taskId)
    const depth =
      Math.max(
        ...task.condition.relyOnTaskIds.map((dependencyId) =>
          tasksById.has(dependencyId) ? resolveDepth(dependencyId, stack) + 1 : 0,
        ),
      ) ?? 0
    stack.delete(taskId)
    depthCache.set(taskId, depth)
    return depth
  }

  const lanes = new Map<number, TaskRunRecord[]>()

  for (const task of tasks) {
    const depth = resolveDepth(task.id)
    const lane = lanes.get(depth) ?? []
    lane.push(task)
    lanes.set(depth, lane)
  }

  for (const lane of lanes.values()) {
    lane.sort((left, right) => left.name.localeCompare(right.name, 'zh-CN'))
  }

  return tasks.map((task) => {
    const depth = resolveDepth(task.id)
    const lane = lanes.get(depth) ?? []
    const rowIndex = lane.findIndex((candidate) => candidate.id === task.id)

    return {
      ...task,
      x: 120 + depth * 380,
      y: 140 + Math.max(rowIndex, 0) * 240,
    }
  })
}

export async function updateTaskStatus(
  taskId: string,
  input: UpdateTaskStatusRequest,
): Promise<TaskRunRecord> {
  const dto = await requestJson<TaskDetailDto>(`${TASK_API_ROOT}/${encodeURIComponent(taskId)}/status`, {
    method: 'PATCH',
    body: input,
  })

  return mapTaskDetailToRunRecord(dto)
}

export async function listTaskOutputRecords(taskId: string): Promise<TaskOutputRecordDto[]> {
  const result = await requestJson<ListTaskOutputRecordsResultDto>(
    `${TASK_API_ROOT}/${encodeURIComponent(taskId)}/outputs`,
  )

  return result.items
}

export async function createTaskOutputRecord(
  taskId: string,
  input: CreateTaskOutputRecordRequest,
): Promise<TaskOutputRecordDto> {
  return requestJson<TaskOutputRecordDto>(`${TASK_API_ROOT}/${encodeURIComponent(taskId)}/outputs`, {
    method: 'POST',
    body: input,
  })
}
