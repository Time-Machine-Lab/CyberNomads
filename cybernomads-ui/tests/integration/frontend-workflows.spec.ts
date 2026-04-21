import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/app/layout/AppShell.vue'
import AssetEditorPage from '@/pages/assets/editor/ui/AssetEditorPage.vue'
import OpenClawConfigPage from '@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'
import StrategyEditorPage from '@/pages/strategies/editor/ui/StrategyEditorPage.vue'
import TaskInterventionPage from '@/pages/workspaces/intervention/ui/TaskInterventionPage.vue'
import WorkspacesListPage from '@/pages/workspaces/list/ui/WorkspacesListPage.vue'
import WorkspaceExecutionPage from '@/pages/workspaces/detail/ui/WorkspaceExecutionPage.vue'
import { listAssets } from '@/entities/asset/api/asset-service'
import { listAgentNodes } from '@/entities/agent/api/agent-service'
import { getInterventionContext } from '@/entities/intervention-record/api/intervention-service'
import { listStrategies } from '@/entities/strategy/api/strategy-service'
import { getWorkspaceExecution, listWorkspaces } from '@/entities/workspace/api/workspace-service'
import { resetMockRuntime, setMockScenario } from '@/shared/mocks/runtime'

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
      { path: '/assets', component: { template: '<div>assets list</div>' } },
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

describe('frontend workflows', () => {
  beforeEach(() => {
    setMockScenario('baseline')
    resetMockRuntime()
  })

  it('shows first-entry setup guidance when prerequisites are missing', async () => {
    setMockScenario('setup')
    resetMockRuntime()

    const { wrapper } = await mountWithRouter('/workspaces', WorkspacesListPage, '/workspaces')

    expect(wrapper.text()).toContain('缺少可用 Agent')
    expect(wrapper.text()).toContain('缺少可用账号')
  })

  it('saves a new asset from the resource preparation flow', async () => {
    setMockScenario('editing')
    resetMockRuntime()

    const before = await listAssets()
    const { wrapper, router } = await mountWithRouter('/assets/new', AssetEditorPage, '/assets/new')

    await wrapper.get('input[required]').setValue('新建测试资产')
    await wrapper.get('textarea').setValue('# 新建测试资产\n\n这是一个测试资源。')
    const submitButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交资产'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/assets')

    const after = await listAssets()
    expect(after).toHaveLength(before.length + 1)
    expect(after.some((asset) => asset.name === '新建测试资产')).toBe(true)
  })

  it('renders workspace execution data for the execution workflow', async () => {
    setMockScenario('running')
    resetMockRuntime()

    const { wrapper } = await mountWithRouter(
      '/workspaces/workspace-nova-launch/execution',
      WorkspaceExecutionPage,
      '/workspaces/:workspaceId/execution',
    )

    expect(wrapper.text()).toContain('任务编排')
    expect(wrapper.text()).toContain('评论区线索提取')
    expect(wrapper.text()).toContain('运行日志')
  })

  it('keeps shell context and supports sidebar collapse on child pages', async () => {
    const router = createRouter({
      history: createMemoryHistory(),
      routes: [
        {
          path: '/',
          component: AppShell,
          children: [
            {
              path: 'agents/openclaw',
              component: { template: '<div>openclaw child</div>' },
              meta: { moduleTitle: 'Agent' },
            },
          ],
        },
      ],
    })

    await router.push('/agents/openclaw')
    await router.isReady()

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Agent / 节点控制')
    expect(wrapper.text()).toContain('系统设置')
    expect(wrapper.find('.app-shell').classes()).not.toContain('app-shell--collapsed')

    await wrapper.get('.app-shell__collapse').trigger('click')
    expect(wrapper.find('.app-shell').classes()).toContain('app-shell--collapsed')
  })

  it('deploys a strategy from the editor workflow', async () => {
    setMockScenario('editing')
    resetMockRuntime()

    const before = await listStrategies()
    const { wrapper, router } = await mountWithRouter('/strategies/new', StrategyEditorPage, '/strategies/new', [
      { path: '/strategies', component: { template: '<div>strategies list</div>' } },
    ])

    await wrapper.get('input[placeholder="策略名称"]').setValue('高保真部署策略')
    await wrapper.get('textarea[placeholder="摘要说明"]').setValue('用于验证部署动作是否完整保留。')
    await wrapper.get('button:last-of-type').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/strategies')

    const after = await listStrategies()
    expect(after).toHaveLength(before.length + 1)
    expect(after[0]?.name).toBe('高保真部署策略')
    expect(after[0]?.status).toBe('deployed')
  })

  it('saves OpenClaw config through the shared mock boundary', async () => {
    setMockScenario('setup')
    resetMockRuntime()

    const { wrapper, router } = await mountWithRouter('/agents/openclaw', OpenClawConfigPage, '/agents/openclaw', [
      { path: '/agents', component: { template: '<div>agents overview</div>' } },
    ])

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0]!.setValue('/srv/openclaw')
    await inputs[1]!.setValue('wss://edge.cybernomads.local:7443')
    await wrapper.get('button').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/agents')

    const nodes = await listAgentNodes()
    expect(nodes[0]?.config?.installPath).toBe('/srv/openclaw')
    expect(nodes[0]?.config?.gatewayUrl).toBe('wss://edge.cybernomads.local:7443')
    expect(nodes[0]?.config?.diagnosticsStatus).toBe('connected')
  })

  it('submits intervention commands and returns to the execution console', async () => {
    setMockScenario('running')
    resetMockRuntime()

    const [workspace] = await listWorkspaces()
    const execution = await getWorkspaceExecution(workspace!.id)
    const task = execution!.tasks.find((item) => item.status === 'running') ?? execution!.tasks[0]

    const { wrapper, router } = await mountWithRouter(
      `/workspaces/${workspace!.id}/tasks/${task!.id}/intervention`,
      TaskInterventionPage,
      '/workspaces/:workspaceId/tasks/:taskId/intervention',
      [{ path: '/workspaces/:workspaceId/execution', component: { template: '<div>execution</div>' } }],
    )

    await wrapper.get('textarea').setValue('# 干预\n\n请先汇总再继续发送。')
    const submitButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('Save & Resume'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${workspace!.id}/execution`)

    const context = await getInterventionContext(workspace!.id, task!.id)
    expect(context?.records[0]?.command).toContain('请先汇总再继续发送')
  })
})
