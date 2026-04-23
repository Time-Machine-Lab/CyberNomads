import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { CurrentAgentServiceDto } from '@/entities/agent/model/types'
import ConsolePage from '@/pages/console/ui/ConsolePage.vue'
import OpenClawConfigPage from '@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'

const now = '2026-04-23T08:00:00.000Z'

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function createService(overrides: Partial<CurrentAgentServiceDto> = {}): CurrentAgentServiceDto {
  return {
    agentServiceId: 'agent-service-openclaw',
    providerCode: 'openclaw',
    endpointUrl: 'http://localhost:5111',
    authenticationKind: 'token',
    hasCredential: true,
    connectionStatus: 'connected',
    connectionStatusReason: null,
    capabilityStatus: 'not_ready',
    capabilityStatusReason: null,
    isActive: true,
    isUsable: true,
    lastVerifiedAt: now,
    lastConnectedAt: now,
    capabilityPreparedAt: null,
    createdAt: now,
    updatedAt: now,
    ...overrides,
  }
}

async function mountWithRouter(path: string, component: object, routePath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: routePath, component, meta: { backTo: '/console', backLabel: '返回控制台' } },
      { path: '/console', component: ConsolePage },
      { path: '/console/openclaw', component: OpenClawConfigPage, meta: { backTo: '/console', backLabel: '返回控制台' } },
      { path: '/accounts', component: { template: '<div>accounts</div>' } },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()

  return { wrapper, router }
}

describe('agent service configuration pages', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders Console unconfigured state from current status endpoint', async () => {
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          hasCurrentService: false,
          currentService: null,
          connectionStatus: 'not_configured',
          capabilityStatus: 'not_ready',
          isUsable: false,
          warning: null,
        }),
      ),
    )

    const { wrapper } = await mountWithRouter('/console', ConsolePage, '/console')

    expect(wrapper.text()).toContain('尚未接入 Agent 服务')
    expect(wrapper.text()).toContain('配置 OpenClaw')
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('/api/agent-services/current/status') }),
      expect.anything(),
    )
  })

  it('renders Console connected-but-not-ready state separately from capability readiness', async () => {
    const service = createService({ capabilityStatus: 'not_ready' })
    vi.stubGlobal(
      'fetch',
      vi.fn().mockResolvedValue(
        jsonResponse({
          hasCurrentService: true,
          currentService: service,
          connectionStatus: 'connected',
          capabilityStatus: 'not_ready',
          isUsable: true,
          warning: null,
        }),
      ),
    )

    const { wrapper } = await mountWithRouter('/console', ConsolePage, '/console')

    expect(wrapper.text()).toContain('连接可用')
    expect(wrapper.text()).toContain('能力未准备')
    expect(wrapper.text()).toContain('准备能力')
  })

  it('creates OpenClaw service and stays in focused setup flow', async () => {
    const createdService = createService({
      connectionStatus: 'pending_verification',
      capabilityStatus: 'not_ready',
      isUsable: false,
      lastVerifiedAt: null,
    })
    const fetchMock = vi.fn().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'

      if (url.pathname === '/api/agent-services/current/status') {
        return jsonResponse({
          hasCurrentService: false,
          currentService: null,
          connectionStatus: 'not_configured',
          capabilityStatus: 'not_ready',
          isUsable: false,
          warning: null,
        })
      }

      if (url.pathname === '/api/agent-services/current' && method === 'GET') {
        return jsonResponse({ message: 'not found' }, 404)
      }

      if (url.pathname === '/api/agent-services/current' && method === 'POST') {
        return jsonResponse(createdService, 201)
      }

      return jsonResponse({ message: 'unhandled' }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper, router } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw')

    await wrapper.find('input[placeholder="http://localhost:5111"]').setValue('http://localhost:5111')
    await wrapper.find('input[placeholder="输入新的认证密钥"]').setValue('secret-create')
    await wrapper.findAll('button').find((button) => button.text().includes('创建当前服务'))!.trigger('click')
    await flushPromises()

    const createCall = fetchMock.mock.calls.find((call) => {
      const url = call[0] as URL
      const init = call[1] as RequestInit
      return url.pathname === '/api/agent-services/current' && init.method === 'POST'
    })
    const createInit = createCall?.[1] as RequestInit

    expect(router.currentRoute.value.fullPath).toBe('/console/openclaw')
    expect(JSON.parse(String(createInit.body))).toEqual({
      providerCode: 'openclaw',
      endpointUrl: 'http://localhost:5111',
      authentication: {
        kind: 'token',
        secret: 'secret-create',
      },
    })
    expect(wrapper.text()).toContain('等待显式连接测试')
  })

  it('handles create conflict by refreshing into update mode', async () => {
    const service = createService({ connectionStatus: 'pending_verification', isUsable: false })
    const fetchMock = vi.fn().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'

      if (url.pathname === '/api/agent-services/current/status') {
        return jsonResponse({
          hasCurrentService: false,
          currentService: null,
          connectionStatus: 'not_configured',
          capabilityStatus: 'not_ready',
          isUsable: false,
          warning: null,
        })
      }

      if (url.pathname === '/api/agent-services/current' && method === 'GET') {
        return jsonResponse({ message: 'not found' }, 404)
      }

      if (url.pathname === '/api/agent-services/current' && method === 'POST') {
        return jsonResponse({ message: 'exists' }, 409)
      }

      return jsonResponse(service)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw')

    await wrapper.find('input[placeholder="http://localhost:5111"]').setValue('http://localhost:5111')
    await wrapper.find('input[placeholder="输入新的认证密钥"]').setValue('secret-create')
    await wrapper.findAll('button').find((button) => button.text().includes('创建当前服务'))!.trigger('click')
    await flushPromises()

    expect(wrapper.text()).toContain('409 冲突')
  })

  it('runs the contract-stub setup smoke flow through save, verify, provision, and Console refresh', async () => {
    let service: CurrentAgentServiceDto | null = null
    const fetchMock = vi.fn().mockImplementation(async (input, init) => {
      const url = new URL(String(input))
      const method = init?.method ?? 'GET'

      if (url.pathname === '/api/agent-services/current/status') {
        return jsonResponse({
          hasCurrentService: Boolean(service),
          currentService: service,
          connectionStatus: service?.connectionStatus ?? 'not_configured',
          capabilityStatus: service?.capabilityStatus ?? 'not_ready',
          isUsable: service?.isUsable ?? false,
          warning: null,
        })
      }

      if (url.pathname === '/api/agent-services/current' && method === 'GET') {
        return service ? jsonResponse(service) : jsonResponse({ message: 'not found' }, 404)
      }

      if (url.pathname === '/api/agent-services/current' && method === 'POST') {
        service = createService({
          connectionStatus: 'pending_verification',
          capabilityStatus: 'not_ready',
          isUsable: false,
          lastVerifiedAt: null,
          lastConnectedAt: null,
        })
        return jsonResponse(service, 201)
      }

      if (url.pathname === '/api/agent-services/current/connection-verification') {
        service = createService({
          connectionStatus: 'connected',
          capabilityStatus: 'not_ready',
          isUsable: true,
        })
        return jsonResponse({
          agentServiceId: service.agentServiceId,
          connectionStatus: 'connected',
          reason: null,
          isUsable: true,
          verifiedAt: now,
        })
      }

      if (url.pathname === '/api/agent-services/current/capability-provisioning') {
        service = createService({
          connectionStatus: 'connected',
          capabilityStatus: 'ready',
          isUsable: true,
          capabilityPreparedAt: now,
        })
        return jsonResponse({
          agentServiceId: service.agentServiceId,
          capabilityStatus: 'ready',
          reason: null,
          connectionStatus: 'connected',
          isUsable: true,
          preparedAt: now,
        })
      }

      return jsonResponse({ message: 'unhandled' }, 404)
    })
    vi.stubGlobal('fetch', fetchMock)

    const { wrapper } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw')

    await wrapper.find('input[placeholder="http://localhost:5111"]').setValue('http://localhost:5111')
    await wrapper.find('input[placeholder="输入新的认证密钥"]').setValue('secret-create')
    await wrapper.findAll('button').find((button) => button.text().includes('创建当前服务'))!.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().includes('测试连接'))!.trigger('click')
    await flushPromises()

    await wrapper.findAll('button').find((button) => button.text().includes('准备能力'))!.trigger('click')
    await flushPromises()

    const { wrapper: consoleWrapper } = await mountWithRouter('/console', ConsolePage, '/console')

    expect(consoleWrapper.text()).toContain('已就绪')
    expect(consoleWrapper.text()).toContain('能力已准备')
  })
})
