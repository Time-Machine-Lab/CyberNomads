import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  configureCurrentAgentService,
  getCurrentAgentService,
  getCurrentAgentServiceStatus,
  prepareCurrentAgentServiceCapabilities,
  saveOpenClawConfig,
  updateCurrentAgentService,
  verifyCurrentAgentServiceConnection,
} from '@/entities/agent/api/agent-service'
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
    vi.stubGlobal('fetch', fetchMock)

    await verifyCurrentAgentServiceConnection()
    await prepareCurrentAgentServiceCapabilities()

    expect((fetchMock.mock.calls[0]?.[0] as URL).pathname).toBe('/api/agent-services/current/connection-verification')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
    expect((fetchMock.mock.calls[1]?.[0] as URL).pathname).toBe('/api/agent-services/current/capability-provisioning')
    expect(fetchMock.mock.calls[1]?.[1]).toEqual(expect.objectContaining({ method: 'POST' }))
  })
})
