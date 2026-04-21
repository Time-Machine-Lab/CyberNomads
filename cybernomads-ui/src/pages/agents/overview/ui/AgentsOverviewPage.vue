<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { listAgentNodes } from '@/entities/agent/api/agent-service'
import type { AgentNodeRecord } from '@/entities/agent/model/types'
import cybernomadsMarkUrl from '@/shared/assets/branding/cybernomads-mark.svg'
import { referenceAgentDashboardAvatarUrl } from '@/shared/config/reference-ui'
import { mockScenarioId } from '@/shared/mocks/runtime'

const nodes = ref<AgentNodeRecord[]>([])

const activeNode = computed(() => nodes.value.find((item) => item.status === 'active') ?? null)

watch(
  mockScenarioId,
  async () => {
    nodes.value = await listAgentNodes()
  },
  { immediate: true },
)

function resolveNodeIcon(node: AgentNodeRecord) {
  if (node.type === 'openclaw') return 'precision_manufacturing'
  if (node.type === 'codex') return 'data_object'
  return 'forum'
}

function resolveNodeTone(node: AgentNodeRecord) {
  if (node.type === 'openclaw') return 'primary'
  if (node.type === 'codex') return 'tertiary'
  return 'secondary'
}

function resolveNodeStatus(node: AgentNodeRecord) {
  if (node.status === 'active') return '运行中'
  if (node.status === 'idle') return '待机'
  return '离线'
}
</script>

<template>
  <section class="agents-page">
    <aside class="agents-sidebar">
      <div class="agents-sidebar__brand">
        <div class="agents-sidebar__mark">
          <img :src="cybernomadsMarkUrl" alt="CyberNomads" />
        </div>
        <div>
          <h1>CYBER_NOMAD</h1>
          <p>Protocol Active</p>
        </div>
      </div>

      <nav class="agents-sidebar__nav">
        <a class="agents-sidebar__link agents-sidebar__link--active" href="#">
          <span class="material-symbols-outlined fill">grid_view</span>
          <span>Dashboard</span>
        </a>
        <RouterLink class="agents-sidebar__link" to="/agents">
          <span class="material-symbols-outlined">smart_toy</span>
          <span>Agent Nodes</span>
        </RouterLink>
        <a class="agents-sidebar__link" href="#">
          <span class="material-symbols-outlined">hub</span>
          <span>Neural Links</span>
        </a>
        <a class="agents-sidebar__link" href="#">
          <span class="material-symbols-outlined">terminal</span>
          <span>Protocol Logs</span>
        </a>
        <RouterLink class="agents-sidebar__link" to="/agents/openclaw">
          <span class="material-symbols-outlined">settings_input_component</span>
          <span>System Settings</span>
        </RouterLink>
      </nav>

      <RouterLink class="agents-sidebar__cta" to="/agents/openclaw">INITIALIZE AGENT</RouterLink>

      <div class="agents-sidebar__footer">
        <a class="agents-sidebar__link" href="#">
          <span class="material-symbols-outlined">verified_user</span>
          <span>Security</span>
        </a>
        <a class="agents-sidebar__link" href="#">
          <span class="material-symbols-outlined">help_center</span>
          <span>Support</span>
        </a>
      </div>
    </aside>

    <main class="agents-main">
      <header class="agents-topbar">
        <div class="agents-topbar__brand">Neural Architect</div>

        <div class="agents-topbar__tabs">
          <a href="#" class="agents-topbar__tab agents-topbar__tab--active">Dashboard</a>
          <a href="#" class="agents-topbar__tab">Network</a>
        </div>

        <div class="agents-topbar__actions">
          <button type="button">
            <span class="material-symbols-outlined">sensors</span>
          </button>
          <button type="button">
            <span class="material-symbols-outlined">memory</span>
          </button>
          <button type="button">
            <span class="material-symbols-outlined">signal_cellular_alt</span>
          </button>
          <img :src="referenceAgentDashboardAvatarUrl" alt="Operator avatar" />
        </div>
      </header>

      <div class="agents-canvas">
        <template v-if="!activeNode">
          <section class="agents-empty-state">
            <div class="agents-empty-state__line" />
            <div class="agents-empty-state__content">
              <div class="agents-empty-state__icon">
                <span class="material-symbols-outlined">warning</span>
              </div>
              <div>
                <h2>未检测到活动代理</h2>
                <p>神经架构目前处于待机状态。请配置并初始化一个代理节点以开始编排任务和处理数据流。</p>
              </div>
            </div>
          </section>

          <section class="agents-section">
            <h3>
              <span class="material-symbols-outlined">cable</span>
              <span>可用代理配置</span>
            </h3>

            <div class="agents-grid agents-grid--empty">
              <article
                v-for="node in nodes"
                :key="node.id"
                class="agent-card"
                :class="[
                  `agent-card--${resolveNodeTone(node)}`,
                  { 'agent-card--recommended': node.type === 'openclaw' },
                ]"
              >
                <div v-if="node.type === 'openclaw'" class="agent-card__ribbon">推荐</div>

                <div class="agent-card__glyph">
                  <span class="material-symbols-outlined">{{ resolveNodeIcon(node) }}</span>
                </div>

                <h4>{{ node.name.replace(' V1.2', '') }}</h4>
                <p>{{ node.notes }}</p>

                <RouterLink
                  v-if="node.type === 'openclaw'"
                  to="/agents/openclaw"
                  class="agent-card__button agent-card__button--primary"
                >
                  <span>立即配置</span>
                  <span class="material-symbols-outlined">arrow_forward</span>
                </RouterLink>
                <button
                  v-else
                  type="button"
                  class="agent-card__button"
                >
                  立即配置
                </button>
              </article>
            </div>
          </section>
        </template>

        <template v-else>
          <section class="agents-status">
            <div>
              <p>系统状态</p>
              <h2>在线</h2>
              <span>{{ activeNode.notes }}</span>
            </div>
            <div class="agents-status__latency">
              <span class="agents-status__pulse" />
              <span>网络延迟: {{ activeNode.latencyMs ?? 0 }}ms</span>
            </div>
          </section>

          <section class="agents-grid">
            <article
              v-for="node in nodes"
              :key="node.id"
              class="agent-runtime-card"
              :class="[
                `agent-runtime-card--${resolveNodeTone(node)}`,
                { 'agent-runtime-card--active': node.status === 'active' },
              ]"
            >
              <div v-if="node.badgeLabel" class="agent-runtime-card__badge">{{ node.badgeLabel }}</div>

              <div class="agent-runtime-card__icon">
                <span class="material-symbols-outlined">{{ node.type === 'openclaw' ? 'smart_toy' : resolveNodeIcon(node) }}</span>
              </div>

              <h3>{{ node.name }}</h3>

              <div class="agent-runtime-card__status">
                <span class="agent-runtime-card__status-dot" />
                <span>{{ resolveNodeStatus(node) }}</span>
              </div>

              <div class="agent-runtime-card__actions">
                <RouterLink
                  v-if="node.type === 'openclaw'"
                  to="/agents/openclaw"
                  class="agent-runtime-card__button"
                >
                  编辑配置
                </RouterLink>
                <button
                  v-if="node.type === 'openclaw'"
                  type="button"
                  class="agent-runtime-card__button agent-runtime-card__button--primary"
                >
                  切换
                </button>
                <template v-else>
                  <button type="button" class="agent-runtime-card__button">
                    {{ node.status === 'missing' ? '唤醒节点' : '设为主控' }}
                  </button>
                  <button type="button" class="agent-runtime-card__icon-button">
                    <span class="material-symbols-outlined">{{ node.status === 'missing' ? 'settings' : 'edit' }}</span>
                  </button>
                </template>
              </div>
            </article>

            <button type="button" class="agent-runtime-card agent-runtime-card--add">
              <div class="agent-runtime-card__add-circle">
                <span class="material-symbols-outlined">add</span>
              </div>
              <span>添加新代理引擎</span>
            </button>
          </section>
        </template>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.agents-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.agents-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  display: none;
  flex-direction: column;
  width: 16rem;
  padding: 1.5rem 1rem;
  background: #131313;
}

.agents-sidebar__brand {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0 0.5rem;
  margin-bottom: 2rem;
}

.agents-sidebar__mark {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #262626;
}

.agents-sidebar__mark img {
  width: 100%;
  height: 100%;
}

.agents-sidebar__brand h1,
.agents-sidebar__brand p {
  margin: 0;
}

.agents-sidebar__brand h1 {
  color: #00f0ff;
  font-size: 1.2rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.agents-sidebar__brand p {
  color: rgb(0 222 236 / 0.8);
  font-size: 0.75rem;
}

.agents-sidebar__nav,
.agents-sidebar__footer {
  display: grid;
  gap: 0.35rem;
}

.agents-sidebar__nav {
  flex: 1;
}

.agents-sidebar__link {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  color: #adaaaa;
  font-size: 0.88rem;
  transition: background-color 180ms ease, color 180ms ease;
}

.agents-sidebar__link:hover {
  color: #00f0ff;
  background: #1a1919;
}

.agents-sidebar__link--active {
  color: #00f0ff;
  background: #262626;
  border-left: 4px solid #00f0ff;
  border-radius: 0 0.75rem 0.75rem 0;
}

.agents-sidebar__cta {
  display: inline-flex;
  justify-content: center;
  padding: 0.9rem 1rem;
  margin: 0.5rem 0.5rem 1.5rem;
  border-radius: 0.6rem;
  color: #005d63;
  background: #8ff5ff;
  font-size: 0.8rem;
  font-weight: 700;
}

.agents-main {
  flex: 1;
  min-width: 0;
}

.agents-topbar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  display: none;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 16rem);
  height: 4rem;
  padding: 0 1.5rem;
  background: rgb(14 14 14 / 0.8);
  backdrop-filter: blur(20px);
}

.agents-topbar__brand {
  color: #00f0ff;
  font-family: var(--cn-font-display);
  font-size: 1.1rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.agents-topbar__tabs {
  display: flex;
  gap: 1rem;
  align-items: center;
  color: #adaaaa;
}

.agents-topbar__tab {
  padding: 0.35rem 0;
  border-bottom: 2px solid transparent;
}

.agents-topbar__tab--active {
  color: #00f0ff;
  border-color: #00f0ff;
}

.agents-topbar__actions {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  color: #adaaaa;
}

.agents-topbar__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.agents-topbar__actions button:hover {
  color: #8ff5ff;
}

.agents-topbar__actions img {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
}

.agents-canvas {
  padding: 1.5rem;
}

.agents-empty-state {
  position: relative;
  overflow: hidden;
  padding: 2rem 1.75rem;
  margin-bottom: 2.25rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #131313;
}

.agents-empty-state__line {
  position: absolute;
  inset: 0 auto auto 0;
  width: 100%;
  height: 0.2rem;
  background: linear-gradient(90deg, transparent, #ff716c, transparent);
  opacity: 0.7;
}

.agents-empty-state__content {
  display: grid;
  gap: 1.25rem;
  justify-items: center;
  max-width: 42rem;
  margin: 0 auto;
  text-align: center;
}

.agents-empty-state__icon {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  border: 1px solid rgb(255 113 108 / 0.3);
  border-radius: 999px;
  color: #ff716c;
  background: #262626;
  box-shadow: 0 0 24px rgb(255 113 108 / 0.2);
}

.agents-empty-state h2,
.agents-status h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(2rem, 4vw, 3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.agents-empty-state p,
.agents-status span {
  color: #adaaaa;
  line-height: 1.7;
}

.agents-section h3 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0 0 1.5rem;
  color: #fff;
  font-family: var(--cn-font-display);
  font-size: 1.25rem;
  font-weight: 500;
}

.agents-section h3 .material-symbols-outlined {
  color: #8ff5ff;
  font-size: 1rem;
}

.agents-status {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  justify-content: space-between;
  padding-bottom: 1.5rem;
  margin-bottom: 1.75rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.agents-status p {
  margin: 0 0 0.4rem;
  color: #adaaaa;
}

.agents-status__latency {
  display: inline-flex;
  gap: 0.75rem;
  align-items: center;
  align-self: flex-start;
  padding: 0.75rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #131313;
  font-family: var(--cn-font-mono);
  font-size: 0.82rem;
}

.agents-status__pulse {
  width: 0.65rem;
  height: 0.65rem;
  border-radius: 999px;
  background: #c3f400;
  box-shadow: 0 0 10px #c3f400;
}

.agents-grid {
  display: grid;
  grid-template-columns: 1fr;
  gap: 1.5rem;
}

.agents-grid--empty {
  grid-template-columns: 1fr;
}

.agent-card,
.agent-runtime-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 18rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 1rem;
  background: #1a1919;
}

.agent-card__ribbon,
.agent-runtime-card__badge {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.4rem 0.75rem;
  border-bottom-left-radius: 0.75rem;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.1);
  font-family: var(--cn-font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.agent-card__glyph,
.agent-runtime-card__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #131313;
}

.agent-card--primary .agent-card__glyph,
.agent-runtime-card--primary .agent-runtime-card__icon {
  color: #8ff5ff;
}

.agent-card--tertiary .agent-card__glyph,
.agent-runtime-card--tertiary .agent-runtime-card__icon {
  color: #65afff;
}

.agent-card--secondary .agent-card__glyph,
.agent-runtime-card--secondary .agent-runtime-card__icon {
  color: #c3f400;
}

.agent-card h4,
.agent-runtime-card h3 {
  margin: 1rem 0 0.5rem;
  font-family: var(--cn-font-display);
  font-size: 1.25rem;
  font-weight: 700;
}

.agent-card p {
  flex: 1;
  margin: 0 0 1.5rem;
  color: #adaaaa;
  line-height: 1.7;
}

.agent-card__button,
.agent-runtime-card__button,
.agent-runtime-card__icon-button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  min-height: 2.75rem;
  border: 1px solid rgb(72 72 71 / 0.25);
  border-radius: 0.6rem;
  color: #fff;
  background: transparent;
}

.agent-card__button--primary,
.agent-runtime-card__button--primary {
  color: #005d63;
  background: #8ff5ff;
  border-color: #8ff5ff;
}

.agent-runtime-card--active {
  border-color: rgb(143 245 255 / 0.3);
  background: rgb(26 25 25 / 0.7);
  box-shadow: 0 0 20px rgb(143 245 255 / 0.1);
}

.agent-runtime-card__status {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  margin-bottom: 1.25rem;
  font-size: 0.82rem;
}

.agent-runtime-card__status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: currentColor;
}

.agent-runtime-card--primary .agent-runtime-card__status {
  color: #8ff5ff;
}

.agent-runtime-card--tertiary .agent-runtime-card__status {
  color: #4aa2f9;
}

.agent-runtime-card--secondary .agent-runtime-card__status {
  color: #767575;
}

.agent-runtime-card__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-top: auto;
}

.agent-runtime-card__button {
  flex: 1;
}

.agent-runtime-card__icon-button {
  width: 2.75rem;
  padding: 0;
}

.agent-runtime-card--add {
  justify-content: center;
  align-items: center;
  min-height: 13.75rem;
  border-style: dashed;
  cursor: pointer;
}

.agent-runtime-card__add-circle {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
  color: #adaaaa;
  background: #131313;
}

@media (min-width: 960px) {
  .agents-sidebar,
  .agents-topbar {
    display: flex;
  }

  .agents-canvas {
    padding: 6rem 2.5rem 2.5rem;
    margin-left: 16rem;
  }

  .agents-grid--empty {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }

  .agents-grid {
    grid-template-columns: repeat(4, minmax(0, 1fr));
  }

  .agents-status {
    flex-direction: row;
    align-items: flex-end;
  }
}
</style>
