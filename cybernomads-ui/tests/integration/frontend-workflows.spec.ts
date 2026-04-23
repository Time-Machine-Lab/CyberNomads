import { flushPromises, mount } from '@vue/test-utils'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import OpenClawConfigPage from '@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'
import TaskInterventionPage from '@/pages/workspaces/intervention/ui/TaskInterventionPage.vue'
import WorkspaceCreatePage from '@/pages/workspaces/create/ui/WorkspaceCreatePage.vue'
import WorkspaceExecutionPage from '@/pages/workspaces/detail/ui/WorkspaceExecutionPage.vue'
import WorkspacesListPage from '@/pages/workspaces/list/ui/WorkspacesListPage.vue'
import {
  accountSummary,
  agentService,
  outputRecord,
  productDetail,
  productSummary,
  strategySummary,
  taskDetail,
  taskSummary,
  trafficWorkDetail,
  trafficWorkSummary,
} from '../fixtures/product-domain-fixtures'

async function mountWithRouter(
  path: string,
  component: object,
  routePath: string,
  extraRoutes: Array<{ path: string; component: object; meta?: Record<string, unknown> }> = [],
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: routePath, component },
      { path: '/console', component: { template: '<div>console overview</div>' } },
      { path: '/console/openclaw', component: { template: '<div>openclaw config route</div>' } },
      { path: '/assets', component: { template: '<div>assets list</div>' } },
      { path: '/strategies', component: { template: '<div>strategies list</div>' } },
      { path: '/accounts', component: { template: '<div>accounts list</div>' } },
      { path: '/workspaces', component: { template: '<div>workspaces list</div>' } },
      { path: '/workspaces/new', component: { template: '<div>workspace create</div>' } },
      { path: '/workspaces/:workspaceId/runtime', component: { template: '<div>runtime route</div>' } },
      {
        path: '/workspaces/:workspaceId/tasks/:taskId/intervention',
        component: { template: '<div>intervention route</div>' },
      },
      ...extraRoutes,
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

function jsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function installProductDomainFetchStub() {
  return vi.spyOn(globalThis, 'fetch').mockImplementation(async (input, init) => {
    const url = new URL(String(input))
    const path = url.pathname.replace(/^\/api/, '')
    const method = init?.method ?? 'GET'

    if (path === '/agent-services/current/status') {
      return jsonResponse({
        hasCurrentService: true,
        currentService: agentService,
        connectionStatus: 'connected',
        capabilityStatus: 'ready',
        isUsable: true,
        warning: null,
      })
    }

    if (path === '/agent-services/current') {
      return jsonResponse(agentService, method === 'POST' ? 201 : 200)
    }

    if (path === '/agent-services/current/connection-verification') {
      return jsonResponse({
        agentServiceId: agentService.agentServiceId,
        connectionStatus: 'connected',
        reason: null,
        isUsable: true,
        verifiedAt: agentService.updatedAt,
      })
    }

    if (path === '/agent-services/current/capability-provisioning') {
      return jsonResponse({
        agentServiceId: agentService.agentServiceId,
        capabilityStatus: 'ready',
        reason: null,
        connectionStatus: 'connected',
        isUsable: true,
        preparedAt: agentService.updatedAt,
      })
    }

    if (path === '/accounts') {
      return jsonResponse({ items: [accountSummary] })
    }

    if (path === '/products') {
      return jsonResponse(method === 'POST' ? productDetail : { items: [productSummary] }, method === 'POST' ? 201 : 200)
    }

    if (path === '/strategies') {
      return jsonResponse({ items: [strategySummary] })
    }

    if (path === '/traffic-works') {
      return jsonResponse(
        method === 'POST' ? trafficWorkDetail : { items: [trafficWorkSummary] },
        method === 'POST' ? 201 : 200,
      )
    }

    if (path === `/traffic-works/${trafficWorkDetail.trafficWorkId}`) {
      return jsonResponse(trafficWorkDetail)
    }

    if (path === '/tasks') {
      return jsonResponse({ items: [taskSummary] })
    }

    if (path === `/tasks/${taskSummary.taskId}`) {
      return jsonResponse(taskDetail)
    }

    if (path === `/tasks/${taskSummary.taskId}/outputs`) {
      if (method === 'POST') {
        return jsonResponse(
          {
            ...outputRecord,
            outputRecordId: 'output-created',
            description: 'operator note',
          },
          201,
        )
      }

      return jsonResponse({ items: [outputRecord] })
    }

    return jsonResponse({ message: `Unhandled test endpoint: ${method} ${path}` }, 404)
  })
}

describe('frontend product-domain workflows', () => {
  beforeEach(() => {
    installProductDomainFetchStub()
  })

  afterEach(() => {
    vi.restoreAllMocks()
  })

  it('renders traffic works from backend contract-shaped responses', async () => {
    const { wrapper } = await mountWithRouter('/workspaces', WorkspacesListPage, '/workspaces')

    expect(wrapper.text()).toContain(trafficWorkSummary.displayName)
    expect(wrapper.text()).toContain(productSummary.name)
    expect(wrapper.text()).toContain(strategySummary.name)
  })

  it('creates a TrafficWork from product, strategy, and consumable account bindings', async () => {
    const { wrapper, router } = await mountWithRouter('/workspaces/new', WorkspaceCreatePage, '/workspaces/new')

    const submitButton = wrapper.findAll('button').find((button) => !button.attributes('disabled'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`)
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('/api/traffic-works') }),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('renders runtime task state from the Tasks API without fake log records', async () => {
    const { wrapper } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`,
      WorkspaceExecutionPage,
      '/workspaces/:workspaceId/runtime',
    )

    expect(wrapper.text()).toContain(taskSummary.name)
    expect(wrapper.text()).not.toContain('CAPTCHA detected')
  })

  it('submits task output records from the intervention page', async () => {
    const { wrapper, router } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/tasks/${taskSummary.taskId}/intervention`,
      TaskInterventionPage,
      '/workspaces/:workspaceId/tasks/:taskId/intervention',
      [{ path: '/workspaces/:workspaceId/runtime', component: { template: '<div>runtime</div>' } }],
    )

    await wrapper.get('textarea').setValue('operator note')
    const submitButton = wrapper.findAll('button').find((button) => button.text().includes('提交输出记录'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`)
  })

  it('saves OpenClaw config through Agent Services API', async () => {
    const { wrapper, router } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw', [
      { path: '/console', component: { template: '<div>console overview</div>' } },
    ])

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('保存配置'))

    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/console')
  })
})
