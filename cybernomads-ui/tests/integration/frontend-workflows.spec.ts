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
  strategyDetail,
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
      { path: '/workspaces/:workspaceId/edit', component: { template: '<div>workspace edit</div>' } },
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
  let currentTrafficWork = { ...trafficWorkDetail }

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

    if (path === `/strategies/${strategySummary.strategyId}`) {
      return jsonResponse(strategyDetail)
    }

    if (path === '/traffic-works') {
      return jsonResponse(
        method === 'POST'
          ? currentTrafficWork
          : {
              items: [
                {
                  ...trafficWorkSummary,
                  displayName: currentTrafficWork.displayName,
                  product: currentTrafficWork.product,
                  strategy: currentTrafficWork.strategy,
                  objectBindingCount: currentTrafficWork.objectBindings.length,
                  lifecycleStatus: currentTrafficWork.lifecycleStatus,
                  contextPreparationStatus: currentTrafficWork.contextPreparationStatus,
                  updatedAt: currentTrafficWork.updatedAt,
                },
              ],
            },
        method === 'POST' ? 201 : 200,
      )
    }

    if (path === `/traffic-works/${trafficWorkDetail.trafficWorkId}`) {
      if (method === 'PUT') {
        const body = JSON.parse(String(init?.body ?? '{}'))
        currentTrafficWork = {
          ...currentTrafficWork,
          displayName: body.displayName,
          product: {
            productId: body.productId,
            name: productSummary.name,
          },
          strategy: {
            strategyId: body.strategyId,
            name: strategySummary.name,
          },
          objectBindings: body.objectBindings ?? [],
          contextPreparationStatus: 'pending',
        }
        return jsonResponse(currentTrafficWork)
      }

      return jsonResponse(currentTrafficWork)
    }

    if (path === `/traffic-works/${trafficWorkDetail.trafficWorkId}/start` && method === 'POST') {
      currentTrafficWork = {
        ...currentTrafficWork,
        lifecycleStatus: 'running',
        lifecycleStatusReason: 'Traffic work started.',
      }
      return jsonResponse(currentTrafficWork)
    }

    if (path === `/traffic-works/${trafficWorkDetail.trafficWorkId}/pause` && method === 'POST') {
      currentTrafficWork = {
        ...currentTrafficWork,
        lifecycleStatus: 'ready',
        lifecycleStatusReason: 'Traffic work paused.',
      }
      return jsonResponse(currentTrafficWork)
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
    expect(wrapper.text()).toContain('TrafficWork')
  })

  it('opens runtime from the card body and edit mode from the top-right action', async () => {
    const { wrapper, router } = await mountWithRouter('/workspaces', WorkspacesListPage, '/workspaces')

    await wrapper.get('.workspace-card__body').trigger('click')
    await flushPromises()
    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`)

    await router.push('/workspaces')
    await flushPromises()

    const editButton = wrapper.get('button[aria-label="编辑工作区"]')
    await editButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/edit`)
  })

  it('creates a workspace from product and strategy without requiring execution accounts', async () => {
    const { wrapper, router } = await mountWithRouter('/workspaces/new', WorkspaceCreatePage, '/workspaces/new')
    await flushPromises()

    expect(wrapper.text()).toContain('创建工作区')
    expect(wrapper.findAll('.account-card')).toHaveLength(0)
    expect(wrapper.findAll('.create-step--accounts')).toHaveLength(0)

    const submitButton = wrapper.get('.create-main__submit')
    expect(submitButton.attributes('disabled')).toBeUndefined()
    await submitButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/runtime?created=1`)

    const lastFetchCall = vi.mocked(fetch).mock.calls.at(-1)
    expect(lastFetchCall).toBeTruthy()
    expect(String(lastFetchCall?.[0])).toContain('/api/traffic-works')
    expect(lastFetchCall?.[1]).toMatchObject({ method: 'POST' })
    expect(JSON.parse(String(lastFetchCall?.[1]?.body ?? '{}'))).toMatchObject({
      displayName: 'Product · Growth Strategy',
      productId: productSummary.productId,
      strategyId: strategySummary.strategyId,
      objectBindings: [
        {
          objectType: '账号',
          objectKey: '账号A',
          resourceId: 'CyberNomads',
          resourceLabel: 'CyberNomads',
        },
        {
          objectType: '风控时间',
          objectKey: '冷却时长',
          resourceId: '5秒',
          resourceLabel: '5秒',
        },
      ],
    })
  })

  it('updates a workspace from the edit page using the Traffic Works update endpoint', async () => {
    const { wrapper, router } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/edit`,
      WorkspaceCreatePage,
      '/workspaces/:workspaceId/edit',
    )
    await flushPromises()

    expect(wrapper.text()).toContain('编辑工作区')

    const submitButton = wrapper.get('.create-main__submit')
    expect(submitButton.attributes('disabled')).toBeUndefined()
    await submitButton.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/workspaces')

    const lastFetchCall = vi.mocked(fetch).mock.calls.at(-1)
    expect(lastFetchCall).toBeTruthy()
    expect(String(lastFetchCall?.[0])).toContain(`/api/traffic-works/${trafficWorkDetail.trafficWorkId}`)
    expect(lastFetchCall?.[1]).toMatchObject({
      method: 'PUT',
    })
  })

  it('renders runtime work and task state from backend contracts without fake log panels', async () => {
    const { wrapper } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`,
      WorkspaceExecutionPage,
      '/workspaces/:workspaceId/runtime',
    )

    expect(wrapper.text()).toContain(taskSummary.name)
    expect(wrapper.text()).toContain('工作状态概览')
    expect(wrapper.text()).toContain('已准备')
    expect(wrapper.text()).not.toContain('CAPTCHA detected')
    expect(wrapper.text()).not.toContain('实时执行日志')
  })

  it('starts and pauses a traffic work from the runtime page using Traffic Works lifecycle endpoints', async () => {
    const { wrapper } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`,
      WorkspaceExecutionPage,
      '/workspaces/:workspaceId/runtime',
    )

    const buttons = wrapper.findAll('button')
    const startButton = buttons.find((button) => button.attributes('title') === '启动工作')

    expect(startButton).toBeTruthy()
    await startButton!.trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('/api/traffic-works/traffic-work-launch/start') }),
      expect.objectContaining({ method: 'POST' }),
    )

    const pauseButton = wrapper.findAll('button').find((button) => button.attributes('title') === '暂停工作')
    expect(pauseButton).toBeTruthy()
    await pauseButton!.trigger('click')
    await flushPromises()

    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('/api/traffic-works/traffic-work-launch/pause') }),
      expect.objectContaining({ method: 'POST' }),
    )
  })

  it('submits task output records from the task detail page', async () => {
    const { wrapper, router } = await mountWithRouter(
      `/workspaces/${trafficWorkDetail.trafficWorkId}/tasks/${taskSummary.taskId}/intervention`,
      TaskInterventionPage,
      '/workspaces/:workspaceId/tasks/:taskId/intervention',
      [{ path: '/workspaces/:workspaceId/runtime', component: { template: '<div>runtime</div>' } }],
    )

    await wrapper.get('textarea').setValue('operator note')
    const submitButton = wrapper.findAll('button').find((button) => button.text().includes('保存输出记录'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${trafficWorkDetail.trafficWorkId}/runtime`)
  })

  it('updates OpenClaw config through Agent Services API without leaving the focused flow', async () => {
    const { wrapper, router } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw', [
      { path: '/console', component: { template: '<div>console overview</div>' } },
    ])

    await wrapper.find('input[type="checkbox"]').setValue(true)
    await wrapper.find('input[placeholder="输入新的认证密钥"]').setValue('secret-update')

    const saveButton = wrapper.findAll('button').find((button) => button.text().includes('更新当前服务'))

    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/console/openclaw')
    expect(fetch).toHaveBeenCalledWith(
      expect.objectContaining({ pathname: expect.stringContaining('/api/agent-services/current') }),
      expect.objectContaining({ method: 'PUT' }),
    )
  })
})
