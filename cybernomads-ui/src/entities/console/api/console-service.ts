import { getCurrentAgentServiceStatus, listAgentNodes } from '@/entities/agent/api/agent-service'
import type { ConsoleOverviewRecord } from '@/entities/console/model/types'

function resolveStatusLabel(input: { hasCurrentService: boolean; isUsable: boolean }) {
  if (!input.hasCurrentService) return 'UNCONFIGURED'
  return input.isUsable ? 'CONNECTED' : 'NEEDS_VERIFICATION'
}

export async function getConsoleOverview(): Promise<ConsoleOverviewRecord> {
  const [status, nodes] = await Promise.all([getCurrentAgentServiceStatus(), listAgentNodes()])
  const isConfigured = status.hasCurrentService && status.isUsable

  return {
    state: isConfigured ? 'configured' : 'unconfigured',
    statusLabel: resolveStatusLabel(status),
    statusTone: isConfigured ? 'primary' : 'error',
    description:
      status.warning ??
      (isConfigured
        ? 'Current Agent service is usable. You can continue into product-domain workflows.'
        : 'Configure and verify the current Agent service before creating traffic works.'),
    networkLatencyLabel: status.isUsable ? 'API READY' : 'WAITING',
    nodes,
  }
}
