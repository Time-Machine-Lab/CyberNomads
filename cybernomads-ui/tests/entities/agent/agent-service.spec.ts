import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  configureCurrentAgentService,
  configureAgentServiceForPurpose,
  getCurrentAgentService,
  getCurrentAgentServiceStatus,
  prepareCurrentAgentServiceCapabilities,
  prepareAgentServiceCapabilitiesForPurpose,
  saveCybernomadsAgentLlmConfig,
  saveOpenClawConfig,
  updateAgentServiceForPurpose,
  updateCurrentAgentService,
  verifyAgentServiceConnectionForPurpose,
  verifyCurrentAgentServiceConnection,
} from '@/entities/agent/api/agent-service'
import { validateCybernomadsAgentLlmInput } from '@/entities/agent/model/llm-config'
import type { CurrentAgentServiceDto } from '@/entities/agent/model/types'

const now = '2026-04-23T08:00:00.000Z'

function createCurrentService(overrides: Partial<CurrentAgentServiceDto> = {}): CurrentAgentServiceDto {
  return {
    agentServiceId: 'agent-service-openclaw',
    providerCode: 'openclaw',
    endpointUrl: 'http://localhost:5111',
    authenticationKind: 'token',
    hasCredential: true,
    connectionStatus: 'pending_verification',
    connectionStatusReason: null,
    capabilityStatus: 'not_ready',
    capabilityStatusReason: null,
    isActive: true,
    isUsable: false,
    lastVerifiedAt: null,
    lastConnectedAt: null,
    capabilityPreparedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

describe('agent service API integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps missing current service status to a recoverable not_configured snapshot', async () => {
    vi.stubGlobal('fetch', vi.fn().mockImplementation(() => Promise.resolve(createJsonResponse({ message: 'not found' }, 404))))

    await expect(getCurrentAgentService()).resolves.toBeNull()
    await expect(getCurrentAgentServiceStatus()).resolves.toMatchObject({
      hasCurrentService: false,
      currentService: null,
      connectionStatus: 'not_configured',
      capabilityStatus: 'not_ready',
      isUsable: false,
    })
  })

  it('submits contract-only create and update request bodies', async () => {
    const fetchMock = vi.fn().mockImplementation(() => Promise.resolve(createJsonResponse(createCurrentService(), 201)))
    vi.stubGlobal('fetch', fetchMock)

    await configureCurrentAgentService({
      providerCode: 'openclaw',
      endpointUrl: 'http://localhost:5111',
      authentication: {
        kind: 'token',
        secret: 'secret-create',
      },
    })
    await updateCurrentAgentService({
      providerCode: 'openclaw',
      endpointUrl: 'http://localhost:5222',
      authentication: {
        kind: 'token',
        secret: 'secret-update',
      },
    })

    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const updateInit = fetchMock.mock.calls[1]?.[1] as RequestInit

    expect(createInit.method).toBe('POST')
    expect(JSON.parse(String(createInit.body))).toEqual({
      providerCode: 'openclaw',
      endpointUrl: 'http://localhost:5111',
      authentication: {
        kind: 'token',
        secret: 'secret-create',
      },
    })
    expect(updateInit.method).toBe('PUT')
    expect(JSON.parse(String(updateInit.body))).toEqual({
      providerCode: 'openclaw',
      endpointUrl: 'http://localhost:5222',
      authentication: {
        kind: 'token',
        secret: 'secret-update',
      },
    })
  })

  it('submits Cybernomads Agent LLM purpose-scoped request bodies', async () => {
    const fetchMock = vi.fn().mockImplementation(() =>
      Promise.resolve(
        createJsonResponse(
          createCurrentService({
            providerCode: 'cybernomads-agent',
            purpose: 'planning',
            model: 'gpt-5.2',
            reasoningEffort: 'high',
          }),
          201,
        ),
      ),
    )
    vi.stubGlobal('fetch', fetchMock)

    await configureAgentServiceForPurpose('planning', {
      providerCode: 'cybernomads-agent',
      purpose: 'planning',
      endpointUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.2',
      reasoningEffort: 'high',
      authentication: {
        kind: 'api-key',
        secret: 'secret-create',
      },
    })
    await updateAgentServiceForPurpose('planning', {
      providerCode: 'cybernomads-agent',
      purpose: 'planning',
      endpointUrl: 'https://gateway.example/v1',
      model: 'gpt-5.3',
      reasoningEffort: 'medium',
      authentication: {
        kind: 'api-key',
        secret: 'secret-update',
      },
    })

    const createUrl = fetchMock.mock.calls[0]?.[0] as URL
    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const updateUrl = fetchMock.mock.calls[1]?.[0] as URL
    const updateInit = fetchMock.mock.calls[1]?.[1] as RequestInit

    expect(createUrl.pathname).toBe('/api/agent-services/planning')
    expect(createInit.method).toBe('POST')
    expect(JSON.parse(String(createInit.body))).toEqual({
      providerCode: 'cybernomads-agent',
      purpose: 'planning',
      endpointUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.2',
      reasoningEffort: 'high',
      authentication: {
        kind: 'api-key',
        secret: 'secret-create',
      },
    })
    expect(updateUrl.pathname).toBe('/api/agent-services/planning')
    expect(updateInit.method).toBe('PUT')
    expect(String(updateInit.body)).toContain('secret-update')
    expect(String(updateInit.body)).not.toContain('********')
  })

  it('chooses create or update for OpenClaw setup without placeholder secrets', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ message: 'not found' }, 404))
      .mockResolvedValueOnce(createJsonResponse(createCurrentService(), 201))
      .mockResolvedValueOnce(createJsonResponse(createCurrentService({ connectionStatus: 'connected', isUsable: true })))
      .mockResolvedValueOnce(createJsonResponse(createCurrentService({ endpointUrl: 'http://localhost:5333' })))
    vi.stubGlobal('fetch', fetchMock)

    await saveOpenClawConfig({
      endpointUrl: 'http://localhost:5111',
      authenticationKind: 'token',
      secret: 'secret-create',
    })
    await saveOpenClawConfig({
      endpointUrl: 'http://localhost:5333',
      authenticationKind: 'token',
      secret: 'secret-update',
    })

    const createInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    const updateInit = fetchMock.mock.calls[3]?.[1] as RequestInit

    expect(createInit.method).toBe('POST')
    expect(String(createInit.body)).toContain('secret-create')
    expect(String(createInit.body)).not.toContain('********')
    expect(updateInit.method).toBe('PUT')
    expect(String(updateInit.body)).toContain('secret-update')
    expect(String(updateInit.body)).not.toContain('local-development-token')
  })

  it('chooses create or update for Cybernomads Agent LLM setup without placeholder API keys', async () => {
    const planningService = createCurrentService({
      agentServiceId: 'agent-service-planning',
      providerCode: 'cybernomads-agent',
      purpose: 'planning',
      endpointUrl: 'https://api.openai.com/v1',
      authenticationKind: 'api-key',
      model: 'gpt-5.2',
      reasoningEffort: 'medium',
    })
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createJsonResponse({ message: 'not found' }, 404))
      .mockResolvedValueOnce(createJsonResponse(planningService, 201))
      .mockResolvedValueOnce(createJsonResponse(planningService))
      .mockResolvedValueOnce(createJsonResponse({ ...planningService, model: 'gpt-5.3' }))
    vi.stubGlobal('fetch', fetchMock)

    await saveCybernomadsAgentLlmConfig({
      endpointUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.2',
      reasoningEffort: 'medium',
      apiKey: 'secret-create',
    })
    await saveCybernomadsAgentLlmConfig({
      endpointUrl: 'https://api.openai.com/v1',
      model: 'gpt-5.3',
      reasoningEffort: 'high',
      apiKey: 'secret-update',
    })

    const createInit = fetchMock.mock.calls[1]?.[1] as RequestInit
    const updateInit = fetchMock.mock.calls[3]?.[1] as RequestInit

    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe('/api/agent-services/planning')
    expect(createInit.method).toBe('POST')
    expect(String(createInit.body)).toContain('secret-create')
    expect(String(createInit.body)).not.toContain('********')
    expect((fetchMock.mock.calls[3]?.[0] as URL).pathname).toBe('/api/agent-services/planning')
    expect(updateInit.method).toBe('PUT')
    expect(String(updateInit.body)).toContain('secret-update')
    expect(String(updateInit.body)).not.toContain('sk-********')
  })

  it('validates Cybernomads Agent LLM form requirements and credential replacement intent', () => {
    expect(
      validateCybernomadsAgentLlmInput(
        {
          endpointUrl: 'https://api.openai.com/v1',
          model: 'gpt-5.2',
          reasoningEffort: 'medium',
          apiKey: '',
        },
        { hasExistingCredential: false, replaceCredential: true },
      ),
    ).toContain('首次配置必须输入 API Key')

    expect(
      validateCybernomadsAgentLlmInput(
        {
          endpointUrl: 'https://api.openai.com/v1',
          model: 'gpt-5.2',
          reasoningEffort: 'medium',
          apiKey: '',
        },
        { hasExistingCredential: true, replaceCredential: false },
      ),
    ).toContain('替换 API Key')

    expect(
      validateCybernomadsAgentLlmInput(
        {
          endpointUrl: 'https://api.openai.com/v1',
          model: 'gpt-5.2',
          reasoningEffort: 'medium',
          apiKey: 'secret-update',
        },
        { hasExistingCredential: true, replaceCredential: true },
      ),
    ).toBe('')
  })

  it('calls verify and provision endpoints explicitly', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          agentServiceId: 'agent-service-openclaw',
          connectionStatus: 'connected',
          reason: null,
          isUsable: true,
          verifiedAt: now,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          agentServiceId: 'agent-service-openclaw',
          capabilityStatus: 'ready',
          reason: null,
          connectionStatus: 'connected',
          isUsable: true,
          preparedAt: now,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          agentServiceId: 'agent-service-planning',
          connectionStatus: 'connected',
          reason: null,
          isUsable: true,
          verifiedAt: now,
        }),
      )
      .mockResolvedValueOnce(
        createJsonResponse({
          agentServiceId: 'agent-service-planning',
          capabilityStatus: 'ready',
          reason: null,
          connectionStatus: 'connected',
          isUsable: true,
          preparedAt: now,
        }),
      )
    vi.stubGlobal('fetch', fetchMock)

    await verifyCurrentAgentServiceConnection()
    await prepareCurrentAgentServiceCapabilities()
    await verifyAgentServiceConnectionForPurpose('planning')
    await prepareAgentServiceCapabilitiesForPurpose('planning')

    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe('/api/agent-services/current/connection-verification')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe('/api/agent-services/current/capability-provisioning')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect((fetchMock.mock.calls[2]?.[0] as URL).pathname).toBe('/api/agent-services/planning/connection-verification')
    expect(fetchMock.mock.calls[2]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect((fetchMock.mock.calls[3]?.[0] as URL).pathname).toBe('/api/agent-services/planning/capability-provisioning')
    expect(fetchMock.mock.calls[3]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
  })
})
