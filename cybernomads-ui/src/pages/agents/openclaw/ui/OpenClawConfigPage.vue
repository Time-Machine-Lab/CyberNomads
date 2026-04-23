<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  getCurrentAgentService,
  getCurrentAgentServiceStatus,
  prepareCurrentAgentServiceCapabilities,
  saveOpenClawConfig,
  toRecoverableAgentServiceError,
  verifyCurrentAgentServiceConnection,
} from '@/entities/agent/api/agent-service'
import type {
  AgentServiceCapabilityStatus,
  AgentServiceConnectionStatus,
  CurrentAgentServiceDto,
  OpenClawSetupFormInput,
} from '@/entities/agent/model/types'
import { formatDateTime } from '@/shared/lib/format'

const route = useRoute()

const isLoading = ref(true)
const isSaving = ref(false)
const isVerifying = ref(false)
const isPreparing = ref(false)
const currentService = ref<CurrentAgentServiceDto | null>(null)
const hasCurrentService = ref(false)
const connectionStatus = ref<AgentServiceConnectionStatus>('not_configured')
const capabilityStatus = ref<AgentServiceCapabilityStatus>('not_ready')
const resultLogs = ref<string[]>([])
const formError = ref('')
const actionError = ref('')
const replaceCredential = ref(false)

const form = reactive<OpenClawSetupFormInput>({
  endpointUrl: '',
  authenticationKind: 'token',
  secret: '',
})

const backTo = computed(() => String(route.meta.backTo ?? '/console'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回控制台'))

const canVerify = computed(() => hasCurrentService.value && !isSaving.value && !isVerifying.value)
const canPrepare = computed(() => connectionStatus.value === 'connected' && !isPreparing.value && !isSaving.value)
const needsSecret = computed(() => !hasCurrentService.value || replaceCredential.value)

const statusTitle = computed(() => {
  if (!hasCurrentService.value) return '尚未创建当前 Agent 服务'
  if (connectionStatus.value === 'connection_failed') return '连接测试失败'
  if (connectionStatus.value === 'pending_verification') return '等待显式连接测试'
  if (capabilityStatus.value === 'prepare_failed') return '能力准备失败'
  if (capabilityStatus.value === 'ready') return '能力准备完成'
  if (connectionStatus.value === 'connected') return '连接可用，等待能力准备'
  return '当前 Agent 服务状态'
})

const statusDescription = computed(() => {
  if (!hasCurrentService.value) {
    return '填写 OpenClaw endpoint、认证方式和密钥后保存，系统会创建当前唯一 Agent 服务。'
  }

  if (connectionStatus.value === 'connection_failed') {
    return currentService.value?.connectionStatusReason ?? '最近一次连接测试失败，请检查端点与凭据后重试。'
  }

  if (connectionStatus.value === 'pending_verification') {
    return '配置已保存，但还没有完成显式连接测试。当前状态不会被视为可用服务。'
  }

  if (capabilityStatus.value === 'prepare_failed') {
    return currentService.value?.capabilityStatusReason ?? '服务连接已可用，但 CyberNomads 能力准备失败，请继续重试准备。'
  }

  if (capabilityStatus.value === 'ready') {
    return 'OpenClaw 已连接且能力准备完成。你可以返回控制台继续后续业务配置。'
  }

  return '当前 OpenClaw 已通过连接测试，可以继续准备 CyberNomads 所需能力。'
})

const timelineItems = computed(() => [
  {
    label: '保存配置',
    value: hasCurrentService.value ? '已创建当前服务' : '未开始',
  },
  {
    label: '连接测试',
    value:
      connectionStatus.value === 'connected'
        ? '通过'
        : connectionStatus.value === 'connection_failed'
          ? '失败'
          : connectionStatus.value === 'pending_verification'
            ? '待执行'
            : '未开始',
  },
  {
    label: '能力准备',
    value:
      capabilityStatus.value === 'ready'
        ? '完成'
        : capabilityStatus.value === 'prepare_failed'
          ? '失败'
          : capabilityStatus.value === 'preparing'
            ? '进行中'
            : '待执行',
  },
])

function appendLog(entry: string) {
  resultLogs.value = [entry, ...resultLogs.value].slice(0, 8)
}

function readErrorMessage(payload: unknown) {
  if (!payload || typeof payload !== 'object') {
    return null
  }

  const candidate = (payload as { message?: unknown; reason?: unknown }).message ?? (payload as { reason?: unknown }).reason
  return typeof candidate === 'string' ? candidate : null
}

function syncFromService(service: CurrentAgentServiceDto | null) {
  currentService.value = service
  hasCurrentService.value = Boolean(service)
  connectionStatus.value = service?.connectionStatus ?? 'not_configured'
  capabilityStatus.value = service?.capabilityStatus ?? 'not_ready'

  if (!service) {
    form.endpointUrl = ''
    form.authenticationKind = 'token'
    form.secret = ''
    replaceCredential.value = true
    return
  }

  form.endpointUrl = service.endpointUrl
  form.authenticationKind = service.authenticationKind
  form.secret = ''
  replaceCredential.value = !service.hasCredential
}

async function loadServiceState() {
  isLoading.value = true
  formError.value = ''
  actionError.value = ''

  try {
    const [status, service] = await Promise.all([getCurrentAgentServiceStatus(), getCurrentAgentService()])

    connectionStatus.value = status.connectionStatus
    capabilityStatus.value = status.capabilityStatus
    hasCurrentService.value = status.hasCurrentService
    syncFromService(service)

    if (status.warning) {
      appendLog(`[STATUS] ${status.warning}`)
    }
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? recoverable.message
    appendLog(`[ERROR] ${actionError.value}`)
  } finally {
    isLoading.value = false
  }
}

function validateForm() {
  if (!form.endpointUrl.trim()) {
    return '请输入 OpenClaw endpoint URL。'
  }

  try {
    new URL(form.endpointUrl.trim())
  } catch {
    return 'endpoint URL 格式无效，请输入完整的 http(s) 地址。'
  }

  if (!form.authenticationKind.trim()) {
    return '请输入认证方式。'
  }

  if (hasCurrentService.value && !replaceCredential.value) {
    return '当前后端更新契约要求提交新的 secret。请勾选“本次更新同时替换凭据”并输入新密钥后再保存。'
  }

  if (needsSecret.value && !form.secret.trim()) {
    return hasCurrentService.value ? '更新配置时如需提交，需要输入新的密钥。' : '首次创建当前 Agent 服务时必须输入密钥。'
  }

  return ''
}

async function handleSave() {
  formError.value = validateForm()
  actionError.value = ''

  if (formError.value) {
    return
  }

  isSaving.value = true

  try {
    const saved = await saveOpenClawConfig({
      endpointUrl: form.endpointUrl.trim(),
      authenticationKind: form.authenticationKind.trim(),
      secret: form.secret.trim(),
    })

    syncFromService(saved)
    appendLog(`[SAVE] 已保存当前服务配置，connection=${saved.connectionStatus} capability=${saved.capabilityStatus}`)
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)

    if (recoverable.status === 409) {
      actionError.value = '当前服务已存在，已切换为读取最新状态。请确认后继续更新。'
      appendLog('[SAVE] 检测到 409 冲突，已刷新当前服务状态。')
      await loadServiceState()
      return
    }

    formError.value = readErrorMessage(recoverable.payload) ?? recoverable.message
    appendLog(`[SAVE] ${formError.value}`)
  } finally {
    isSaving.value = false
  }
}

async function handleVerify() {
  actionError.value = ''
  isVerifying.value = true

  try {
    const result = await verifyCurrentAgentServiceConnection()

    connectionStatus.value = result.connectionStatus
    appendLog(`[VERIFY] connection=${result.connectionStatus} verifiedAt=${formatDateTime(result.verifiedAt)}`)
    if (result.reason) {
      appendLog(`[VERIFY] ${result.reason}`)
    }

    await loadServiceState()
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? recoverable.message
    appendLog(`[VERIFY] ${actionError.value}`)
  } finally {
    isVerifying.value = false
  }
}

async function handlePrepare() {
  actionError.value = ''
  isPreparing.value = true

  try {
    const result = await prepareCurrentAgentServiceCapabilities()

    capabilityStatus.value = result.capabilityStatus
    appendLog(`[PROVISION] capability=${result.capabilityStatus} preparedAt=${result.preparedAt ? formatDateTime(result.preparedAt) : '未完成'}`)
    if (result.reason) {
      appendLog(`[PROVISION] ${result.reason}`)
    }

    await loadServiceState()
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? recoverable.message
    appendLog(`[PROVISION] ${actionError.value}`)
  } finally {
    isPreparing.value = false
  }
}

onMounted(loadServiceState)
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
            <p class="openclaw-header__eyebrow">Focused Setup</p>
            <h1>OpenClaw 当前服务配置</h1>
            <p>本页只处理当前唯一 Agent 服务的创建、更新、连接测试与能力准备，不提供多服务切换或故障转移控制。</p>
          </div>

          <div class="openclaw-header__status">
            <span class="openclaw-header__status-dot" :class="`openclaw-header__status-dot--${connectionStatus}`" />
            <span>{{ statusTitle }}</span>
          </div>
        </header>

        <div class="openclaw-grid">
          <section class="openclaw-card openclaw-card--form">
            <div class="openclaw-card__header">
              <h2>
                <span class="material-symbols-outlined">tune</span>
                <span>服务配置</span>
              </h2>
              <span class="openclaw-card__meta">{{ hasCurrentService ? 'Update Current Service' : 'Create Current Service' }}</span>
            </div>

            <div class="openclaw-fields">
              <label class="openclaw-field">
                <span>Endpoint URL</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">link</span>
                  <input v-model="form.endpointUrl" type="text" placeholder="http://localhost:5111" />
                </div>
              </label>

              <label class="openclaw-field">
                <span>认证方式</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">key</span>
                  <input v-model="form.authenticationKind" type="text" placeholder="token" />
                </div>
              </label>

              <div v-if="hasCurrentService" class="openclaw-credential-hint">
                <span class="material-symbols-outlined">verified_user</span>
                <span>
                  {{
                    currentService?.hasCredential
                      ? '后端已保存当前凭据。默认不会回填密钥，只有在需要替换凭据时才输入新的 secret。'
                      : '当前服务尚未检测到已保存凭据，更新时需要补充新的 secret。'
                  }}
                </span>
              </div>

              <label v-if="hasCurrentService" class="openclaw-toggle">
                <input v-model="replaceCredential" type="checkbox" />
                <span>本次更新同时替换凭据</span>
              </label>

              <label class="openclaw-field">
                <span>{{ needsSecret ? 'Secret' : 'Secret（更新前请先确认替换凭据）' }}</span>
                <div class="openclaw-input">
                  <span class="material-symbols-outlined">password</span>
                  <input v-model="form.secret" type="password" placeholder="输入新的认证密钥" />
                </div>
              </label>
            </div>

            <p v-if="formError" class="openclaw-error">{{ formError }}</p>
            <p v-if="actionError" class="openclaw-error openclaw-error--soft">{{ actionError }}</p>

            <div class="openclaw-actions">
              <button type="button" class="openclaw-actions__button openclaw-actions__button--primary" :disabled="isSaving || isLoading" @click="handleSave">
                <span class="material-symbols-outlined">save</span>
                <span>{{ isSaving ? '保存中' : hasCurrentService ? '更新当前服务' : '创建当前服务' }}</span>
              </button>
              <button type="button" class="openclaw-actions__button" :disabled="isLoading" @click="loadServiceState">
                <span class="material-symbols-outlined">refresh</span>
                <span>重新读取状态</span>
              </button>
            </div>
          </section>

          <section class="openclaw-card openclaw-card--status">
            <div class="openclaw-card__header">
              <h2>
                <span class="material-symbols-outlined">radar</span>
                <span>状态推进</span>
              </h2>
              <span class="openclaw-card__meta">{{ hasCurrentService ? 'Current Active Service' : 'Pending Creation' }}</span>
            </div>

            <div class="openclaw-summary">
              <h3>{{ statusTitle }}</h3>
              <p>{{ statusDescription }}</p>
            </div>

            <div class="openclaw-timeline">
              <div v-for="item in timelineItems" :key="item.label" class="openclaw-timeline__item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <div class="openclaw-status-actions">
              <button type="button" class="openclaw-actions__button openclaw-actions__button--signal" :disabled="!canVerify || isLoading" @click="handleVerify">
                <span class="material-symbols-outlined">network_ping</span>
                <span>{{ isVerifying ? '测试中' : '测试连接' }}</span>
              </button>
              <button type="button" class="openclaw-actions__button openclaw-actions__button--secondary" :disabled="!canPrepare || isLoading" @click="handlePrepare">
                <span class="material-symbols-outlined">deployed_code</span>
                <span>{{ isPreparing ? '准备中' : '准备能力' }}</span>
              </button>
            </div>

            <div class="openclaw-snapshot">
              <div class="openclaw-snapshot__item">
                <span>连接状态</span>
                <strong>{{ connectionStatus }}</strong>
              </div>
              <div class="openclaw-snapshot__item">
                <span>能力状态</span>
                <strong>{{ capabilityStatus }}</strong>
              </div>
              <div class="openclaw-snapshot__item">
                <span>最近连接测试</span>
                <strong>{{ currentService?.lastVerifiedAt ? formatDateTime(currentService.lastVerifiedAt) : '尚未测试' }}</strong>
              </div>
              <div class="openclaw-snapshot__item">
                <span>最近能力准备</span>
                <strong>{{ currentService?.capabilityPreparedAt ? formatDateTime(currentService.capabilityPreparedAt) : '尚未准备' }}</strong>
              </div>
            </div>
          </section>
        </div>

        <section class="openclaw-card openclaw-card--logs">
          <div class="openclaw-card__header">
            <h2>
              <span class="material-symbols-outlined">terminal</span>
              <span>结果与诊断</span>
            </h2>
            <span class="openclaw-card__meta">Connection vs Capability</span>
          </div>

          <div class="openclaw-logs">
            <div v-if="resultLogs.length" class="openclaw-logs__list">
              <div v-for="entry in resultLogs" :key="entry" class="openclaw-logs__entry">{{ entry }}</div>
            </div>
            <div v-else class="openclaw-logs__empty">
              <p>保存配置后，请先执行“测试连接”。连接成功仅表示服务可用；“准备能力”完成后才表示 CyberNomads 所需能力准备完成。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.openclaw-page {
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top right, rgb(143 245 255 / 0.08), transparent 28rem),
    linear-gradient(180deg, #090909 0%, #0d0d0d 36%, #090909 100%);
}

.openclaw-main {
  min-width: 0;
}

.openclaw-canvas {
  max-width: 86rem;
  padding: 2rem;
  margin: 0 auto;
}

.openclaw-context {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: var(--cn-on-surface-muted);
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

.openclaw-header {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.75rem;
}

.openclaw-header__eyebrow {
  margin: 0 0 0.75rem;
  color: var(--cn-primary);
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.openclaw-header h1,
.openclaw-card h2,
.openclaw-summary h3 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.openclaw-header h1 {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
  letter-spacing: -0.05em;
}

.openclaw-header p:not(.openclaw-header__eyebrow) {
  max-width: 44rem;
  margin: 0.8rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.openclaw-header__status {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  align-self: flex-start;
  min-height: 2.7rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: rgb(19 19 19 / 0.82);
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
}

.openclaw-header__status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: var(--cn-on-surface-muted);
}

.openclaw-header__status-dot--connected {
  background: var(--cn-primary);
  box-shadow: 0 0 10px rgb(143 245 255 / 0.8);
}

.openclaw-header__status-dot--pending_verification {
  background: var(--cn-secondary);
  box-shadow: 0 0 10px rgb(195 244 0 / 0.6);
}

.openclaw-header__status-dot--connection_failed,
.openclaw-header__status-dot--not_configured {
  background: var(--cn-error);
  box-shadow: 0 0 10px rgb(255 113 108 / 0.55);
}

.openclaw-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(22rem, 0.9fr);
  gap: 1.5rem;
}

.openclaw-card {
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1.1rem;
  background:
    linear-gradient(135deg, rgb(143 245 255 / 0.04), transparent 32%),
    rgb(19 19 19 / 0.84);
}

.openclaw-card--logs {
  margin-top: 1.5rem;
}

.openclaw-card__header,
.openclaw-actions,
.openclaw-status-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.openclaw-card__header {
  margin-bottom: 1.2rem;
}

.openclaw-card h2 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 1.15rem;
  font-weight: 700;
}

.openclaw-card h2 .material-symbols-outlined {
  color: var(--cn-primary);
}

.openclaw-card__meta {
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.openclaw-fields {
  display: grid;
  gap: 1.1rem;
}

.openclaw-field {
  display: grid;
  gap: 0.45rem;
}

.openclaw-field > span {
  color: var(--cn-on-surface-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.openclaw-input {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 0.8rem;
  background: rgb(10 10 10 / 0.4);
  color: var(--cn-on-surface-muted);
}

.openclaw-input:focus-within {
  border-color: rgb(143 245 255 / 0.28);
}

.openclaw-input input {
  width: 100%;
  border: 0;
  color: var(--cn-on-surface);
  background: transparent;
  font-family: var(--cn-font-mono);
  outline: 0;
}

.openclaw-credential-hint,
.openclaw-toggle {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.85rem;
  background: rgb(10 10 10 / 0.28);
  color: var(--cn-on-surface-muted);
  font-size: 0.84rem;
  line-height: 1.7;
}

.openclaw-toggle input {
  margin-top: 0.2rem;
}

.openclaw-actions {
  margin-top: 1.5rem;
}

.openclaw-actions__button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  min-height: 2.85rem;
  padding: 0 1rem;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 0.75rem;
  color: var(--cn-on-surface);
  background: rgb(26 25 25 / 0.8);
  font-family: var(--cn-font-body);
  font-weight: 700;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.openclaw-actions__button:hover {
  border-color: rgb(143 245 255 / 0.26);
  background: rgb(32 31 31 / 0.95);
}

.openclaw-actions__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.openclaw-actions__button--primary {
  color: #041316;
  background: var(--cn-primary);
}

.openclaw-actions__button--signal {
  color: #314000;
  background: var(--cn-secondary);
}

.openclaw-actions__button--secondary {
  color: var(--cn-primary);
}

.openclaw-error {
  margin: 1rem 0 0;
  color: var(--cn-error);
  font-size: 0.86rem;
  line-height: 1.7;
}

.openclaw-error--soft {
  color: #ffb3b0;
}

.openclaw-summary {
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.9rem;
  background: rgb(10 10 10 / 0.3);
}

.openclaw-summary h3 {
  font-size: 1.4rem;
  font-weight: 800;
}

.openclaw-summary p {
  margin: 0.7rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.openclaw-timeline,
.openclaw-snapshot {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.openclaw-timeline__item,
.openclaw-snapshot__item {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.8rem;
  background: rgb(26 25 25 / 0.7);
}

.openclaw-timeline__item span,
.openclaw-snapshot__item span {
  color: var(--cn-on-surface-muted);
  font-size: 0.8rem;
}

.openclaw-timeline__item strong,
.openclaw-snapshot__item strong {
  font-family: var(--cn-font-mono);
  font-size: 0.84rem;
}

.openclaw-status-actions {
  margin-top: 1rem;
}

.openclaw-status-actions .openclaw-actions__button {
  flex: 1;
}

.openclaw-logs {
  min-height: 14rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.95rem;
  background: rgb(10 10 10 / 0.42);
}

.openclaw-logs__list {
  display: grid;
  gap: 0.6rem;
}

.openclaw-logs__entry {
  padding: 0.85rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.12);
  border-radius: 0.8rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
  line-height: 1.75;
  background: rgb(26 25 25 / 0.65);
}

.openclaw-logs__empty p {
  margin: 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.9;
}

@media (width <= 1180px) {
  .openclaw-canvas {
    padding-inline: 1.5rem;
  }

  .openclaw-header,
  .openclaw-grid,
  .openclaw-actions,
  .openclaw-status-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .openclaw-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
