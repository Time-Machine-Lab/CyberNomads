<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'

import { getConsoleOverview } from '@/entities/console/api/console-service'
import type { ConsoleOverviewRecord } from '@/entities/console/model/types'
import { formatDateTime } from '@/shared/lib/format'

const overview = ref<ConsoleOverviewRecord | null>(null)
const isLoading = ref(true)

const service = computed(() => overview.value?.currentService ?? null)

const connectionLabel = computed(() => {
  switch (overview.value?.connectionStatus) {
    case 'connected':
      return '连接可用'
    case 'pending_verification':
      return '等待测试'
    case 'connection_failed':
      return '连接失败'
    default:
      return '未配置'
  }
})

const capabilityLabel = computed(() => {
  switch (overview.value?.capabilityStatus) {
    case 'ready':
      return '能力已准备'
    case 'preparing':
      return '能力准备中'
    case 'prepare_failed':
      return '能力准备失败'
    default:
      return '能力未准备'
  }
})

const agentServiceOptions = computed(() => [
  {
    key: 'openclaw',
    title: 'OpenClaw',
    description: '推荐接入方式，当前可配置。',
    icon: 'precision_manufacturing',
    enabled: true,
    badge: service.value?.providerCode === 'openclaw' ? '已选择' : '可用',
  },
  {
    key: 'internal-agent',
    title: '内部 Agent',
    description: '内置执行引擎，后续版本开放。',
    icon: 'hub',
    enabled: false,
    badge: '未开放',
  },
  {
    key: 'external-agent',
    title: '外部 Agent 服务',
    description: '连接自定义 Agent 服务，后续版本开放。',
    icon: 'cloud_sync',
    enabled: false,
    badge: '未开放',
  },
])

async function loadOverview() {
  isLoading.value = true

  try {
    overview.value = await getConsoleOverview()
  } finally {
    isLoading.value = false
  }
}

onMounted(loadOverview)
</script>

<template>
  <section class="console-page">
    <div class="console-page__glow console-page__glow--primary" />
    <div class="console-page__glow console-page__glow--secondary" />

    <div class="console-page__content">
      <header class="console-hero">
        <div>
          <p class="console-hero__eyebrow">Console / Agent Service</p>
          <h1>控制台 Agent 服务接入</h1>
        </div>

        <button type="button" class="console-hero__refresh" :disabled="isLoading" @click="loadOverview">
          <span class="material-symbols-outlined">refresh</span>
          <span>{{ isLoading ? '刷新中' : '刷新状态' }}</span>
        </button>
      </header>

      <section v-if="overview" class="console-readiness" :class="`console-readiness--${overview.statusTone}`">
        <div class="console-readiness__main">
          <div class="console-readiness__badge">
            <span class="console-readiness__pulse" />
            <span>{{ overview.statusLabel }}</span>
          </div>

          <h2>{{ overview.hasCurrentService ? '当前 Agent 服务' : '尚未接入 Agent 服务' }}</h2>

          <div class="console-readiness__actions">
            <RouterLink class="console-readiness__primary" to="/console/openclaw">
              <span>{{ overview.actionLabel }}</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </RouterLink>
          </div>
        </div>

        <aside class="console-readiness__status">
          <div class="console-metric">
            <span>Provider</span>
            <strong>{{ service?.providerCode ?? 'openclaw' }}</strong>
          </div>
          <div class="console-metric">
            <span>Endpoint</span>
            <strong>{{ service?.endpointUrl ?? '未配置' }}</strong>
          </div>
          <div class="console-metric">
            <span>连接状态</span>
            <strong>{{ connectionLabel }}</strong>
          </div>
          <div class="console-metric">
            <span>能力状态</span>
            <strong>{{ capabilityLabel }}</strong>
          </div>
          <div class="console-metric">
            <span>最近测试</span>
            <strong>{{ service?.lastVerifiedAt ? formatDateTime(service.lastVerifiedAt) : '尚未测试' }}</strong>
          </div>
        </aside>
      </section>

      <section v-else class="console-readiness console-readiness--error">
        <div class="console-readiness__main">
          <div class="console-readiness__badge">
            <span class="console-readiness__pulse" />
            <span>加载中</span>
          </div>
          <h2>正在读取 Agent 服务状态</h2>
          <p>控制台正在从后端 Agent Services API 获取当前服务状态。</p>
        </div>
      </section>

      <section class="console-flow">
        <div class="console-flow__header">
          <span class="material-symbols-outlined">conversion_path</span>
          <div>
            <h2>Agent 服务选择</h2>
          </div>
        </div>

        <div class="console-service-grid">
          <article
            v-for="option in agentServiceOptions"
            :key="option.key"
            class="console-service-card"
            :class="{
              'console-service-card--active': option.enabled,
              'console-service-card--disabled': !option.enabled,
            }"
          >
            <div class="console-service-card__top">
              <span class="console-service-card__icon material-symbols-outlined">{{ option.icon }}</span>
              <span class="console-service-card__badge">{{ option.badge }}</span>
            </div>
            <div>
              <h3>{{ option.title }}</h3>
              <p>{{ option.description }}</p>
            </div>
            <RouterLink v-if="option.enabled" class="console-service-card__action" to="/console/openclaw">
              <span>选择配置</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </RouterLink>
            <button v-else type="button" class="console-service-card__action" disabled>暂不可选</button>
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
  width: 34rem;
  height: 34rem;
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.console-page__glow--primary {
  top: 5rem;
  right: -8rem;
  background: rgb(143 245 255 / 0.08);
}

.console-page__glow--secondary {
  bottom: -10rem;
  left: 8rem;
  background: rgb(195 244 0 / 0.05);
}

.console-page__content {
  position: relative;
  z-index: 1;
  box-sizing: border-box;
  width: min(100%, 120rem);
  margin-inline: auto;
  padding: clamp(2rem, 3vw, 3rem);
}

.console-hero {
  display: flex;
  gap: 2rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
}

.console-hero__eyebrow {
  margin: 0 0 0.85rem;
  color: var(--cn-primary);
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.console-hero h1,
.console-readiness h2,
.console-flow h2,
.console-step h3 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.console-hero h1 {
  max-width: 54rem;
  font-size: clamp(2.4rem, 5vw, 4.8rem);
  font-weight: 800;
  letter-spacing: -0.06em;
  line-height: 0.95;
}

.console-hero__refresh,
.console-readiness__primary,
.console-service-card__action {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 0.75rem;
  font-family: var(--cn-font-body);
  font-weight: 700;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.console-hero__refresh {
  min-height: 2.8rem;
  padding: 0 1rem;
  color: var(--cn-on-surface-muted);
  background: rgb(19 19 19 / 0.78);
}

.console-hero__refresh:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.28);
  background: rgb(32 31 31 / 0.9);
}

.console-readiness {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(22rem, 0.65fr);
  gap: 1.5rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1.35rem;
  background:
    linear-gradient(135deg, rgb(143 245 255 / 0.06), transparent 38%),
    rgb(19 19 19 / 0.82);
  box-shadow: var(--cn-shadow-ambient);
}

.console-readiness--primary {
  border-color: rgb(143 245 255 / 0.34);
}

.console-readiness--secondary {
  border-color: rgb(101 175 255 / 0.28);
}

.console-readiness--warning {
  border-color: rgb(195 244 0 / 0.28);
}

.console-readiness--error {
  border-color: rgb(255 113 108 / 0.28);
}

.console-readiness__main {
  display: flex;
  flex-direction: column;
  min-height: 23rem;
  padding: 1rem;
}

.console-readiness__badge {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  align-self: flex-start;
  padding: 0.45rem 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 999px;
  color: var(--cn-primary);
  background: rgb(10 10 10 / 0.38);
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
}

.console-readiness__pulse {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: currentColor;
  box-shadow: 0 0 12px currentColor;
}

.console-readiness h2 {
  margin-top: auto;
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.console-readiness p {
  max-width: 44rem;
  margin: 1rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.console-readiness__actions {
  display: flex;
  flex-wrap: wrap;
  gap: 0.8rem;
  margin-top: 1.5rem;
}

.console-readiness__primary,
.console-readiness__secondary {
  min-height: 3rem;
  padding: 0 1.1rem;
}

.console-readiness__primary {
  color: #041316;
  background: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.32);
}

.console-readiness__status {
  display: grid;
  gap: 0.75rem;
  align-content: start;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 1rem;
  background: rgb(10 10 10 / 0.28);
}

.console-metric {
  display: grid;
  gap: 0.35rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 0.8rem;
  background: rgb(26 25 25 / 0.7);
}

.console-metric span {
  color: var(--cn-on-surface-muted);
  font-size: 0.76rem;
}

.console-metric strong {
  overflow: hidden;
  font-family: var(--cn-font-mono);
  font-size: 0.88rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.console-flow {
  margin-top: 1.5rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1.25rem;
  background: rgb(19 19 19 / 0.7);
}

.console-flow__header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.3rem;
}

.console-flow__header > .material-symbols-outlined {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  flex-shrink: 0;
  border: 1px solid rgb(143 245 255 / 0.22);
  border-radius: 0.8rem;
  color: var(--cn-primary);
  background: rgb(143 245 255 / 0.08);
}

.console-flow h2 {
  font-size: 1.25rem;
}

.console-flow p,
.console-step p {
  margin: 0.4rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.75;
}

.console-service-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.console-service-card {
  display: flex;
  flex-direction: column;
  min-height: 12.5rem;
  padding: 1.1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1rem;
  background: rgb(26 25 25 / 0.74);
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    opacity var(--cn-transition);
}

.console-service-card--active {
  border-color: rgb(143 245 255 / 0.32);
  background:
    linear-gradient(135deg, rgb(143 245 255 / 0.06), transparent 52%),
    rgb(26 25 25 / 0.86);
}

.console-service-card--disabled {
  opacity: 0.42;
}

.console-service-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1rem;
  margin-bottom: 1.6rem;
}

.console-service-card__icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgb(143 245 255 / 0.2);
  border-radius: 0.8rem;
  color: var(--cn-primary);
  background: rgb(143 245 255 / 0.08);
}

.console-service-card__badge {
  padding: 0.32rem 0.55rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 999px;
  color: var(--cn-on-surface-muted);
  background: rgb(10 10 10 / 0.36);
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
}

.console-service-card h3 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: 1.12rem;
  font-weight: 800;
}

.console-service-card p {
  margin: 0.65rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.7;
}

.console-service-card__action {
  align-self: flex-start;
  min-height: 2.55rem;
  margin-top: auto;
  padding: 0 0.9rem;
  color: #041316;
  background: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.32);
}

.console-service-card__action:disabled {
  color: var(--cn-on-surface-muted);
  background: rgb(32 31 31 / 0.74);
  cursor: not-allowed;
}

@media (width <= 1280px) {
  .console-page__content {
    max-width: none;
    width: 100%;
    margin-inline: 0;
    padding-inline: 1.75rem;
  }

  .console-readiness,
  .console-service-grid {
    grid-template-columns: 1fr;
  }

  .console-hero {
    flex-direction: column;
  }
}
</style>
