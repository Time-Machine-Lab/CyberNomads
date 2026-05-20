import type {
  AgentCapabilityStatus,
  AgentServiceRecoverableError,
  AgentNodeRecord,
  AgentNodeStatus,
  AgentServiceCapabilityStatus,
  AgentServiceConnectionStatus,
  AgentServicePurpose,
  AgentServiceStatusSnapshotDto,
  CapabilityProvisioningResultDto,
  ConfigureAgentServiceRequest,
  ConnectionVerificationResultDto,
  CurrentAgentServiceDto,
  CybernomadsAgentLlmSetupFormInput,
  OpenClawSetupFormInput,
  UpdateAgentServiceRequest,
} from '@/entities/agent/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

const AGENT_SERVICE_API_ROOT = '/agent-services/current'
const AGENT_SERVICE_PURPOSE_ROOT = '/agent-services'

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
  const isPlanning = dto.purpose === 'planning' || dto.providerCode === 'cybernomads-agent'

  return {
    id: dto.agentServiceId,
    name: isPlanning ? 'Cybernomads Agent LLM' : 'OpenClaw Executor',
    type: dto.providerCode === 'openclaw' ? 'openclaw' : 'bridge',
    endpoint: dto.endpointUrl,
    status: mapConnectionStatusToNodeStatus(dto.connectionStatus),
    capabilityStatus: mapCapabilityStatus(dto.capabilityStatus),
    notes:
      dto.connectionStatusReason ??
      dto.capabilityStatusReason ??
      (isPlanning
        ? 'Planning and Review provider for Cybernomads Agent.'
        : 'Execution provider for confirmed single tasks.'),
    roleLabel: dto.purpose ?? dto.providerCode,
    versionLabel: dto.model ?? dto.authenticationKind,
    badgeLabel: dto.isUsable ? 'CURRENT' : 'NEEDS_ATTENTION',
    config: {
      installPath: '',
      gatewayUrl: dto.endpointUrl,
      authToken: dto.hasCredential ? 'stored credential' : '',
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

function mapCybernomadsAgentLlmSetupToRequest(
  input: CybernomadsAgentLlmSetupFormInput,
): ConfigureAgentServiceRequest {
  return {
    providerCode: 'cybernomads-agent',
    purpose: 'planning',
    endpointUrl: input.endpointUrl,
    model: input.model,
    reasoningEffort: input.reasoningEffort,
    authentication: {
      kind: 'api-key',
      secret: input.apiKey,
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

export async function getAgentServiceForPurpose(
  purpose: AgentServicePurpose,
): Promise<CurrentAgentServiceDto | null> {
  try {
    return await requestJson<CurrentAgentServiceDto>(`${AGENT_SERVICE_PURPOSE_ROOT}/${purpose}`)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
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

export async function configureAgentServiceForPurpose(
  purpose: AgentServicePurpose,
  input: ConfigureAgentServiceRequest,
): Promise<CurrentAgentServiceDto> {
  return requestJson<CurrentAgentServiceDto>(`${AGENT_SERVICE_PURPOSE_ROOT}/${purpose}`, {
    method: 'POST',
    body: input,
  })
}

export async function updateAgentServiceForPurpose(
  purpose: AgentServicePurpose,
  input: UpdateAgentServiceRequest,
): Promise<CurrentAgentServiceDto> {
  return requestJson<CurrentAgentServiceDto>(`${AGENT_SERVICE_PURPOSE_ROOT}/${purpose}`, {
    method: 'PUT',
    body: input,
  })
}

export async function verifyCurrentAgentServiceConnection(): Promise<ConnectionVerificationResultDto> {
  return requestJson<ConnectionVerificationResultDto>(`${AGENT_SERVICE_API_ROOT}/connection-verification`, {
    method: 'POST',
  })
}

export async function verifyAgentServiceConnectionForPurpose(
  purpose: AgentServicePurpose,
): Promise<ConnectionVerificationResultDto> {
  return requestJson<ConnectionVerificationResultDto>(
    `${AGENT_SERVICE_PURPOSE_ROOT}/${purpose}/connection-verification`,
    {
      method: 'POST',
    },
  )
}

export async function prepareCurrentAgentServiceCapabilities(): Promise<CapabilityProvisioningResultDto> {
  return requestJson<CapabilityProvisioningResultDto>(`${AGENT_SERVICE_API_ROOT}/capability-provisioning`, {
    method: 'POST',
  })
}

export async function prepareAgentServiceCapabilitiesForPurpose(
  purpose: AgentServicePurpose,
): Promise<CapabilityProvisioningResultDto> {
  return requestJson<CapabilityProvisioningResultDto>(
    `${AGENT_SERVICE_PURPOSE_ROOT}/${purpose}/capability-provisioning`,
    {
      method: 'POST',
    },
  )
}

export async function listAgentNodes(): Promise<AgentNodeRecord[]> {
  const status = await getCurrentAgentServiceStatus()
  const services = status.servicesByPurpose

  if (services) {
    const planningNode = services.planning
      ? mapCurrentServiceToAgentNode(services.planning)
      : {
          id: 'planning-agent-service',
          name: 'Cybernomads Agent LLM',
          type: 'bridge' as const,
          endpoint: '',
          status: 'missing' as const,
          capabilityStatus: 'missing' as const,
          notes: 'Planning and Review provider is not configured.',
          roleLabel: 'planning',
          badgeLabel: 'REQUIRED',
        }

    const executionNode = services.execution
      ? mapCurrentServiceToAgentNode(services.execution)
      : {
          id: 'execution-agent-service',
          name: 'OpenClaw Executor',
          type: 'openclaw' as const,
          endpoint: '',
          status: 'missing' as const,
          capabilityStatus: 'missing' as const,
          notes: 'Execution provider for confirmed single tasks is not configured.',
          roleLabel: 'execution',
          badgeLabel: 'REQUIRED',
        }

    return [planningNode, executionNode]
  }

  if (!status.currentService) {
    return [
      {
        id: 'planning-agent-service',
        name: 'Cybernomads Agent LLM',
        type: 'bridge',
        endpoint: '',
        status: 'missing',
        capabilityStatus: 'missing',
        notes: 'Planning and Review provider is not configured.',
        roleLabel: 'planning',
        badgeLabel: 'REQUIRED',
      },
      {
        id: 'execution-agent-service',
        name: 'OpenClaw Executor',
        type: 'openclaw',
        endpoint: '',
        status: 'missing',
        capabilityStatus: 'missing',
        notes: status.warning ?? 'Execution provider for confirmed single tasks is not configured.',
        roleLabel: 'execution',
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

export async function saveCybernomadsAgentLlmConfig(
  input: CybernomadsAgentLlmSetupFormInput,
): Promise<CurrentAgentServiceDto> {
  const request = mapCybernomadsAgentLlmSetupToRequest(input)
  const existing = await getAgentServiceForPurpose('planning')

  return existing
    ? updateAgentServiceForPurpose('planning', request)
    : configureAgentServiceForPurpose('planning', request)
}
