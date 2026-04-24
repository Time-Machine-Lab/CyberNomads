import { createRouter, createWebHistory } from 'vue-router'

import AppShell from '@/app/layout/AppShell.vue'
import FocusedShell from '@/app/layout/FocusedShell.vue'
import RuntimeShell from '@/app/layout/RuntimeShell.vue'

export const router = createRouter({
  history: createWebHistory(import.meta.env.BASE_URL),
  routes: [
    {
      path: '/',
      redirect: '/console',
    },
    {
      path: '/',
      component: AppShell,
      children: [
        {
          path: 'console',
          name: 'console-overview',
          component: () => import('@/pages/console/ui/ConsolePage.vue'),
          meta: { moduleTitle: '控制台', shellNavKey: 'console', shellSectionTitle: '主控驱动' },
        },
        {
          path: 'assets',
          name: 'assets-list',
          component: () => import('@/pages/assets/list/ui/AssetsListPage.vue'),
          meta: { moduleTitle: '资产列表', shellNavKey: 'assets', shellSectionTitle: '引流资产' },
        },
        {
          path: 'strategies',
          name: 'strategies-list',
          component: () => import('@/pages/strategies/list/ui/StrategiesListPage.vue'),
          meta: { moduleTitle: '策略库', shellNavKey: 'strategies', shellSectionTitle: '策略矩阵' },
        },
        {
          path: 'accounts',
          name: 'accounts-list',
          component: () => import('@/pages/accounts/list/ui/AccountsListPage.vue'),
          meta: { moduleTitle: '账号池', shellNavKey: 'accounts', shellSectionTitle: '账号池管理' },
        },
        {
          path: 'workspaces',
          name: 'workspaces-list',
          component: () => import('@/pages/workspaces/list/ui/WorkspacesListPage.vue'),
          meta: { moduleTitle: '推广工作区', shellNavKey: 'workspaces', shellSectionTitle: '团队列表' },
        },
        {
          path: 'workspaces/:workspaceId',
          redirect: (to) => `/workspaces/${to.params.workspaceId}/runtime`,
        },
      ],
    },
    {
      path: '/',
      component: FocusedShell,
      children: [
        {
          path: 'console/openclaw',
          name: 'console-openclaw',
          component: () => import('@/pages/agents/openclaw/ui/OpenClawConfigPage.vue'),
          meta: {
            moduleTitle: '控制台',
            shellNavKey: 'console',
            shellSectionTitle: 'OpenClaw 配置',
            backTo: '/console',
            backLabel: '返回控制台',
          },
        },
        {
          path: 'assets/new',
          name: 'assets-create',
          component: () => import('@/pages/assets/editor/ui/AssetEditorPage.vue'),
          meta: {
            moduleTitle: '资产列表',
            shellNavKey: 'assets',
            shellSectionTitle: '资产编辑',
            backTo: '/assets',
            backLabel: '返回资产列表',
          },
        },
        {
          path: 'assets/:assetId/edit',
          name: 'assets-edit',
          component: () => import('@/pages/assets/editor/ui/AssetEditorPage.vue'),
          meta: {
            moduleTitle: '资产列表',
            shellNavKey: 'assets',
            shellSectionTitle: '资产编辑',
            backTo: '/assets',
            backLabel: '返回资产列表',
          },
        },
        {
          path: 'strategies/new',
          name: 'strategies-create',
          component: () => import('@/pages/strategies/editor/ui/StrategyEditorPage.vue'),
          meta: {
            moduleTitle: '策略库',
            shellNavKey: 'strategies',
            shellSectionTitle: '策略编辑',
            backTo: '/strategies',
            backLabel: '返回策略库',
          },
        },
        {
          path: 'strategies/:strategyId/edit',
          name: 'strategies-edit',
          component: () => import('@/pages/strategies/editor/ui/StrategyEditorPage.vue'),
          meta: {
            moduleTitle: '策略库',
            shellNavKey: 'strategies',
            shellSectionTitle: '策略编辑',
            backTo: '/strategies',
            backLabel: '返回策略库',
          },
        },
        {
          path: 'accounts/new',
          name: 'accounts-create',
          component: () => import('@/pages/accounts/create/ui/AccountCreatePage.vue'),
          meta: {
            moduleTitle: '账号池',
            shellNavKey: 'accounts',
            shellSectionTitle: '新增账号',
            backTo: '/accounts',
            backLabel: '返回账号池',
          },
        },
        {
          path: 'accounts/:accountId',
          name: 'accounts-detail',
          component: () => import('@/pages/accounts/detail/ui/AccountDetailPage.vue'),
          meta: {
            moduleTitle: '账号池',
            shellNavKey: 'accounts',
            shellSectionTitle: '账号配置',
            backTo: '/accounts',
            backLabel: '返回账号池',
          },
        },
        {
          path: 'workspaces/new',
          name: 'workspaces-create',
          component: () => import('@/pages/workspaces/create/ui/WorkspaceCreatePage.vue'),
          meta: {
            moduleTitle: '推广工作区',
            shellNavKey: 'workspaces',
            shellSectionTitle: '创建工作区',
            backTo: '/workspaces',
            backLabel: '返回工作区列表',
          },
        },
        {
          path: 'workspaces/:workspaceId/edit',
          name: 'workspaces-edit',
          component: () => import('@/pages/workspaces/create/ui/WorkspaceCreatePage.vue'),
          meta: {
            moduleTitle: '推广工作区',
            shellNavKey: 'workspaces',
            shellSectionTitle: '编辑工作区',
            backTo: '/workspaces',
            backLabel: '返回工作区列表',
          },
        },
      ],
    },
    {
      path: '/',
      component: RuntimeShell,
      children: [
        {
          path: 'workspaces/:workspaceId/runtime',
          name: 'workspace-runtime',
          component: () => import('@/pages/workspaces/detail/ui/WorkspaceExecutionPage.vue'),
          meta: { moduleTitle: '推广工作区', shellNavKey: 'workspaces', shellSectionTitle: '工作环境' },
        },
        {
          path: 'workspaces/:workspaceId/tasks/:taskId/intervention',
          name: 'workspace-intervention',
          component: () => import('@/pages/workspaces/intervention/ui/TaskInterventionPage.vue'),
          meta: { moduleTitle: '推广工作区', shellNavKey: 'workspaces', shellSectionTitle: '任务干预' },
        },
      ],
    },
    {
      path: '/agents',
      redirect: '/console',
    },
    {
      path: '/agents/openclaw',
      redirect: '/console/openclaw',
    },
    {
      path: '/workspaces/:workspaceId/execution',
      redirect: (to) => `/workspaces/${to.params.workspaceId}/runtime`,
    },
  ],
  scrollBehavior: () => ({ top: 0 }),
})
