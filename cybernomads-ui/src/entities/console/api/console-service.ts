import type { ConsoleOverviewRecord } from '@/entities/console/model/types'
import { env } from '@/shared/config/env'
import { getConsoleOverviewData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real console APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function getConsoleOverview(): Promise<ConsoleOverviewRecord> {
  assertMockOnly()
  return getConsoleOverviewData()
}
