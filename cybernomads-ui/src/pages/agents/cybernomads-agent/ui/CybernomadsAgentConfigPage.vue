<script setup lang="ts">
import { computed, onMounted, reactive, ref } from 'vue'
import { useRoute } from 'vue-router'

import {
  getAgentServiceForPurpose,
  prepareAgentServiceCapabilitiesForPurpose,
  saveCybernomadsAgentLlmConfig,
  toRecoverableAgentServiceError,
  verifyAgentServiceConnectionForPurpose,
} from '@/entities/agent/api/agent-service'
import { validateCybernomadsAgentLlmInput } from '@/entities/agent/model/llm-config'
import type {
  AgentServiceCapabilityStatus,
  AgentServiceConnectionStatus,
  CurrentAgentServiceDto,
  CybernomadsAgentLlmSetupFormInput,
  CybernomadsAgentReasoningEffort,
} from '@/entities/agent/model/types'
import { formatDateTime } from '@/shared/lib/format'

const route = useRoute()
const reasoningOptions: CybernomadsAgentReasoningEffort[] = ['low', 'medium', 'high']

const isLoading = ref(true)
const isSaving = ref(false)
const isVerifying = ref(false)
const isPreparing = ref(false)
const planningService = ref<CurrentAgentServiceDto | null>(null)
const connectionStatus = ref<AgentServiceConnectionStatus>('not_configured')
const capabilityStatus = ref<AgentServiceCapabilityStatus>('not_ready')
const resultLogs = ref<string[]>([])
const formError = ref('')
const actionError = ref('')
const replaceCredential = ref(false)

const form = reactive<CybernomadsAgentLlmSetupFormInput>({
  endpointUrl: '',
  model: '',
  reasoningEffort: 'medium',
  apiKey: '',
})

const backTo = computed(() => String(route.meta.backTo ?? '/console'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回控制台'))
const hasPlanningService = computed(() => Boolean(planningService.value))
const hasExistingCredential = computed(() => Boolean(planningService.value?.hasCredential))
const needsApiKey = computed(() => !hasExistingCredential.value || replaceCredential.value)
const canVerify = computed(() => hasPlanningService.value && !isSaving.value && !isVerifying.value)
const canPrepare = computed(() => connectionStatus.value === 'connected' && !isPreparing.value && !isSaving.value)

const statusTitle = computed(() => {
  if (!hasPlanningService.value) return '尚未配置规划模型'
  if (connectionStatus.value === 'connection_failed') return '连接验证失败'
  if (connectionStatus.value === 'pending_verification') return '等待连接验证'
  if (capabilityStatus.value === 'prepare_failed') return '能力准备失败'
  if (capabilityStatus.value === 'ready') return '规划 / Review 能力已准备'
  if (connectionStatus.value === 'connected') return '连接可用，等待能力准备'
  return 'Cybernomads Agent LLM 状态'
})

const statusDescription = computed(() => {
  if (!hasPlanningService.value) {
    return '配置 GPT-compatible Base URL、模型、推理强度和 API Key，用于任务拆分、Review、修正和拆分报告。'
  }

  if (connectionStatus.value === 'connection_failed') {
    return planningService.value?.connectionStatusReason ?? '最近一次连接验证失败，请检查 Base URL、模型和 API Key 后重试。'
  }

  if (connectionStatus.value === 'pending_verification') {
    return '配置已保存，但还没有完成显式连接验证。保存成功不会直接视为可用于任务拆分。'
  }

  if (capabilityStatus.value === 'prepare_failed') {
    return planningService.value?.capabilityStatusReason ?? '模型连接可用，但规划 / Review 能力准备失败，请修复后重试。'
  }

  if (capabilityStatus.value === 'ready') {
    return 'Cybernomads Agent LLM 已完成连接验证和能力准备，可用于任务拆分与 Review。'
  }

  return '模型供应商已通过连接验证，可以继续准备 Cybernomads Agent 所需能力。'
})

const timelineItems = computed(() => [
  {
    label: '保存配置',
    value: hasPlanningService.value ? '已保存 planning provider' : '未开始',
  },
  {
    label: '连接验证',
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
  if (!payload || typeof payload !== 'object') return null

  const candidate = (payload as { message?: unknown; reason?: unknown }).message ?? (payload as { reason?: unknown }).reason
  return typeof candidate === 'string' ? candidate : null
}

function describeRequestError(status: number, fallback: string) {
  if (status === 400) return '配置参数未通过后端校验，请检查 Base URL、模型、推理强度和 API Key。'
  if (status === 404) return '后端 Agent 服务契约尚未支持 Cybernomads Agent LLM planning provider，请先更新后端契约。'
  if (status === 409) return 'planning provider 已存在或当前状态不允许该操作，请刷新状态后重试。'
  if (status === 0) return `连接后端 Agent 服务失败：${fallback}`
  return fallback
}

function syncFromService(service: CurrentAgentServiceDto | null) {
  planningService.value = service
  connectionStatus.value = service?.connectionStatus ?? 'not_configured'
  capabilityStatus.value = service?.capabilityStatus ?? 'not_ready'

  if (!service) {
    form.endpointUrl = ''
    form.model = ''
    form.reasoningEffort = 'medium'
    form.apiKey = ''
    replaceCredential.value = true
    return
  }

  form.endpointUrl = service.endpointUrl
  form.model = service.model ?? ''
  form.reasoningEffort = (service.reasoningEffort as CybernomadsAgentReasoningEffort | null) ?? 'medium'
  form.apiKey = ''
  replaceCredential.value = !service.hasCredential
}

async function loadServiceState() {
  isLoading.value = true
  formError.value = ''
  actionError.value = ''

  try {
    syncFromService(await getAgentServiceForPurpose('planning'))
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? describeRequestError(recoverable.status, recoverable.message)
    appendLog(`[ERROR] ${actionError.value}`)
  } finally {
    isLoading.value = false
  }
}

function validateForm() {
  return validateCybernomadsAgentLlmInput(form, {
    hasExistingCredential: hasExistingCredential.value,
    replaceCredential: replaceCredential.value,
  })
}

async function handleSave() {
  formError.value = validateForm()
  actionError.value = ''

  if (formError.value) return

  isSaving.value = true

  try {
    const saved = await saveCybernomadsAgentLlmConfig({
      endpointUrl: form.endpointUrl.trim(),
      model: form.model.trim(),
      reasoningEffort: form.reasoningEffort,
      apiKey: form.apiKey.trim(),
    })

    syncFromService(saved)
    appendLog(`[SAVE] planning provider 已保存，connection=${saved.connectionStatus} capability=${saved.capabilityStatus}`)
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    formError.value = readErrorMessage(recoverable.payload) ?? describeRequestError(recoverable.status, recoverable.message)
    appendLog(`[SAVE] ${formError.value}`)

    if (recoverable.status === 409) {
      await loadServiceState()
    }
  } finally {
    isSaving.value = false
  }
}

async function handleVerify() {
  actionError.value = ''
  isVerifying.value = true

  try {
    const result = await verifyAgentServiceConnectionForPurpose('planning')

    connectionStatus.value = result.connectionStatus
    appendLog(`[VERIFY] connection=${result.connectionStatus} verifiedAt=${formatDateTime(result.verifiedAt)}`)
    if (result.reason) appendLog(`[VERIFY] ${result.reason}`)

    await loadServiceState()
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? describeRequestError(recoverable.status, recoverable.message)
    appendLog(`[VERIFY] ${actionError.value}`)
  } finally {
    isVerifying.value = false
  }
}

async function handlePrepare() {
  actionError.value = ''
  isPreparing.value = true

  try {
    const result = await prepareAgentServiceCapabilitiesForPurpose('planning')

    capabilityStatus.value = result.capabilityStatus
    appendLog(`[PROVISION] capability=${result.capabilityStatus} preparedAt=${result.preparedAt ? formatDateTime(result.preparedAt) : '未完成'}`)
    if (result.reason) appendLog(`[PROVISION] ${result.reason}`)

    await loadServiceState()
  } catch (error) {
    const recoverable = toRecoverableAgentServiceError(error)
    actionError.value = readErrorMessage(recoverable.payload) ?? describeRequestError(recoverable.status, recoverable.message)
    appendLog(`[PROVISION] ${actionError.value}`)
  } finally {
    isPreparing.value = false
  }
}

onMounted(loadServiceState)
</script>

<template>
  <section class="cn-agent-page">
    <main class="cn-agent-main">
      <div class="cn-agent-canvas">
        <div class="cn-agent-context">
          <RouterLink :to="backTo" class="cn-agent-context__back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ backLabel }}</span>
          </RouterLink>
          <span class="cn-agent-context__crumb">/ 控制台 / Cybernomads Agent LLM</span>
        </div>

        <header class="cn-agent-header">
          <div>
            <p class="cn-agent-header__eyebrow">Focused Setup</p>
            <h1>Cybernomads Agent LLM 配置</h1>
            <p>本页配置任务拆分 / Review 使用的 planning provider，不承担 OpenClaw 的单任务执行职责。</p>
          </div>

          <div class="cn-agent-header__status">
            <span class="cn-agent-header__status-dot" :class="`cn-agent-header__status-dot--${connectionStatus}`" />
            <span>{{ statusTitle }}</span>
          </div>
        </header>

        <div class="cn-agent-grid">
          <section class="cn-agent-card cn-agent-card--form">
            <div class="cn-agent-card__header">
              <h2>
                <span class="material-symbols-outlined">psychology</span>
                <span>LLM Provider</span>
              </h2>
              <span class="cn-agent-card__meta">{{ hasPlanningService ? 'Update Planning Provider' : 'Create Planning Provider' }}</span>
            </div>

            <div class="cn-agent-fields">
              <label class="cn-agent-field">
                <span>Base URL</span>
                <div class="cn-agent-input">
                  <span class="material-symbols-outlined">link</span>
                  <input v-model="form.endpointUrl" type="text" placeholder="https://api.openai.com/v1" />
                </div>
              </label>

              <label class="cn-agent-field">
                <span>Model</span>
                <div class="cn-agent-input">
                  <span class="material-symbols-outlined">memory</span>
                  <input v-model="form.model" type="text" placeholder="gpt-5.2" />
                </div>
              </label>

              <label class="cn-agent-field">
                <span>Reasoning Effort</span>
                <div class="cn-agent-input">
                  <span class="material-symbols-outlined">tune</span>
                  <select v-model="form.reasoningEffort">
                    <option v-for="option in reasoningOptions" :key="option" :value="option">{{ option }}</option>
                  </select>
                </div>
              </label>

              <div v-if="hasPlanningService" class="cn-agent-credential-hint">
                <span class="material-symbols-outlined">verified_user</span>
                <span>
                  {{
                    hasExistingCredential
                      ? '后端已保存 API Key。页面不会回填明文，也不会提交掩码占位符。'
                      : '当前 planning provider 尚未检测到已保存凭据，更新前需要补充新的 API Key。'
                  }}
                </span>
              </div>

              <label v-if="hasPlanningService" class="cn-agent-toggle">
                <input v-model="replaceCredential" type="checkbox" />
                <span>替换 API Key</span>
              </label>

              <label class="cn-agent-field">
                <span>{{ needsApiKey ? 'API Key' : 'API Key（更新前请先选择替换）' }}</span>
                <div class="cn-agent-input">
                  <span class="material-symbols-outlined">password</span>
                  <input v-model="form.apiKey" type="password" placeholder="输入新的 API Key" />
                </div>
              </label>
            </div>

            <p v-if="formError" class="cn-agent-error">{{ formError }}</p>
            <p v-if="actionError" class="cn-agent-error cn-agent-error--soft">{{ actionError }}</p>

            <div class="cn-agent-actions">
              <button type="button" class="cn-agent-actions__button cn-agent-actions__button--primary" :disabled="isSaving || isLoading" @click="handleSave">
                <span class="material-symbols-outlined">save</span>
                <span>{{ isSaving ? '保存中' : hasPlanningService ? '更新配置' : '创建配置' }}</span>
              </button>
              <button type="button" class="cn-agent-actions__button" :disabled="isLoading" @click="loadServiceState">
                <span class="material-symbols-outlined">refresh</span>
                <span>重新读取状态</span>
              </button>
            </div>
          </section>

          <section class="cn-agent-card cn-agent-card--status">
            <div class="cn-agent-card__header">
              <h2>
                <span class="material-symbols-outlined">radar</span>
                <span>状态推进</span>
              </h2>
              <span class="cn-agent-card__meta">planning / review</span>
            </div>

            <div class="cn-agent-summary">
              <h3>{{ statusTitle }}</h3>
              <p>{{ statusDescription }}</p>
            </div>

            <div class="cn-agent-timeline">
              <div v-for="item in timelineItems" :key="item.label" class="cn-agent-timeline__item">
                <span>{{ item.label }}</span>
                <strong>{{ item.value }}</strong>
              </div>
            </div>

            <div class="cn-agent-status-actions">
              <button type="button" class="cn-agent-actions__button cn-agent-actions__button--signal" :disabled="!canVerify || isLoading" @click="handleVerify">
                <span class="material-symbols-outlined">network_ping</span>
                <span>{{ isVerifying ? '验证中' : '验证连接' }}</span>
              </button>
              <button type="button" class="cn-agent-actions__button cn-agent-actions__button--secondary" :disabled="!canPrepare || isLoading" @click="handlePrepare">
                <span class="material-symbols-outlined">deployed_code</span>
                <span>{{ isPreparing ? '准备中' : '准备能力' }}</span>
              </button>
            </div>

            <div class="cn-agent-snapshot">
              <div class="cn-agent-snapshot__item">
                <span>Provider</span>
                <strong>{{ planningService?.providerCode ?? 'cybernomads-agent' }}</strong>
              </div>
              <div class="cn-agent-snapshot__item">
                <span>Model</span>
                <strong>{{ planningService?.model ?? (form.model || '未配置') }}</strong>
              </div>
              <div class="cn-agent-snapshot__item">
                <span>连接状态</span>
                <strong>{{ connectionStatus }}</strong>
              </div>
              <div class="cn-agent-snapshot__item">
                <span>能力状态</span>
                <strong>{{ capabilityStatus }}</strong>
              </div>
              <div class="cn-agent-snapshot__item">
                <span>最近连接验证</span>
                <strong>{{ planningService?.lastVerifiedAt ? formatDateTime(planningService.lastVerifiedAt) : '尚未验证' }}</strong>
              </div>
              <div class="cn-agent-snapshot__item">
                <span>最近能力准备</span>
                <strong>{{ planningService?.capabilityPreparedAt ? formatDateTime(planningService.capabilityPreparedAt) : '尚未准备' }}</strong>
              </div>
            </div>
          </section>
        </div>

        <section class="cn-agent-card cn-agent-card--logs">
          <div class="cn-agent-card__header">
            <h2>
              <span class="material-symbols-outlined">terminal</span>
              <span>结果与诊断</span>
            </h2>
            <span class="cn-agent-card__meta">Connection vs Capability</span>
          </div>

          <div class="cn-agent-logs">
            <div v-if="resultLogs.length" class="cn-agent-logs__list">
              <div v-for="entry in resultLogs" :key="entry" class="cn-agent-logs__entry">{{ entry }}</div>
            </div>
            <div v-else class="cn-agent-logs__empty">
              <p>保存配置后，请先执行“验证连接”。连接成功后再准备 planning / Review 能力。</p>
            </div>
          </div>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.cn-agent-page {
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top right, rgb(195 244 0 / 0.07), transparent 30rem),
    linear-gradient(180deg, #090909 0%, #0d0d0d 36%, #090909 100%);
}

.cn-agent-main {
  min-width: 0;
}

.cn-agent-canvas {
  max-width: 86rem;
  padding: 2rem;
  margin: 0 auto;
}

.cn-agent-context {
  display: flex;
  gap: 1rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.88rem;
}

.cn-agent-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.4rem;
  padding: 0 0.85rem;
  border: 1px solid rgb(72 72 71 / 0.25);
  border-radius: 0.75rem;
  background: rgb(19 19 19 / 0.82);
}

.cn-agent-context__back:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.26);
  background: rgb(32 31 31 / 0.92);
}

.cn-agent-header {
  display: flex;
  gap: 1.5rem;
  align-items: flex-end;
  justify-content: space-between;
  margin-bottom: 1.75rem;
}

.cn-agent-header__eyebrow {
  margin: 0 0 0.75rem;
  color: var(--cn-secondary);
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.cn-agent-header h1,
.cn-agent-card h2,
.cn-agent-summary h3 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.cn-agent-header h1 {
  font-size: clamp(2rem, 4vw, 3.2rem);
  font-weight: 800;
}

.cn-agent-header p:not(.cn-agent-header__eyebrow) {
  max-width: 44rem;
  margin: 0.8rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.cn-agent-header__status {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  align-self: flex-start;
  min-height: 2.7rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: rgb(19 19 19 / 0.82);
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
}

.cn-agent-header__status-dot {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: var(--cn-on-surface-muted);
}

.cn-agent-header__status-dot--connected {
  background: var(--cn-primary);
  box-shadow: 0 0 10px rgb(143 245 255 / 0.8);
}

.cn-agent-header__status-dot--pending_verification {
  background: var(--cn-secondary);
  box-shadow: 0 0 10px rgb(195 244 0 / 0.6);
}

.cn-agent-header__status-dot--connection_failed,
.cn-agent-header__status-dot--not_configured {
  background: var(--cn-error);
  box-shadow: 0 0 10px rgb(255 113 108 / 0.55);
}

.cn-agent-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.1fr) minmax(22rem, 0.9fr);
  gap: 1.5rem;
}

.cn-agent-card {
  position: relative;
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background:
    linear-gradient(135deg, rgb(195 244 0 / 0.04), transparent 32%),
    rgb(19 19 19 / 0.84);
}

.cn-agent-card--logs {
  margin-top: 1.5rem;
}

.cn-agent-card__header,
.cn-agent-actions,
.cn-agent-status-actions {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
}

.cn-agent-card__header {
  margin-bottom: 1.2rem;
}

.cn-agent-card h2 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  font-size: 1.15rem;
  font-weight: 700;
}

.cn-agent-card h2 .material-symbols-outlined {
  color: var(--cn-secondary);
}

.cn-agent-card__meta {
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.cn-agent-fields {
  display: grid;
  gap: 1.1rem;
}

.cn-agent-field {
  display: grid;
  gap: 0.45rem;
}

.cn-agent-field > span {
  color: var(--cn-on-surface-muted);
  font-size: 0.78rem;
  font-weight: 600;
}

.cn-agent-input {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 0.75rem;
  background: rgb(10 10 10 / 0.4);
  color: var(--cn-on-surface-muted);
}

.cn-agent-input:focus-within {
  border-color: rgb(195 244 0 / 0.28);
}

.cn-agent-input input,
.cn-agent-input select {
  width: 100%;
  border: 0;
  color: var(--cn-on-surface);
  background: transparent;
  font-family: var(--cn-font-mono);
  outline: 0;
}

.cn-agent-input option {
  color: #111;
}

.cn-agent-credential-hint,
.cn-agent-toggle {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.75rem;
  background: rgb(10 10 10 / 0.28);
  color: var(--cn-on-surface-muted);
  font-size: 0.84rem;
  line-height: 1.7;
}

.cn-agent-toggle input {
  margin-top: 0.2rem;
}

.cn-agent-actions {
  margin-top: 1.5rem;
}

.cn-agent-actions__button {
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
}

.cn-agent-actions__button:hover {
  border-color: rgb(195 244 0 / 0.26);
  background: rgb(32 31 31 / 0.95);
}

.cn-agent-actions__button:disabled {
  opacity: 0.55;
  cursor: not-allowed;
}

.cn-agent-actions__button--primary {
  color: #314000;
  background: var(--cn-secondary);
}

.cn-agent-actions__button--signal {
  color: #041316;
  background: var(--cn-primary);
}

.cn-agent-actions__button--secondary {
  color: var(--cn-primary);
}

.cn-agent-error {
  margin: 1rem 0 0;
  color: var(--cn-error);
  font-size: 0.86rem;
  line-height: 1.7;
}

.cn-agent-error--soft {
  color: #ffb3b0;
}

.cn-agent-summary {
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.75rem;
  background: rgb(10 10 10 / 0.3);
}

.cn-agent-summary h3 {
  font-size: 1.4rem;
  font-weight: 800;
}

.cn-agent-summary p {
  margin: 0.7rem 0 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.8;
}

.cn-agent-timeline,
.cn-agent-snapshot {
  display: grid;
  gap: 0.75rem;
  margin-top: 1rem;
}

.cn-agent-timeline__item,
.cn-agent-snapshot__item {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.75rem;
  background: rgb(26 25 25 / 0.7);
}

.cn-agent-timeline__item span,
.cn-agent-snapshot__item span {
  color: var(--cn-on-surface-muted);
  font-size: 0.8rem;
}

.cn-agent-timeline__item strong,
.cn-agent-snapshot__item strong {
  min-width: 0;
  overflow-wrap: anywhere;
  text-align: right;
  font-family: var(--cn-font-mono);
  font-size: 0.84rem;
}

.cn-agent-status-actions {
  margin-top: 1rem;
}

.cn-agent-status-actions .cn-agent-actions__button {
  flex: 1;
}

.cn-agent-logs {
  min-height: 14rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.75rem;
  background: rgb(10 10 10 / 0.42);
}

.cn-agent-logs__list {
  display: grid;
  gap: 0.6rem;
}

.cn-agent-logs__entry {
  padding: 0.85rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.12);
  border-radius: 0.75rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
  line-height: 1.75;
  background: rgb(26 25 25 / 0.65);
}

.cn-agent-logs__empty p {
  margin: 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.9;
}

@media (width <= 1180px) {
  .cn-agent-canvas {
    padding-inline: 1.5rem;
  }

  .cn-agent-header,
  .cn-agent-grid,
  .cn-agent-actions,
  .cn-agent-status-actions {
    grid-template-columns: 1fr;
    flex-direction: column;
    align-items: stretch;
  }

  .cn-agent-card__header {
    flex-direction: column;
    align-items: flex-start;
  }
}
</style>
