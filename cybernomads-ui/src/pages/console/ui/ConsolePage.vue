<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { getConsoleOverview } from '@/entities/console/api/console-service'
import type { ConsoleOverviewRecord } from '@/entities/console/model/types'
import type { AgentNodeRecord } from '@/entities/agent/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

const overview = ref<ConsoleOverviewRecord | null>(null)

watch(
  mockScenarioId,
  async () => {
    overview.value = await getConsoleOverview()
  },
  { immediate: true },
)

const isConfigured = computed(() => overview.value?.state === 'configured')

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

function isPrimaryNode(node: AgentNodeRecord) {
  return node.type === 'openclaw'
}
</script>

<template>
  <section v-if="overview" class="console-page">
    <div class="console-page__glow console-page__glow--primary" />
    <div class="console-page__glow console-page__glow--secondary" />

    <div class="console-page__content">
      <section v-if="isConfigured" class="console-status">
        <div>
          <h1>
            系统状态:
            <span class="console-status__state">{{ overview.statusLabel }}</span>
          </h1>
          <p>{{ overview.description }}</p>
        </div>

        <div class="console-status__latency">
          <span class="console-status__pulse" />
          <span>{{ overview.networkLatencyLabel }}</span>
        </div>
      </section>

      <section v-else class="console-empty">
        <div class="console-empty__line" />
        <div class="console-empty__icon">
          <span class="material-symbols-outlined">warning</span>
        </div>
        <h1>未检测到活动代理</h1>
        <p>{{ overview.description }}</p>
      </section>

      <section class="console-section">
        <div class="console-section__header">
          <h2>
            <span class="material-symbols-outlined">cable</span>
            <span>{{ isConfigured ? '已接入代理引擎' : '可用代理配置' }}</span>
          </h2>
        </div>

        <div class="console-grid" :class="{ 'console-grid--setup': !isConfigured }">
          <article
            v-for="node in overview.nodes"
            :key="node.id"
            class="console-card"
            :class="[
              `console-card--${resolveNodeTone(node)}`,
              {
                'console-card--active': node.status === 'active',
                'console-card--ghost': !isConfigured && !isPrimaryNode(node),
              },
            ]"
          >
            <div v-if="!isConfigured && isPrimaryNode(node)" class="console-card__ribbon">推荐</div>
            <div v-else-if="isConfigured && node.badgeLabel" class="console-card__ribbon console-card__ribbon--dark">
              {{ node.badgeLabel }}
            </div>

            <div class="console-card__icon">
              <span class="material-symbols-outlined">{{ resolveNodeIcon(node) }}</span>
            </div>

            <h3>{{ node.name }}</h3>

            <div class="console-card__status">
              <span class="console-card__status-dot" />
              <span>{{ resolveNodeStatus(node) }}</span>
            </div>

            <p>{{ node.notes }}</p>

            <div class="console-card__actions">
              <RouterLink
                v-if="isPrimaryNode(node)"
                class="console-card__button"
                :class="{ 'console-card__button--primary': !isConfigured }"
                to="/console/openclaw"
              >
                <span>{{ isConfigured ? '编辑配置' : '立即配置' }}</span>
                <span v-if="!isConfigured" class="material-symbols-outlined">arrow_forward</span>
              </RouterLink>

              <template v-if="isConfigured">
                <button
                  v-if="isPrimaryNode(node)"
                  type="button"
                  class="console-card__button console-card__button--primary"
                >
                  切换
                </button>
                <template v-else>
                  <button type="button" class="console-card__button">
                    {{ node.status === 'missing' ? '唤醒节点' : '设为主控' }}
                  </button>
                  <button type="button" class="console-card__icon-button">
                    <span class="material-symbols-outlined">{{ node.status === 'missing' ? 'settings' : 'edit' }}</span>
                  </button>
                </template>
              </template>
            </div>
          </article>

          <article v-if="isConfigured" class="console-card console-card--adder">
            <div class="console-card__add-circle">
              <span class="material-symbols-outlined">add</span>
            </div>
            <h3>添加新代理引擎</h3>
            <p>预留新的执行节点、桥接模型或后续引擎接入口，保持控制台密度与参考页一致。</p>
          </article>
        </div>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.console-page {
  position: relative;
  min-height: 100vh;
  overflow: hidden;
}

.console-page__glow {
  position: absolute;
  inset: auto;
  width: 32rem;
  height: 32rem;
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.console-page__glow--primary {
  top: 8rem;
  right: -10rem;
  background: rgb(143 245 255 / 0.08);
}

.console-page__glow--secondary {
  bottom: -8rem;
  left: 8rem;
  background: rgb(74 162 249 / 0.08);
}

.console-page__content {
  position: relative;
  z-index: 1;
  max-width: min(92rem, calc(100vw - 6rem));
  padding: 2.25rem 2.5rem 3rem;
}

.console-status,
.console-section__header h2,
.console-card__status,
.console-card__actions,
.console-status__latency {
  display: flex;
  align-items: center;
}

.console-status {
  justify-content: space-between;
  gap: 1.5rem;
  margin-bottom: 2rem;
  padding-bottom: 1.4rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.console-status h1,
.console-empty h1,
.console-card h3 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.console-status h1 {
  font-size: 2rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.console-status__state {
  color: var(--cn-secondary);
  text-shadow: 0 0 10px rgb(195 244 0 / 0.35);
}

.console-status p {
  margin: 0.55rem 0 0;
  color: var(--cn-on-surface-muted);
  font-size: 0.95rem;
}

.console-status__latency {
  gap: 0.7rem;
  min-height: 3rem;
  padding: 0 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: rgb(19 19 19 / 0.82);
  color: var(--cn-on-surface);
  font-family: var(--cn-font-mono);
  font-size: 0.88rem;
}

.console-status__pulse {
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  background: var(--cn-secondary);
  box-shadow: 0 0 12px rgb(195 244 0 / 0.65);
}

.console-empty {
  position: relative;
  margin-bottom: 2rem;
  padding: 3.5rem 2rem 3rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  text-align: center;
  background: rgb(19 19 19 / 0.72);
  overflow: hidden;
}

.console-empty__line {
  position: absolute;
  inset: 0 0 auto;
  height: 2px;
  background: linear-gradient(90deg, transparent 0%, rgb(255 113 108 / 0.65) 50%, transparent 100%);
}

.console-empty__icon {
  display: grid;
  place-items: center;
  width: 5rem;
  height: 5rem;
  margin: 0 auto 1.5rem;
  border: 1px solid rgb(255 113 108 / 0.35);
  border-radius: 999px;
  background: rgb(38 38 38 / 0.82);
  color: var(--cn-error);
  box-shadow: 0 0 24px rgb(255 113 108 / 0.18);
}

.console-empty__icon .material-symbols-outlined {
  font-size: 2.25rem;
}

.console-empty h1 {
  font-size: clamp(2.25rem, 4vw, 3.75rem);
  font-weight: 700;
  letter-spacing: -0.05em;
}

.console-empty p {
  max-width: 40rem;
  margin: 1rem auto 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.console-section__header {
  margin-bottom: 1.25rem;
}

.console-section__header h2 {
  gap: 0.55rem;
  margin: 0;
  color: var(--cn-on-surface);
  font-size: 1.15rem;
  font-weight: 600;
}

.console-section__header h2 .material-symbols-outlined {
  color: var(--cn-primary);
  font-size: 1rem;
}

.console-grid {
  display: grid;
  grid-template-columns: repeat(auto-fit, minmax(16rem, 1fr));
  gap: 1.5rem;
}

.console-grid--setup {
  grid-template-columns: repeat(auto-fit, minmax(17.5rem, 1fr));
}

.console-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 18rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1rem;
  background: rgb(26 25 25 / 0.88);
  box-shadow: var(--cn-shadow-ambient);
  overflow: hidden;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.console-card--adder {
  align-items: center;
  justify-content: center;
  text-align: center;
  border-style: dashed;
  border-color: rgb(72 72 71 / 0.34);
  background: rgb(19 19 19 / 0.76);
  box-shadow: none;
}

.console-card--adder:hover {
  border-color: rgb(143 245 255 / 0.34);
}

.console-card--ghost {
  background: rgb(19 19 19 / 0.86);
}

.console-card--active {
  border-color: rgb(143 245 255 / 0.32);
  box-shadow: 0 0 24px rgb(143 245 255 / 0.1), var(--cn-shadow-ambient);
}

.console-card__ribbon {
  position: absolute;
  top: 0;
  right: 0;
  padding: 0.5rem 0.85rem;
  border-bottom-left-radius: 0.75rem;
  background: rgb(143 245 255 / 0.1);
  color: var(--cn-primary);
  font-family: var(--cn-font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.console-card__ribbon--dark {
  background: rgb(143 245 255 / 0.15);
}

.console-card__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  margin-bottom: 1.15rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.8rem;
  background: rgb(19 19 19 / 0.9);
}

.console-card__add-circle {
  display: grid;
  place-items: center;
  width: 3.35rem;
  height: 3.35rem;
  margin-bottom: 1rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
  color: var(--cn-on-surface-muted);
  background: rgb(26 25 25 / 0.92);
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.console-card--adder:hover .console-card__add-circle {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.34);
}

.console-card--primary .console-card__icon {
  color: var(--cn-primary);
}

.console-card--tertiary .console-card__icon {
  color: var(--cn-tertiary);
}

.console-card--secondary .console-card__icon {
  color: var(--cn-secondary);
}

.console-card h3 {
  font-size: 1.25rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.console-card__status {
  gap: 0.5rem;
  margin-top: 0.55rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
}

.console-card__status-dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 8px currentColor;
}

.console-card--primary .console-card__status {
  color: var(--cn-primary);
}

.console-card--tertiary .console-card__status {
  color: var(--cn-tertiary);
}

.console-card--secondary .console-card__status {
  color: var(--cn-secondary);
}

.console-card p {
  margin: 1rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.75;
}

.console-card__actions {
  gap: 0.7rem;
  margin-top: auto;
  padding-top: 1.5rem;
}

.console-card__button,
.console-card__icon-button {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  justify-content: center;
  min-height: 2.55rem;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 0.5rem;
  background: #1a1919;
  color: #adaaaa;
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 600;
  transition:
    border-color var(--cn-transition),
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.console-card__button {
  flex: 1;
}

.console-card__button--primary {
  color: #041316;
  background: #8ff5ff;
  border-color: rgb(143 245 255 / 0.28);
}

.console-card__button--primary:hover {
  color: #041316;
  background: #8ff5ff;
}

.console-card__icon-button {
  width: 2.55rem;
  padding: 0;
}

.console-card__button:hover,
.console-card__icon-button:hover {
  color: #f5f5f5;
  border-color: rgb(143 245 255 / 0.2);
  background: #201f1f;
}

@media (width <= 1280px) {
  .console-page__content {
    max-width: none;
    padding-inline: 1.75rem;
  }
}
</style>
