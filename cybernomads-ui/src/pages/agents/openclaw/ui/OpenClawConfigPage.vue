<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { listAgentNodes, saveOpenClawConfig } from '@/entities/agent/api/agent-service'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()
const isSaving = ref(false)
const diagnosticsStatus = ref<'awaiting' | 'connected' | 'offline'>('awaiting')
const diagnosticsLogs = ref<string[]>([])
const defaultDiagnosticsLogs = [
  '[SYS] 正在初始化诊断模块... O.K.',
  '[SYS] 加载核心参数集... O.K.',
  '[SYS] 验证安装路径... VALID',
  '[SYS] 解析网关地址... RESOLVED',
  '[SYS] 准备安全套接字层...',
  '[SYS] 等待握手请求...',
]

const form = reactive({
  id: '',
  name: 'OpenClaw V1.2',
  endpoint: 'http://localhost:5111',
  notes: '所有核心节点运行正常。准备执行调度。',
  installPath: '/opt/cybernomads/openclaw',
  gatewayUrl: 'wss://gateway.eu-central.cybernomads.net:8443',
  authToken: 'sk-oc-981273981273912873',
  parallelLimit: 8,
})

const diagnosticsLabel = computed(() => {
  if (diagnosticsStatus.value === 'connected') return 'CONNECTED'
  if (diagnosticsStatus.value === 'offline') return 'OFFLINE'
  return 'AWAITING_TEST'
})
const backTo = computed(() => String(route.meta.backTo ?? '/console'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回控制台'))

watch(
  mockScenarioId,
  async () => {
    const nodes = await listAgentNodes()
    const existing = nodes.find((node) => node.type === 'openclaw')

    if (!existing) {
      diagnosticsStatus.value = 'offline'
      diagnosticsLogs.value = ['[SYS] 未检测到活动节点。等待初始化…']
      return
    }

    form.id = existing.id
    form.name = existing.name
    form.endpoint = existing.endpoint || form.endpoint
    form.notes = existing.notes
    form.installPath = existing.config?.installPath ?? form.installPath
    form.gatewayUrl = existing.config?.gatewayUrl ?? form.gatewayUrl
    form.authToken = existing.config?.authToken ?? form.authToken
    form.parallelLimit = existing.config?.parallelLimit ?? form.parallelLimit

    if (existing.config?.diagnosticsStatus === 'offline') {
      diagnosticsStatus.value = 'offline'
      diagnosticsLogs.value = ['[SYS] 未检测到活动节点。等待初始化…']
      return
    }

    diagnosticsStatus.value = 'awaiting'
    diagnosticsLogs.value = [...defaultDiagnosticsLogs]
  },
  { immediate: true },
)

function runDiagnostics() {
  diagnosticsStatus.value = 'connected'
  diagnosticsLogs.value = [
    '[SYS] 正在初始化握手序列…',
    '[SYS] Establishing secure socket via gateway… O.K.',
    '[AUTH] Validating existing token signature…',
    '[AUTH] Token validated successfully. Session ready.',
    '[DATA] Profile sync complete. Metadata loaded.',
    '[SYS] Heartbeat ping… OK (24ms)',
  ]
}

async function handleSave() {
  isSaving.value = true

  try {
    await saveOpenClawConfig({
      id: form.id || undefined,
      name: form.name,
      endpoint: form.endpoint,
      notes: form.notes,
      installPath: form.installPath,
      gatewayUrl: form.gatewayUrl,
      authToken: form.authToken,
      parallelLimit: form.parallelLimit,
    })

    await router.push('/console')
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="openclaw-page">
    <main class="openclaw-main">
      <div class="openclaw-canvas">
        <div class="openclaw-context">
          <RouterLink :to="backTo" class="openclaw-context__back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ backLabel }}</span>
          </RouterLink>
          <span class="openclaw-context__crumb">/ 控制台 / OpenClaw 配置</span>
        </div>

        <header class="openclaw-header">
          <div>
            <h1>OpenClaw 代理配置</h1>
            <p>配置并校准 OpenClaw 节点以连接 CyberNomads 核心网络。</p>
          </div>

          <div class="openclaw-header__status">
            <span class="openclaw-header__status-dot" :class="`openclaw-header__status-dot--${diagnosticsStatus}`" />
            <span>{{ diagnosticsStatus === 'connected' ? '节点在线' : '节点离线' }}</span>
          </div>
        </header>

        <div class="openclaw-grid">
          <section class="openclaw-card">
            <h2>
              <span class="material-symbols-outlined">tune</span>
              <span>核心参数</span>
            </h2>

            <div class="openclaw-fields">
              <label class="openclaw-field">
                <span>安装路径</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">folder_open</span>
                  <input v-model="form.installPath" type="text" placeholder="输入绝对路径" />
                </div>
              </label>

              <label class="openclaw-field">
                <span>网关 URL</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">router</span>
                  <input v-model="form.gatewayUrl" type="text" placeholder="wss://..." />
                </div>
              </label>

              <label class="openclaw-field">
                <span>API 密钥 (Auth Token)</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">key</span>
                  <input v-model="form.authToken" type="password" placeholder="输入密钥" />
                  <button type="button">
                    <span class="material-symbols-outlined">visibility</span>
                  </button>
                </div>
              </label>

              <div class="openclaw-field openclaw-slider">
                <div class="openclaw-slider__top">
                  <span>并行任务限制</span>
                  <strong>{{ form.parallelLimit.toString().padStart(2, '0') }}</strong>
                </div>
                <input v-model.number="form.parallelLimit" min="1" max="24" type="range" />
                <div class="openclaw-slider__scale">
                  <span>01</span>
                  <span>24</span>
                </div>
              </div>
            </div>

            <footer class="openclaw-actions">
              <button type="button" class="openclaw-actions__button openclaw-actions__button--primary" :disabled="isSaving" @click="handleSave">
                <span class="material-symbols-outlined">save</span>
                <span>{{ isSaving ? '保存中…' : '保存配置' }}</span>
              </button>
              <button type="button" class="openclaw-actions__button" @click="runDiagnostics">重置默认</button>
            </footer>
          </section>

          <section class="openclaw-card openclaw-card--diagnostics">
            <div class="openclaw-diagnostics__top">
              <h2>
                <span class="material-symbols-outlined">radar</span>
                <span>实时诊断</span>
              </h2>
              <span class="openclaw-diagnostics__badge">{{ diagnosticsLabel }}</span>
            </div>

            <div class="openclaw-diagnostics__radar-stage">
              <div class="openclaw-radar">
                <div class="openclaw-radar__outer" />
                <div class="openclaw-radar__middle" />
                <div class="openclaw-radar__inner" />
                <div class="openclaw-radar__sweep" />
                <div class="openclaw-radar__dot" />
                <div class="openclaw-radar__cross openclaw-radar__cross--horizontal" />
                <div class="openclaw-radar__cross openclaw-radar__cross--vertical" />
                <div class="openclaw-radar__signal openclaw-radar__signal--a" />
                <div class="openclaw-radar__signal openclaw-radar__signal--b" />
              </div>

              <button type="button" class="openclaw-diagnostics__button" @click="runDiagnostics">
                <span class="material-symbols-outlined">network_ping</span>
                <span>测试连接</span>
              </button>
            </div>

            <div class="openclaw-console">
              <div class="openclaw-console__body">
                <div v-for="entry in diagnosticsLogs" :key="entry">{{ entry }}</div>
                <template v-if="!diagnosticsLogs.length">
                  <div v-for="entry in defaultDiagnosticsLogs" :key="entry">{{ entry }}</div>
                </template>
                <div class="openclaw-console__divider" />
                <div class="openclaw-console__hint">
                  <span>&gt;</span>
                  <span>点击 "测试连接" 启动网关校验序列。</span>
                </div>
                <div class="openclaw-console__hint">
                  <span>&gt;</span>
                  <span>序列将验证令牌授权并测试延迟。</span>
                </div>
              </div>
            </div>
          </section>
        </div>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.openclaw-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.openclaw-hidden-save {
  position: fixed;
  top: -10000px;
  left: -10000px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
}

.openclaw-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  display: none;
  flex-direction: column;
  width: 16rem;
  padding: 1.5rem 0.75rem;
  background: #131313;
}

.openclaw-sidebar__brand {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0 0.75rem;
  margin-bottom: 2rem;
}

.openclaw-sidebar__mark {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #262626;
}

.openclaw-sidebar__mark img {
  width: 100%;
  height: 100%;
}

.openclaw-sidebar__brand h2,
.openclaw-sidebar__brand p {
  margin: 0;
}

.openclaw-sidebar__brand h2 {
  color: #00f0ff;
  font-family: var(--cn-font-display);
  font-size: 1.05rem;
  font-weight: 900;
  letter-spacing: 0.16em;
}

.openclaw-sidebar__brand p {
  color: #00deec;
  font-size: 0.74rem;
}

.openclaw-sidebar__nav,
.openclaw-sidebar__footer {
  display: grid;
  gap: 0.25rem;
}

.openclaw-sidebar__nav {
  flex: 1;
}

.openclaw-sidebar__link {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.9rem 1rem;
  border-radius: 0.5rem;
  color: #adaaaa;
  font-size: 0.88rem;
  transition: background-color 180ms ease, color 180ms ease;
}

.openclaw-sidebar__link:hover {
  color: #00f0ff;
  background: #1a1919;
}

.openclaw-sidebar__link--active {
  color: #00f0ff;
  background: #262626;
  border-left: 4px solid #00f0ff;
}

.openclaw-sidebar__cta {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(143 245 255 / 0.3);
  padding: 0.75rem 1rem;
  margin: 0.5rem 0.75rem 1.25rem;
  border-radius: 0.6rem;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.1);
  font-family: var(--cn-font-display);
  font-size: 0.75rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.openclaw-main {
  flex: 1;
  min-width: 0;
}

.openclaw-context {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: #adaaaa;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
}

.openclaw-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.4rem;
  padding: 0 0.85rem;
  border: 1px solid rgb(72 72 71 / 0.25);
  border-radius: 999px;
  background: rgb(19 19 19 / 0.82);
  transition:
    border-color var(--cn-transition),
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.openclaw-context__back:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.26);
  background: rgb(32 31 31 / 0.92);
}

.openclaw-context__crumb {
  color: var(--cn-on-surface-muted);
}

.openclaw-topbar {
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

.openclaw-topbar__crumbs,
.openclaw-topbar__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.openclaw-topbar__crumbs {
  color: #adaaaa;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
}

.openclaw-topbar__actions {
  color: #adaaaa;
}

.openclaw-topbar__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.openclaw-topbar__actions button:hover {
  color: #8ff5ff;
}

.openclaw-topbar__actions img {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
}

.openclaw-canvas {
  max-width: 82rem;
  padding: 2rem 2rem 3rem;
  margin: 0 auto;
}

.openclaw-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  margin-bottom: 2rem;
}

.openclaw-header h1,
.openclaw-card h2 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.openclaw-header h1 {
  font-size: clamp(2rem, 4vw, 2.8rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.openclaw-header p {
  margin: 0.4rem 0 0;
  color: #adaaaa;
}

.openclaw-header__status {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  align-self: flex-start;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #201f1f;
  font-size: 0.78rem;
}

.openclaw-header__status-dot {
  width: 0.45rem;
  height: 0.45rem;
  border-radius: 999px;
}

.openclaw-header__status-dot--connected {
  background: #8ff5ff;
  box-shadow: 0 0 8px rgb(143 245 255 / 0.8);
}

.openclaw-header__status-dot--offline,
.openclaw-header__status-dot--awaiting {
  background: #767575;
}

.openclaw-grid {
  display: grid;
  gap: 1.5rem;
}

.openclaw-card {
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
}

.openclaw-card::before {
  position: absolute;
  inset: 0;
  content: '';
  opacity: 0;
  pointer-events: none;
  background: linear-gradient(135deg, rgb(143 245 255 / 0.05), transparent);
  transition: opacity 180ms ease;
}

.openclaw-card:hover::before {
  opacity: 1;
}

.openclaw-card h2 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: #8ff5ff;
  font-size: 1.15rem;
  font-weight: 700;
}

.openclaw-fields {
  display: grid;
  gap: 1.25rem;
}

.openclaw-field {
  display: grid;
  gap: 0.45rem;
}

.openclaw-field > span,
.openclaw-slider__top span {
  color: #adaaaa;
  font-size: 0.78rem;
  font-weight: 500;
}

.openclaw-input {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  padding-bottom: 0.4rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.35);
  color: #767575;
}

.openclaw-input:focus-within {
  border-color: #8ff5ff;
}

.openclaw-input input {
  width: 100%;
  border: 0;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-mono);
  outline: 0;
}

.openclaw-input button {
  border: 0;
  color: #767575;
  background: transparent;
}

.openclaw-slider__top,
.openclaw-slider__scale,
.openclaw-actions,
.openclaw-diagnostics__top {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
}

.openclaw-slider__top strong {
  color: #8ff5ff;
  font-family: var(--cn-font-mono);
}

.openclaw-slider input {
  width: 100%;
}

.openclaw-slider__scale {
  color: #767575;
  font-family: var(--cn-font-mono);
  font-size: 0.7rem;
}

.openclaw-actions {
  margin-top: 1.75rem;
  padding-top: 1.25rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.openclaw-actions__button,
.openclaw-diagnostics__button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.62rem 1.05rem;
  border-radius: 0.35rem;
  color: #8ff5ff;
  background: transparent;
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 500;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.openclaw-actions__button:hover,
.openclaw-diagnostics__button:hover {
  border-color: rgb(143 245 255 / 0.24);
  background: #201f1f;
}

.openclaw-actions__button--primary {
  color: #005d63;
  background: #8ff5ff;
  border-color: rgb(143 245 255 / 0.24);
  font-weight: 600;
}

.openclaw-actions__button--primary:hover {
  color: #005d63;
  background: #8ff5ff;
  box-shadow: 0 0 18px rgb(143 245 255 / 0.24);
}

.openclaw-card--diagnostics {
  display: grid;
  grid-template-rows: auto minmax(9.5rem, auto) minmax(20rem, 1fr);
  gap: 1rem;
  min-height: 36rem;
}

.openclaw-diagnostics__badge {
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.2rem 0.5rem;
  border-radius: 0.25rem;
  color: #767575;
  background: #0e0e0e;
  font-family: var(--cn-font-mono);
  font-size: 0.62rem;
  letter-spacing: 0.1em;
}

.openclaw-diagnostics__radar-stage {
  position: relative;
  display: flex;
  flex-direction: column;
  align-items: center;
  justify-content: center;
  min-height: 9.5rem;
  padding: 0.1rem 0 1rem;
}

.openclaw-radar {
  position: relative;
  width: 6.9rem;
  height: 6.9rem;
  margin: 0 auto;
}

.openclaw-radar__outer,
.openclaw-radar__middle,
.openclaw-radar__inner,
.openclaw-radar__cross,
.openclaw-radar__signal,
.openclaw-radar__dot {
  position: absolute;
}

.openclaw-radar__outer,
.openclaw-radar__middle,
.openclaw-radar__inner {
  inset: 0;
  border-radius: 999px;
}

.openclaw-radar__outer {
  border: 1px dashed rgb(72 72 71 / 0.5);
  animation: spin-slow 8s linear infinite;
}

.openclaw-radar__middle {
  inset: 0.5rem;
  border: 1px solid rgb(143 245 255 / 0.2);
}

.openclaw-radar__inner {
  inset: 1.2rem;
  border: 1px solid rgb(143 245 255 / 0.4);
  background: rgb(143 245 255 / 0.05);
}

.openclaw-radar__sweep {
  position: absolute;
  inset: 0;
  overflow: hidden;
  border-radius: 999px;
}

.openclaw-radar__sweep::before {
  position: absolute;
  inset: 0;
  content: '';
  background: linear-gradient(90deg, transparent, rgb(143 245 255 / 0.18));
  transform-origin: center;
  animation: spin-slow 4s linear infinite;
}

.openclaw-radar__dot {
  top: 50%;
  left: 50%;
  width: 0.52rem;
  height: 0.52rem;
  border-radius: 999px;
  background: #8ff5ff;
  box-shadow: 0 0 12px rgb(143 245 255 / 1);
  transform: translate(-50%, -50%);
}

.openclaw-radar__dot::after {
  position: absolute;
  inset: 0;
  border-radius: 999px;
  content: '';
  background: #8ff5ff;
  animation: pulse-ring 2s ease infinite;
}

.openclaw-radar__cross--horizontal {
  top: 50%;
  left: 0;
  width: 100%;
  height: 1px;
  background: rgb(143 245 255 / 0.3);
  transform: translateY(-50%);
}

.openclaw-radar__cross--vertical {
  top: 0;
  left: 50%;
  width: 1px;
  height: 100%;
  background: rgb(143 245 255 / 0.3);
  transform: translateX(-50%);
}

.openclaw-radar__signal {
  width: 0.35rem;
  height: 0.35rem;
  border-radius: 999px;
}

.openclaw-radar__signal--a {
  top: 1rem;
  left: 1rem;
  background: #c3f400;
  box-shadow: 0 0 5px rgb(195 244 0 / 0.8);
}

.openclaw-radar__signal--b {
  right: 1rem;
  bottom: 0.8rem;
  width: 0.4rem;
  height: 0.4rem;
  background: #65afff;
  box-shadow: 0 0 5px rgb(101 175 255 / 0.8);
}

.openclaw-diagnostics__button {
  position: absolute;
  bottom: 0;
  left: 50%;
  justify-self: center;
  color: #455900;
  background: #c3f400;
  border-color: rgb(195 244 0 / 0.24);
  font-weight: 700;
  font-size: 0.78rem;
  letter-spacing: 0.04em;
  transform: translate(-50%, 36%);
}

.openclaw-diagnostics__button:hover {
  color: #455900;
  background: #b7e500;
  border-color: rgb(195 244 0 / 0.24);
  box-shadow: 0 0 18px rgb(195 244 0 / 0.2);
}

.openclaw-console {
  position: relative;
  display: flex;
  min-height: 0;
  overflow: hidden;
  padding: 0.95rem;
  margin-top: 0.35rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 0.35rem;
  background: #0a0a0a;
  color: #7d7b7b;
  font-family: var(--cn-font-mono);
  font-size: 0.74rem;
  line-height: 1.7;
}

.openclaw-console::before,
.openclaw-console::after {
  position: absolute;
  right: 0;
  left: 0;
  z-index: 1;
  height: 1.25rem;
  content: '';
  pointer-events: none;
}

.openclaw-console::before {
  top: 0;
  background: linear-gradient(180deg, #0a0a0a 0%, rgb(10 10 10 / 0) 100%);
}

.openclaw-console::after {
  bottom: 0;
  background: linear-gradient(0deg, #0a0a0a 0%, rgb(10 10 10 / 0) 100%);
}

.openclaw-console__body {
  display: grid;
  flex: 1;
  gap: 0.2rem;
  min-height: 0;
  overflow-y: auto;
  padding-right: 0.35rem;
  opacity: 0.82;
}

.openclaw-console__body::-webkit-scrollbar {
  width: 4px;
}

.openclaw-console__body::-webkit-scrollbar-track {
  background: transparent;
}

.openclaw-console__body::-webkit-scrollbar-thumb {
  background: #262626;
  border-radius: 999px;
}

.openclaw-console__divider {
  margin: 0.85rem 0 0.65rem;
  border-top: 1px dashed rgb(72 72 71 / 0.22);
}

.openclaw-console__hint {
  display: flex;
  gap: 0.55rem;
  color: #00deec;
}

@keyframes pulse-ring {
  0% {
    transform: scale(0.8);
    opacity: 0.5;
  }

  100% {
    transform: scale(1.5);
    opacity: 0;
  }
}

@keyframes spin-slow {
  from {
    transform: rotate(0deg);
  }

  to {
    transform: rotate(360deg);
  }
}

@media (min-width: 1024px) {
  .openclaw-sidebar,
  .openclaw-topbar {
    display: flex;
  }

  .openclaw-canvas {
    padding: 5.5rem 2rem 2rem;
    margin-left: 16rem;
  }

  .openclaw-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }

  .openclaw-grid {
    grid-template-columns: minmax(0, 1.4fr) minmax(20rem, 1fr);
    align-items: start;
  }
}
</style>
