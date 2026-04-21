import type { SaveStrategyInput, StrategyRecord } from '@/entities/strategy/model/types'
import { env } from '@/shared/config/env'
import { getStrategyData, listStrategiesData, saveStrategyData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real strategy APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function listStrategies(): Promise<StrategyRecord[]> {
  assertMockOnly()
  return listStrategiesData()
}

export async function getStrategyById(id: string): Promise<StrategyRecord | null> {
  assertMockOnly()
  return getStrategyData(id)
}

export async function saveStrategy(input: SaveStrategyInput): Promise<StrategyRecord> {
  assertMockOnly()
  return saveStrategyData(input)
}
