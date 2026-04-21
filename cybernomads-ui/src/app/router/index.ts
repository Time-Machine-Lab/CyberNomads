import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/app/layout/AppShell.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: '',
          redirect: '/workspaces',
        },
        {
          path: 'workspaces',
          name: 'workspaces-list',
          component: () => import('@/pages/workspaces/list/ui/WorkspacesListPage.vue'),
          meta: { moduleTitle: '工作区', shellNavKey: 'workspaces', shellSectionTitle: '团队编排' },
        },
        {
          path: 'workspaces/new',
          name: 'workspaces-create',
          component: () => import('@/pages/workspaces/create/ui/WorkspaceCreatePage.vue'),
          meta: { moduleTitle: '工作区', shellNavKey: 'workspaces', shellSectionTitle: '创建团队' },
        },
        {
          path: 'workspaces/:workspaceId',
          redirect: (to) => `/workspaces/${to.params.workspaceId}/execution`,
        },
        {
          path: 'workspaces/:workspaceId/execution',
          name: 'workspace-execution',
          component: () => import('@/pages/workspaces/detail/ui/WorkspaceExecutionPage.vue'),
          meta: { moduleTitle: '工作区', shellNavKey: 'workspaces', shellSectionTitle: '执行链路' },
        },
        {
          path: 'workspaces/:workspaceId/tasks/:taskId/intervention',
          name: 'workspace-intervention',
          component: () => import('@/pages/workspaces/intervention/ui/TaskInterventionPage.vue'),
          meta: { moduleTitle: '工作区', shellNavKey: 'workspaces', shellSectionTitle: '人工介入' },
        },
        {
          path: 'assets',
          name: 'assets-list',
          component: () => import('@/pages/assets/list/ui/AssetsListPage.vue'),
          meta: { moduleTitle: '资产', shellNavKey: 'assets', shellSectionTitle: '资产库' },
        },
        {
          path: 'assets/new',
          name: 'assets-create',
          component: () => import('@/pages/assets/editor/ui/AssetEditorPage.vue'),
          meta: { moduleTitle: '资产', shellNavKey: 'assets', shellSectionTitle: '资产编辑' },
        },
        {
          path: 'assets/:assetId/edit',
          name: 'assets-edit',
          component: () => import('@/pages/assets/editor/ui/AssetEditorPage.vue'),
          meta: { moduleTitle: '资产', shellNavKey: 'assets', shellSectionTitle: '资产编辑' },
        },
        {
          path: 'strategies',
          name: 'strategies-list',
          component: () => import('@/pages/strategies/list/ui/StrategiesListPage.vue'),
          meta: { moduleTitle: '策略', shellNavKey: 'strategies', shellSectionTitle: '策略库' },
        },
        {
          path: 'strategies/new',
          name: 'strategies-create',
          component: () => import('@/pages/strategies/editor/ui/StrategyEditorPage.vue'),
          meta: { moduleTitle: '策略', shellNavKey: 'strategies', shellSectionTitle: '策略编辑' },
        },
        {
          path: 'strategies/:strategyId/edit',
          name: 'strategies-edit',
          component: () => import('@/pages/strategies/editor/ui/StrategyEditorPage.vue'),
          meta: { moduleTitle: '策略', shellNavKey: 'strategies', shellSectionTitle: '策略编辑' },
        },
        {
          path: 'accounts',
          name: 'accounts-list',
          component: () => import('@/pages/accounts/list/ui/AccountsListPage.vue'),
          meta: { moduleTitle: '账号', shellNavKey: 'accounts', shellSectionTitle: '账号池' },
        },
        {
          path: 'accounts/:accountId',
          name: 'accounts-detail',
          component: () => import('@/pages/accounts/detail/ui/AccountDetailPage.vue'),
          meta: { moduleTitle: '账号', shellNavKey: 'accounts', shellSectionTitle: '账号详情' },
        },
        {
          path: 'agents',
          name: 'agents-overview',
          component: () => import('@/pages/agents/overview/ui/AgentsOverviewPage.vue'),
          meta: { moduleTitle: 'Agent', shellNavKey: 'agents', shellSectionTitle: '节点总览' },
        },
        {
          path: 'agents/openclaw',
          name: 'agents-openclaw',
          component: () => import('@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'),
          meta: { moduleTitle: 'Agent', shellNavKey: 'agents', shellSectionTitle: '系统设置' },
        },
      ],
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
