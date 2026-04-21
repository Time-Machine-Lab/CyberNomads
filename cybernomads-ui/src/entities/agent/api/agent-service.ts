import type { AgentNodeRecord, SaveOpenClawConfigInput } from '@/entities/agent/model/types'
import { env } from '@/shared/config/env'
import { listAgentNodesData, saveOpenClawConfigData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real agent APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function listAgentNodes(): Promise<AgentNodeRecord[]> {
  assertMockOnly()
  return listAgentNodesData()
}

export async function saveOpenClawConfig(input: SaveOpenClawConfigInput): Promise<AgentNodeRecord> {
  assertMockOnly()
  return saveOpenClawConfigData(input)
}
