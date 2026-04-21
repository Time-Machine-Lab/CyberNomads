import type { InterventionRecord } from '@/entities/intervention-record/model/types'
import type { TaskRunRecord } from '@/entities/task-run/model/types'
import type { WorkspaceRecord } from '@/entities/workspace/model/types'
import { env } from '@/shared/config/env'
import { getInterventionContextData, sendInterventionCommandData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real intervention APIs are not wired yet. Enable mock mode to continue.')
  }
}

export interface InterventionContext {
  workspace: WorkspaceRecord
  task: TaskRunRecord
  records: InterventionRecord[]
}

export async function getInterventionContext(
  workspaceId: string,
  taskId: string,
): Promise<InterventionContext | null> {
  assertMockOnly()
  return getInterventionContextData(workspaceId, taskId)
}

export async function sendInterventionCommand(
  workspaceId: string,
  taskId: string,
  command: string,
): Promise<InterventionRecord> {
  assertMockOnly()
  return sendInterventionCommandData(workspaceId, taskId, command)
}
