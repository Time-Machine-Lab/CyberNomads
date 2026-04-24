import type { InterventionRecord } from '@/entities/intervention-record/model/types'
import { createTaskOutputRecord, getTaskById, listTaskOutputRecords } from '@/entities/task-run/api/task-service'
import type { TaskOutputRecordDto } from '@/entities/task-run/model/types'
import type { TaskRunRecord } from '@/entities/task-run/model/types'
import { getWorkspaceById } from '@/entities/workspace/api/workspace-service'
import type { WorkspaceRecord } from '@/entities/workspace/model/types'

export interface InterventionContext {
  workspace: WorkspaceRecord
  task: TaskRunRecord
  records: InterventionRecord[]
}

function mapOutputRecordToIntervention(
  workspaceId: string,
  output: TaskOutputRecordDto,
): InterventionRecord {
  return {
    id: output.outputRecordId,
    workspaceId,
    taskId: output.taskId,
    command: output.description,
    response: output.dataLocation,
    actor: 'Task Output',
    createdAt: output.createdAt,
    severity: 'info',
  }
}

export async function getInterventionContext(
  workspaceId: string,
  taskId: string,
): Promise<InterventionContext | null> {
  const [workspace, task, outputs] = await Promise.all([
    getWorkspaceById(workspaceId),
    getTaskById(taskId),
    listTaskOutputRecords(taskId),
  ])

  if (!workspace || !task) {
    return null
  }

  return {
    workspace,
    task,
    records: outputs.map((output) => mapOutputRecordToIntervention(workspaceId, output)),
  }
}

export async function createTaskOutputNote(
  workspaceId: string,
  taskId: string,
  description: string,
): Promise<InterventionRecord> {
  const output = await createTaskOutputRecord(taskId, {
    description,
    dataLocation: `task-output://${taskId}/${Date.now()}`,
  })

  return mapOutputRecordToIntervention(workspaceId, output)
}

export const sendInterventionCommand = createTaskOutputNote
