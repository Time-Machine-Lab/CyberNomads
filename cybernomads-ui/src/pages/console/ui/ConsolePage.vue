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

const readinessSteps = computed(() => [
  {
    title: '保存 OpenClaw 服务配置',
    description: service.value ? '已存在当前 Agent 服务配置，可继续更新端点或凭据。' : '填写 endpoint、认证方式和密钥，创建当前唯一 Agent 服务。',
    state: service.value ? 'done' : 'active',
  },
  {
    title: '显式测试连接',
    description: '保存配置后必须由用户触发连接测试；连接成功后服务才可被 MVP 使用。',
    state:
      overview.value?.connectionStatus === 'connected'
        ? 'done'
        : overview.value?.connectionStatus === 'connection_failed'
          ? 'error'
          : service.value
            ? 'active'
            : 'pending',
  },
  {
    title: '准备 CyberNomads 能力',
    description: '连接可用后继续准备运行本产品所需能力；这不改变“连接成功即可使用”的 MVP 语义。',
    state:
      overview.value?.capabilityStatus === 'ready'
        ? 'done'
        : overview.value?.capabilityStatus === 'prepare_failed'
          ? 'error'
          : overview.value?.isUsable
            ? 'active'
            : 'pending',
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
          <p>
            当前 MVP 只维护一个激活 Agent 服务。请先完成 OpenClaw 配置、连接测试与能力准备，再进入账号、产品、策略和推广工作区。
          </p>
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
          <p>{{ overview.description }}</p>

          <div class="console-readiness__actions">
            <RouterLink class="console-readiness__primary" to="/console/openclaw">
              <span>{{ overview.actionLabel }}</span>
              <span class="material-symbols-outlined">arrow_forward</span>
            </RouterLink>
            <RouterLink class="console-readiness__secondary" to="/accounts">
              <span>继续账号配置</span>
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
          <span class="material-symbols-outlined">route</span>
          <div>
            <h2>配置业务流程</h2>
            <p>保存配置、测试连接、准备能力是三个独立业务动作，页面会按后端状态逐步推进。</p>
          </div>
        </div>

        <div class="console-flow__steps">
          <article
            v-for="(step, index) in readinessSteps"
            :key="step.title"
            class="console-step"
            :class="`console-step--${step.state}`"
          >
            <span class="console-step__index">{{ index + 1 }}</span>
            <div>
              <h3>{{ step.title }}</h3>
              <p>{{ step.description }}</p>
            </div>
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

.console-hero p:not(.console-hero__eyebrow) {
  max-width: 48rem;
  margin: 1rem 0 0;
  color: var(--cn-on-surface-muted);
  font-size: 1rem;
  line-height: 1.8;
}

.console-hero__refresh,
.console-readiness__primary,
.console-readiness__secondary {
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

.console-readiness__secondary {
  color: var(--cn-on-surface);
  background: rgb(26 25 25 / 0.92);
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

.console-flow__steps {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.console-step {
  display: grid;
  gap: 1rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1rem;
  background: rgb(26 25 25 / 0.74);
}

.console-step__index {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 999px;
  color: var(--cn-on-surface-muted);
  background: rgb(10 10 10 / 0.5);
  font-family: var(--cn-font-mono);
}

.console-step--done {
  border-color: rgb(143 245 255 / 0.28);
}

.console-step--done .console-step__index {
  color: #041316;
  background: var(--cn-primary);
}

.console-step--active {
  border-color: rgb(195 244 0 / 0.26);
}

.console-step--active .console-step__index {
  color: #304000;
  background: var(--cn-secondary);
}

.console-step--error {
  border-color: rgb(255 113 108 / 0.28);
}

.console-step--error .console-step__index {
  color: #fff;
  background: var(--cn-error);
}

.console-step h3 {
  font-size: 1.05rem;
}

@media (width <= 1280px) {
  .console-page__content {
    max-width: none;
    width: 100%;
    margin-inline: 0;
    padding-inline: 1.75rem;
  }

  .console-readiness,
  .console-flow__steps {
    grid-template-columns: 1fr;
  }

  .console-hero {
    flex-direction: column;
  }
}
</style>
