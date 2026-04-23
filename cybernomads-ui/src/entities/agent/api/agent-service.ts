import type {
  AgentCapabilityStatus,
  AgentServiceRecoverableError,
  AgentNodeRecord,
  AgentNodeStatus,
  AgentServiceCapabilityStatus,
  AgentServiceConnectionStatus,
  AgentServiceStatusSnapshotDto,
  CapabilityProvisioningResultDto,
  ConfigureAgentServiceRequest,
  ConnectionVerificationResultDto,
  CurrentAgentServiceDto,
  OpenClawSetupFormInput,
  UpdateAgentServiceRequest,
} from '@/entities/agent/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

const AGENT_SERVICE_API_ROOT = '/agent-services/current'

function mapConnectionStatusToNodeStatus(status: AgentServiceConnectionStatus): AgentNodeStatus {
  if (status === 'connected') return 'active'
  if (status === 'not_configured' || status === 'connection_failed') return 'missing'
  return 'idle'
}

function mapCapabilityStatus(status: AgentServiceCapabilityStatus): AgentCapabilityStatus {
  if (status === 'ready') return 'ready'
  if (status === 'prepare_failed' || status === 'not_ready') return 'missing'
  return 'pending'
}

function mapCurrentServiceToAgentNode(dto: CurrentAgentServiceDto): AgentNodeRecord {
  return {
    id: dto.agentServiceId,
    name: `${dto.providerCode || 'Agent'} Service`,
    type: dto.providerCode === 'openclaw' ? 'openclaw' : 'bridge',
    endpoint: dto.endpointUrl,
    status: mapConnectionStatusToNodeStatus(dto.connectionStatus),
    capabilityStatus: mapCapabilityStatus(dto.capabilityStatus),
    notes:
      dto.connectionStatusReason ??
      dto.capabilityStatusReason ??
      (dto.isUsable ? 'Current agent service is connected.' : 'Current agent service needs verification.'),
    roleLabel: dto.providerCode,
    versionLabel: dto.authenticationKind,
    badgeLabel: dto.isUsable ? 'CURRENT' : 'NEEDS_ATTENTION',
    config: {
      installPath: '',
      gatewayUrl: dto.endpointUrl,
      authToken: dto.hasCredential ? '********' : '',
      parallelLimit: 8,
      diagnosticsStatus: dto.connectionStatus === 'connected' ? 'connected' : 'offline',
      diagnosticsLogs: [
        `[API] connection=${dto.connectionStatus}`,
        `[API] capability=${dto.capabilityStatus}`,
      ],
    },
  }
}

function mapOpenClawSetupToRequest(input: OpenClawSetupFormInput): ConfigureAgentServiceRequest {
  return {
    providerCode: 'openclaw',
    endpointUrl: input.endpointUrl,
    authentication: {
      kind: input.authenticationKind,
      secret: input.secret,
    },
  }
}

export function toRecoverableAgentServiceError(error: unknown): AgentServiceRecoverableError {
  if (error instanceof HttpClientError) {
    return {
      status: error.status,
      message: error.message,
      payload: error.payload,
    }
  }

  return {
    status: 0,
    message: error instanceof Error ? error.message : 'Unknown Agent service request error.',
  }
}

export async function getCurrentAgentService(): Promise<CurrentAgentServiceDto | null> {
  try {
    return await requestJson<CurrentAgentServiceDto>(AGENT_SERVICE_API_ROOT)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function getCurrentAgentServiceStatus(): Promise<AgentServiceStatusSnapshotDto> {
  try {
    return await requestJson<AgentServiceStatusSnapshotDto>(`${AGENT_SERVICE_API_ROOT}/status`)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return {
        hasCurrentService: false,
        currentService: null,
        connectionStatus: 'not_configured',
        capabilityStatus: 'not_ready',
        isUsable: false,
        warning: 'Current Agent service is not configured.',
      }
    }

    throw error
  }
}

export async function configureCurrentAgentService(
  input: ConfigureAgentServiceRequest,
): Promise<CurrentAgentServiceDto> {
  return requestJson<CurrentAgentServiceDto>(AGENT_SERVICE_API_ROOT, {
    method: 'POST',
    body: input,
  })
}

export async function updateCurrentAgentService(
  input: UpdateAgentServiceRequest,
): Promise<CurrentAgentServiceDto> {
  return requestJson<CurrentAgentServiceDto>(AGENT_SERVICE_API_ROOT, {
    method: 'PUT',
    body: input,
  })
}

export async function verifyCurrentAgentServiceConnection(): Promise<ConnectionVerificationResultDto> {
  return requestJson<ConnectionVerificationResultDto>(`${AGENT_SERVICE_API_ROOT}/connection-verification`, {
    method: 'POST',
  })
}

export async function prepareCurrentAgentServiceCapabilities(): Promise<CapabilityProvisioningResultDto> {
  return requestJson<CapabilityProvisioningResultDto>(`${AGENT_SERVICE_API_ROOT}/capability-provisioning`, {
    method: 'POST',
  })
}

export async function listAgentNodes(): Promise<AgentNodeRecord[]> {
  const status = await getCurrentAgentServiceStatus()

  if (!status.currentService) {
    return [
      {
        id: 'current-agent-service',
        name: 'OpenClaw Service',
        type: 'openclaw',
        endpoint: '',
        status: 'missing',
        capabilityStatus: 'missing',
        notes: status.warning ?? 'No current agent service is configured.',
        roleLabel: 'openclaw',
        badgeLabel: 'REQUIRED',
      },
    ]
  }

  return [mapCurrentServiceToAgentNode(status.currentService)]
}

export async function saveOpenClawConfig(input: OpenClawSetupFormInput): Promise<CurrentAgentServiceDto> {
  const request = mapOpenClawSetupToRequest(input)
  const existing = await getCurrentAgentService()

  return existing
    ? updateCurrentAgentService(request)
    : configureCurrentAgentService(request)
}
