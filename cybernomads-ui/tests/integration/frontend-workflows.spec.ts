import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import AppShell from '@/app/layout/AppShell.vue'
import AssetEditorPage from '@/pages/assets/editor/ui/AssetEditorPage.vue'
import OpenClawConfigPage from '@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'
import StrategyEditorPage from '@/pages/strategies/editor/ui/StrategyEditorPage.vue'
import StrategiesListPage from '@/pages/strategies/list/ui/StrategiesListPage.vue'
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
  const routes = [
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
  ].filter((candidate, index, collection) => {
    return collection.findIndex((item) => item.path === candidate.path) === index
  })

  const router = createRouter({
    history: createMemoryHistory(),
    routes,
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

  it('renders strategy summaries on the list page', async () => {
    setMockScenario('editing')
    resetMockRuntime()

    const { wrapper } = await mountWithRouter('/strategies', StrategiesListPage, '/strategies')

    expect(wrapper.get('[data-testid="strategy-list"]').text()).toContain('高频评论截流')
    expect(wrapper.text()).toContain('最近更新')
    expect(wrapper.text()).not.toContain('成功率')
  })

  it('renders workspace execution data for the execution workflow', async () => {
    setMockScenario('running')
    resetMockRuntime()

    const { wrapper } = await mountWithRouter(
      '/workspaces/workspace-nova-launch/runtime',
      WorkspaceExecutionPage,
      '/workspaces/:workspaceId/runtime',
    )

    expect(wrapper.text()).toContain('工作环境')
    expect(wrapper.text()).toContain('评论区线索提取')
    expect(wrapper.text()).toContain('实时执行日志')
    expect(wrapper.text()).toContain('任务干预')
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
              path: 'console',
              component: { template: '<div>console home</div>' },
            },
            {
              path: 'assets',
              component: { template: '<div>assets home</div>' },
            },
            {
              path: 'strategies',
              component: { template: '<div>strategies home</div>' },
            },
            {
              path: 'accounts',
              component: { template: '<div>accounts home</div>' },
            },
            {
              path: 'workspaces',
              component: { template: '<div>workspaces home</div>' },
            },
            {
              path: 'workspaces/new',
              component: { template: '<div>workspace create</div>' },
            },
            {
              path: 'console/openclaw',
              component: { template: '<div>openclaw child</div>' },
              meta: {
                moduleTitle: 'Agent',
                shellSectionTitle: '节点控制',
                shellNavKey: 'console',
              },
            },
          ],
        },
      ],
    })

    await router.push('/console/openclaw')
    await router.isReady()

    const wrapper = mount(AppShell, {
      global: {
        plugins: [router],
      },
    })

    await flushPromises()

    expect(wrapper.text()).toContain('Agent / CyberNomads')
    expect(wrapper.text()).toContain('节点控制')
    expect(wrapper.find('.app-shell').classes()).not.toContain('app-shell--collapsed')

    await wrapper.get('.app-shell__collapse').trigger('click')
    expect(wrapper.find('.app-shell').classes()).toContain('app-shell--collapsed')
  })

  it('saves a strategy from the editor workflow', async () => {
    setMockScenario('editing')
    resetMockRuntime()

    const before = await listStrategies()
    const { wrapper, router } = await mountWithRouter('/strategies/new', StrategyEditorPage, '/strategies/new', [
      { path: '/strategies', component: { template: '<div>strategies list</div>' } },
    ])

    await wrapper.get('[data-testid="strategy-editor-name"]').setValue('高保真保存策略')
    await wrapper.get('[data-testid="strategy-editor-summary"]').setValue('用于验证保存动作是否保留真实字段。')
    await wrapper.get('[data-testid="strategy-editor-tags"]').setValue('保存测试, 编辑器')
    await wrapper.get('[data-testid="strategy-editor-markdown"]').setValue(
      '# 高保真保存策略\n\n占位符：{{string:title="默认标题"}}\n',
    )
    await wrapper.get('[data-testid="strategy-editor-save"]').trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath.startsWith('/strategies')).toBe(true)

    const after = await listStrategies()
    expect(after).toHaveLength(before.length + 1)
    expect(after[0]?.name).toBe('高保真保存策略')
    expect(after[0]?.tags).toContain('保存测试')
  })

  it('saves OpenClaw config through the shared mock boundary', async () => {
    setMockScenario('setup')
    resetMockRuntime()

    const { wrapper, router } = await mountWithRouter('/console/openclaw', OpenClawConfigPage, '/console/openclaw', [
      { path: '/console', component: { template: '<div>console overview</div>' } },
    ])

    const inputs = wrapper.findAll('input[type="text"]')
    await inputs[0]!.setValue('/srv/openclaw')
    await inputs[1]!.setValue('wss://edge.cybernomads.local:7443')
    const saveButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('保存配置'))

    expect(saveButton).toBeTruthy()
    await saveButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe('/console')

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
      [{ path: '/workspaces/:workspaceId/runtime', component: { template: '<div>runtime</div>' } }],
    )

    await wrapper.get('textarea').setValue('# 干预\n\n请先汇总再继续发送。')
    const submitButton = wrapper
      .findAll('button')
      .find((button) => button.text().includes('保存并恢复执行'))

    expect(submitButton).toBeTruthy()
    await submitButton!.trigger('click')
    await flushPromises()

    expect(router.currentRoute.value.fullPath).toBe(`/workspaces/${workspace!.id}/runtime`)

    const context = await getInterventionContext(workspace!.id, task!.id)
    expect(context?.records[0]?.command).toContain('请先汇总再继续发送')
  })
})
