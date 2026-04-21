<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { listAccounts } from '@/entities/account/api/account-service'
import { listAgentNodes } from '@/entities/agent/api/agent-service'
import { listAssets } from '@/entities/asset/api/asset-service'
import { listStrategies } from '@/entities/strategy/api/strategy-service'
import { listWorkspaces } from '@/entities/workspace/api/workspace-service'
import type { AccountRecord } from '@/entities/account/model/types'
import type { AgentNodeRecord } from '@/entities/agent/model/types'
import type { AssetRecord } from '@/entities/asset/model/types'
import type { StrategyRecord } from '@/entities/strategy/model/types'
import type { WorkspaceRecord } from '@/entities/workspace/model/types'
import { referenceTopbarAvatarUrl } from '@/shared/config/reference-ui'
import { mockScenarioId } from '@/shared/mocks/runtime'

const workspaces = ref<WorkspaceRecord[]>([])
const assets = ref<AssetRecord[]>([])
const strategies = ref<StrategyRecord[]>([])
const accounts = ref<AccountRecord[]>([])
const agentNodes = ref<AgentNodeRecord[]>([])
const activeTab = ref('团队排班')

const topTabs = ['核心概览', '团队排班', '流量监控']

const hasActiveAgent = computed(() => agentNodes.value.some((node) => node.status === 'active'))
const hasConnectedAccount = computed(() => accounts.value.some((account) => account.status === 'connected'))

async function loadPage() {
  ;[workspaces.value, assets.value, strategies.value, accounts.value, agentNodes.value] = await Promise.all([
    listWorkspaces(),
    listAssets(),
    listStrategies(),
    listAccounts(),
    listAgentNodes(),
  ])
}

watch(mockScenarioId, loadPage, { immediate: true })

function resolveAssetName(assetId: string) {
  const displayNameMap: Record<string, string> = {
    'asset-core-whitepaper': 'Q3 科技评测系列',
    'asset-telegram-community': '未选择',
    'asset-demo-video': '夏季大促 V3',
  }

  if (displayNameMap[assetId]) {
    return displayNameMap[assetId]
  }

  return assets.value.find((asset) => asset.id === assetId)?.name ?? '未选择'
}

function resolveStrategyName(strategyId: string) {
  const displayNameMap: Record<string, string> = {
    'strategy-high-frequency-comments': '高频互动',
    'strategy-natural-growth': '自然增长滴灌',
    'strategy-flash-t1': '闪电战 T1',
  }

  if (displayNameMap[strategyId]) {
    return displayNameMap[strategyId]
  }

  return strategies.value.find((strategy) => strategy.id === strategyId)?.name ?? '未选择'
}

function resolveWorkspaceIcon(workspace: WorkspaceRecord) {
  if (workspace.id.includes('nova')) return 'smart_toy'
  if (workspace.id.includes('red')) return 'chat_bubble'
  if (workspace.id.includes('douyin')) return 'video_library'
  return 'hub'
}

function resolveStatusTone(workspace: WorkspaceRecord) {
  if (workspace.status === 'running') return 'running'
  if (workspace.status === 'attention') return 'completed'
  return 'idle'
}
</script>

<template>
  <section class="workspace-page">
    <aside class="workspace-sidebar">
      <div class="workspace-sidebar__brand">
        <span class="material-symbols-outlined workspace-sidebar__brand-icon">hub</span>
        <div>
          <h1>CyberNomads</h1>
          <p>AI 营销指挥中心</p>
        </div>
      </div>

      <nav class="workspace-sidebar__nav">
        <a class="workspace-sidebar__nav-link" href="#">
          <span class="material-symbols-outlined">grid_view</span>
          <span>仪表盘</span>
        </a>
        <RouterLink class="workspace-sidebar__nav-link workspace-sidebar__nav-link--active" to="/workspaces">
          <span class="material-symbols-outlined fill">groups</span>
          <span>团队协作</span>
        </RouterLink>
        <a class="workspace-sidebar__nav-link" href="#">
          <span class="material-symbols-outlined">campaign</span>
          <span>营销活动</span>
        </a>
        <RouterLink class="workspace-sidebar__nav-link" to="/assets">
          <span class="material-symbols-outlined">database</span>
          <span>资产管理</span>
        </RouterLink>
        <a class="workspace-sidebar__nav-link" href="#">
          <span class="material-symbols-outlined">analytics</span>
          <span>数据洞察</span>
        </a>
      </nav>

      <div class="workspace-sidebar__footer">
        <RouterLink class="workspace-sidebar__primary-action" to="/workspaces/new">
          <span class="material-symbols-outlined">add</span>
          <span>发起新项目</span>
        </RouterLink>

        <div class="workspace-sidebar__footer-links">
          <RouterLink class="workspace-sidebar__footer-link" to="/agents/openclaw">
            <span class="material-symbols-outlined">settings</span>
            <span>系统配置</span>
          </RouterLink>
          <a class="workspace-sidebar__footer-link" href="#">
            <span class="material-symbols-outlined">help_outline</span>
            <span>支持中心</span>
          </a>
        </div>
      </div>
    </aside>

    <main class="workspace-main">
      <header class="workspace-topbar">
        <div class="workspace-topbar__left">
          <h2>指挥部管理</h2>
          <nav class="workspace-topbar__tabs">
            <button
              v-for="tab in topTabs"
              :key="tab"
              type="button"
              :class="{ 'workspace-topbar__tab--active': activeTab === tab }"
              @click="activeTab = tab"
            >
              {{ tab }}
            </button>
          </nav>
        </div>

        <div class="workspace-topbar__right">
          <label class="workspace-topbar__search">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="搜索团队或资产..." />
          </label>

          <div class="workspace-topbar__actions">
            <button type="button" aria-label="通知">
              <span class="material-symbols-outlined">notifications</span>
            </button>
            <button type="button" aria-label="安全">
              <span class="material-symbols-outlined">shield</span>
            </button>
            <button type="button" aria-label="树图">
              <span class="material-symbols-outlined">account_tree</span>
            </button>
          </div>

          <div class="workspace-topbar__profile">
            <button type="button">同步数据</button>
            <img :src="referenceTopbarAvatarUrl" alt="管理员头像" />
          </div>
        </div>
      </header>

      <div class="workspace-canvas">
        <section v-if="!hasActiveAgent || !hasConnectedAccount" class="workspace-alerts">
          <div v-if="!hasActiveAgent" class="workspace-alert">
            <div>
              <strong>缺少可用 Agent</strong>
              <p>当前没有已初始化的执行节点，请先完成 OpenClaw 初始化。</p>
            </div>
            <RouterLink to="/agents/openclaw">前往配置</RouterLink>
          </div>
          <div v-if="!hasConnectedAccount" class="workspace-alert">
            <div>
              <strong>缺少可用账号</strong>
              <p>工作区至少需要一个已连接账号，才能进入执行链路。</p>
            </div>
            <RouterLink to="/accounts">前往账号池</RouterLink>
          </div>
        </section>

        <section class="workspace-header">
          <div>
            <h3>工作区 / 团队列表</h3>
            <p>管理并监控 AI 推广节点的实时状态与执行效率。</p>
          </div>
          <RouterLink class="workspace-header__action" to="/workspaces/new">
            <span class="material-symbols-outlined">add</span>
            <span>创建推广团队</span>
          </RouterLink>
        </section>

        <section class="workspace-grid">
          <RouterLink
            v-for="workspace in workspaces"
            :key="workspace.id"
            :to="`/workspaces/${workspace.id}/execution`"
            class="workspace-card"
            :class="[
              `workspace-card--${resolveStatusTone(workspace)}`,
              { 'workspace-card--warning': Boolean(workspace.highlightBanner) },
            ]"
          >
            <div class="workspace-card__body">
              <div class="workspace-card__top">
                <div class="workspace-card__identity">
                  <div class="workspace-card__icon">
                    <span class="material-symbols-outlined">{{ resolveWorkspaceIcon(workspace) }}</span>
                  </div>
                  <div>
                    <h4>{{ workspace.name }}</h4>
                    <div class="workspace-card__status">
                      <span class="workspace-card__dot" />
                      <span>{{ workspace.statusLabel ?? workspace.status }}</span>
                    </div>
                  </div>
                </div>
                <button type="button" aria-label="更多">
                  <span class="material-symbols-outlined">more_vert</span>
                </button>
              </div>

              <div class="workspace-card__meta">
                <div class="workspace-card__meta-item">
                  <div class="workspace-card__meta-label">
                    <span class="material-symbols-outlined">inventory_2</span>
                    <p>活跃资产</p>
                  </div>
                  <strong>{{ resolveAssetName(workspace.assetId) }}</strong>
                </div>
                <div class="workspace-card__meta-item">
                  <div class="workspace-card__meta-label">
                    <span class="material-symbols-outlined">strategy</span>
                    <p>当前策略</p>
                  </div>
                  <strong class="workspace-card__meta-accent">{{ resolveStrategyName(workspace.strategyId) }}</strong>
                </div>
              </div>

              <div class="workspace-card__agents">
                <div class="workspace-card__meta-label">
                  <span class="material-symbols-outlined">group</span>
                  <p>已分配 Agent</p>
                </div>
                <div class="workspace-card__agent-list">
                  <span v-for="label in workspace.assignedAgentLabels ?? []" :key="`${workspace.id}-${label}`">
                    {{ label }}
                  </span>
                </div>
              </div>
            </div>

            <div v-if="workspace.highlightBanner" class="workspace-card__banner">
              <span class="material-symbols-outlined">warning</span>
              <span>{{ workspace.highlightBanner }}</span>
              <strong>ACTION_REQUIRED</strong>
            </div>
          </RouterLink>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.workspace-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.workspace-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 18rem;
  padding: 2rem 1rem;
  background: #131313;
  border-right: 1px solid rgb(72 72 71 / 0.2);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.5);
}

.workspace-sidebar__brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0 1rem;
  margin-bottom: 2rem;
}

.workspace-sidebar__brand-icon {
  font-size: 1.9rem;
  color: #00f0ff;
}

.workspace-sidebar__brand h1,
.workspace-sidebar__brand p {
  margin: 0;
}

.workspace-sidebar__brand h1 {
  color: #00f0ff;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.workspace-sidebar__brand p {
  color: var(--cn-on-surface-muted);
  font-size: 0.7rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.workspace-sidebar__nav,
.workspace-sidebar__footer-links {
  display: grid;
  gap: 0.5rem;
}

.workspace-sidebar__nav {
  flex: 1;
}

.workspace-sidebar__nav-link,
.workspace-sidebar__footer-link {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-display);
  font-size: 0.92rem;
  transition: all 0.3s ease;
}

.workspace-sidebar__nav-link:hover,
.workspace-sidebar__footer-link:hover {
  color: #00f0ff;
  background: rgb(26 25 25 / 0.9);
}

.workspace-sidebar__nav-link--active {
  color: #00f0ff;
  font-weight: 700;
  background: #1a1919;
  border-right: 4px solid #00f0ff;
}

.workspace-sidebar__footer {
  padding-top: 2rem;
  margin-top: auto;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.workspace-sidebar__primary-action {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  margin-bottom: 1rem;
  color: #00f0ff;
  background: rgb(0 240 255 / 0.1);
  border: 1px solid rgb(0 240 255 / 0.3);
  border-radius: 0.75rem;
  font-weight: 700;
}

.workspace-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rem;
}

.workspace-topbar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: calc(100% - 18rem);
  min-height: 4rem;
  padding: 0 2rem;
  background: rgb(14 14 14 / 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.workspace-topbar__left,
.workspace-topbar__right,
.workspace-topbar__tabs,
.workspace-topbar__actions,
.workspace-topbar__profile {
  display: flex;
  align-items: center;
}

.workspace-topbar__left {
  gap: 1.5rem;
}

.workspace-topbar__left h2 {
  margin: 0;
  color: #00f0ff;
  font-size: 1.125rem;
  font-weight: 700;
}

.workspace-topbar__tabs {
  gap: 0.75rem;
}

.workspace-topbar__tabs button {
  padding: 1.25rem 0;
  color: var(--cn-on-surface-muted);
  background: transparent;
  border: 0;
  font-size: 0.92rem;
}

.workspace-topbar__tab--active {
  color: #00f0ff;
  border-bottom: 2px solid #00f0ff;
}

.workspace-topbar__right {
  gap: 1.5rem;
}

.workspace-topbar__search {
  position: relative;
  display: flex;
  align-items: center;
  width: 16rem;
  min-height: 2.4rem;
  padding: 0 0.9rem 0 2.3rem;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.65rem;
}

.workspace-topbar__search span {
  position: absolute;
  left: 0.75rem;
  font-size: 1rem;
  color: var(--cn-on-surface-muted);
}

.workspace-topbar__search input {
  width: 100%;
  color: #fff;
  background: transparent;
  border: 0;
  outline: 0;
}

.workspace-topbar__actions {
  gap: 1rem;
}

.workspace-topbar__actions button {
  color: var(--cn-on-surface-muted);
  background: transparent;
  border: 0;
}

.workspace-topbar__profile {
  gap: 0.75rem;
  padding-left: 1rem;
  border-left: 1px solid rgb(72 72 71 / 0.3);
}

.workspace-topbar__profile button {
  padding: 0.45rem 0.9rem;
  color: #00f0ff;
  background: rgb(0 240 255 / 0.1);
  border: 0;
  border-radius: 0.5rem;
  font-size: 0.76rem;
  font-weight: 700;
}

.workspace-topbar__profile img {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(0 240 255 / 0.3);
  border-radius: 999px;
}

.workspace-canvas {
  position: relative;
  min-height: 100vh;
  padding: 6rem 2rem 2rem;
}

.workspace-canvas::before {
  content: '';
  position: absolute;
  top: 16%;
  left: 20%;
  width: 32rem;
  height: 32rem;
  background: rgb(0 240 255 / 0.05);
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.workspace-alerts {
  display: grid;
  gap: 0.75rem;
  max-width: 60rem;
  margin-bottom: 2rem;
}

.workspace-alert {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  background: #131313;
  border: 1px solid rgb(255 184 0 / 0.2);
  border-radius: 0.9rem;
}

.workspace-alert strong,
.workspace-alert p {
  margin: 0;
}

.workspace-alert p {
  margin-top: 0.25rem;
  color: var(--cn-on-surface-muted);
}

.workspace-alert a {
  color: #00f0ff;
  font-weight: 700;
}

.workspace-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.workspace-header h3,
.workspace-header p {
  margin: 0;
}

.workspace-header h3 {
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.workspace-header p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.workspace-header__action {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.25rem;
  color: #000;
  background: #00f0ff;
  border-radius: 0.65rem;
  box-shadow: 0 0 15px rgb(0 240 255 / 0.3);
  font-weight: 600;
}

.workspace-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.5rem;
}

.workspace-card {
  display: flex;
  flex-direction: column;
  min-height: 20rem;
  overflow: hidden;
  color: #fff;
  background: #131313;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.workspace-card:hover {
  border-color: rgb(0 240 255 / 0.5);
  box-shadow: 0 0 20px rgb(0 240 255 / 0.2);
}

.workspace-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.5rem;
}

.workspace-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.workspace-card__identity {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.workspace-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: rgb(26 26 26 / 1);
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 0.4rem;
}

.workspace-card__icon span {
  font-size: 1.35rem;
}

.workspace-card__top h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.workspace-card__top button {
  color: var(--cn-on-surface-muted);
  background: transparent;
  border: 0;
}

.workspace-card__status {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.35rem;
  font-family: var(--cn-font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
}

.workspace-card__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.workspace-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.workspace-card__meta-item {
  padding: 0.8rem;
  background: rgb(26 26 26 / 0.5);
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 0.4rem;
}

.workspace-card__meta-label {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.workspace-card__meta-label span {
  font-size: 0.875rem;
  color: var(--cn-on-surface-muted);
}

.workspace-card__meta-label p {
  margin: 0;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-card__meta-item strong {
  display: block;
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__agents {
  margin-top: auto;
}

.workspace-card__agent-list {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.workspace-card__agent-list span {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  background: #262626;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 0.25rem;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.workspace-card__banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  min-height: 2.7rem;
  padding: 0 1.25rem;
  color: #151515;
  background: #ffb800;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.workspace-card__banner strong {
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
}

.workspace-card--running .workspace-card__icon,
.workspace-card--running .workspace-card__meta-accent,
.workspace-card--running .workspace-card__status {
  color: #00f0ff;
}

.workspace-card--running .workspace-card__dot {
  background: #00f0ff;
  box-shadow: 0 0 8px rgb(0 240 255 / 0.8);
}

.workspace-card--idle .workspace-card__icon,
.workspace-card--idle .workspace-card__status {
  color: #9ca3af;
}

.workspace-card--idle .workspace-card__dot {
  background: #6b7280;
}

.workspace-card--completed .workspace-card__icon,
.workspace-card--completed .workspace-card__status,
.workspace-card--completed .workspace-card__meta-accent {
  color: #c3f400;
}

.workspace-card--completed .workspace-card__dot {
  background: #c3f400;
}

@media (max-width: 1440px) {
  .workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .workspace-sidebar {
    position: static;
    width: 100%;
    height: auto;
  }

  .workspace-main {
    margin-left: 0;
  }

  .workspace-topbar {
    position: static;
    width: auto;
  }

  .workspace-page {
    flex-direction: column;
  }

  .workspace-canvas {
    padding-top: 2rem;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .workspace-topbar,
  .workspace-header,
  .workspace-alert {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-topbar__right {
    flex-wrap: wrap;
  }

  .workspace-topbar__search {
    width: 100%;
  }

  .workspace-card__meta {
    grid-template-columns: 1fr;
  }
}
</style>
