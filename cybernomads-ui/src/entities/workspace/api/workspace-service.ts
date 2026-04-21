import type { CreateWorkspaceInput, WorkspaceExecutionView, WorkspaceRecord } from '@/entities/workspace/model/types'
import { env } from '@/shared/config/env'
import {
  createWorkspaceData,
  getWorkspaceData,
  getWorkspaceExecutionData,
  listWorkspacesData,
  tickWorkspaceExecutionData,
} from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real workspace APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function listWorkspaces(): Promise<WorkspaceRecord[]> {
  assertMockOnly()
  return listWorkspacesData()
}

export async function getWorkspaceById(id: string): Promise<WorkspaceRecord | null> {
  assertMockOnly()
  return getWorkspaceData(id)
}

export async function getWorkspaceExecution(workspaceId: string): Promise<WorkspaceExecutionView | null> {
  assertMockOnly()
  return getWorkspaceExecutionData(workspaceId)
}

export async function createWorkspace(input: CreateWorkspaceInput): Promise<WorkspaceRecord> {
  assertMockOnly()
  return createWorkspaceData(input)
}

export async function tickWorkspaceExecution(
  workspaceId: string,
): Promise<WorkspaceExecutionView | null> {
  assertMockOnly()
  return tickWorkspaceExecutionData(workspaceId)
}
