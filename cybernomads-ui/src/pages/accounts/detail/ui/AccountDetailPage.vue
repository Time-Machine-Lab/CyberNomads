<script setup lang="ts">
import { computed, onBeforeUnmount, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getAccountById,
  getAccessSession,
  getAccessSessionLogs,
  pollAccessSession,
  startQrAccessSession,
  startTokenAccessSession,
  updateAccount,
  verifyAccessSession,
} from '@/entities/account/api/account-service'
import { resolvePlatformColorClass } from '@/entities/account/model/mappers'
import type {
  AccessMode,
  AccessSessionDetailRecord,
  AccessSessionLogsRecord,
  AccountDetailRecord,
  AvailabilityStatus,
  ConnectionStatus,
  JsonObject,
  LifecycleStatus,
} from '@/entities/account/model/types'

type FeedbackTone = 'info' | 'success' | 'error'
type QrStepState = 'done' | 'active' | 'pending' | 'error'

const route = useRoute()

const account = ref<AccountDetailRecord | null>(null)
const currentSession = ref<AccessSessionDetailRecord | null>(null)
const currentSessionLogs = ref<AccessSessionLogsRecord | null>(null)
const isLoading = ref(false)
const pageError = ref('')
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const feedbackVisible = ref(false)
const isSavingProfile = ref(false)
const isRefreshingQr = ref(false)
const isVerifyingConnection = ref(false)
const isQrPolling = ref(false)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null
let qrPollingTimer: ReturnType<typeof setTimeout> | null = null
let latestQrFeedbackKey: string | null = null

const profileForm = reactive({
  internalDisplayName: '',
  remark: '',
  tagsText: '',
  platformMetadataText: '{}',
})

const connectForm = reactive({
  tokenValue: '',
})

const tagDraft = ref('')
const isTagComposerOpen = ref(false)

const backTo = computed(() => String(route.meta.backTo ?? '/accounts'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回账号池'))
const accountId = computed(() => String(route.params.accountId ?? ''))
const isDeleted = computed(() => account.value?.lifecycleStatus === 'deleted')
const canEditProfile = computed(() => Boolean(account.value) && !isDeleted.value && !isSavingProfile.value)
const canRefreshQr = computed(() => Boolean(account.value) && !isDeleted.value && !isRefreshingQr.value)
const canVerifyConnection = computed(
  () => Boolean(account.value) && !isDeleted.value && !isVerifyingConnection.value,
)
const hasStoredCurrentCredential = computed(() => Boolean(account.value?.currentCredential.hasCredential))
const hasDraftToken = computed(() => Boolean(connectForm.tokenValue.trim()))
const tokenInputPlaceholder = computed(() =>
  hasStoredCurrentCredential.value ? '输入新的令牌，验证成功后会替换当前生效令牌' : '输入或粘贴令牌',
)
const displaySession = computed(() => currentSession.value ?? account.value?.currentAccessSession ?? null)
const challengeImageUrl = computed(() => displaySession.value?.challengeImageUrl ?? null)
const challengeMessage = computed(() => displaySession.value?.challengeMessage ?? null)
const profileTags = computed(() => parseTags(profileForm.tagsText))
const qrSessionStatus = computed(() =>
  displaySession.value?.accessMode === 'qr_login' ? displaySession.value.sessionStatus : null,
)
const isQrAutoManaged = computed(
  () =>
    !hasDraftToken.value &&
    (qrSessionStatus.value === 'waiting_for_scan' ||
      qrSessionStatus.value === 'waiting_for_confirmation' ||
      qrSessionStatus.value === 'ready_for_verification' ||
      isQrPolling.value),
)
const verifyButtonLabel = computed(() => {
  if (isVerifyingConnection.value) {
    return '验证中…'
  }

  if (hasDraftToken.value) {
    return hasStoredCurrentCredential.value ? '验证并替换令牌' : '验证令牌'
  }

  if (qrSessionStatus.value === 'waiting_for_scan') {
    return '等待扫码中'
  }

  if (qrSessionStatus.value === 'waiting_for_confirmation') {
    return '等待手机确认'
  }

  if (qrSessionStatus.value === 'ready_for_verification' || isQrPolling.value) {
    return '系统自动验证中'
  }

  if (qrSessionStatus.value === 'verified') {
    return '扫码已完成'
  }

  if (qrSessionStatus.value === 'verify_failed') {
    return '刷新二维码后重试'
  }

  return '输入令牌后验证'
})
const canManualVerify = computed(() => canVerifyConnection.value && hasDraftToken.value)
const qrActionButtonLabel = computed(() => {
  if (isRefreshingQr.value) {
    return '生成中…'
  }

  if (qrSessionStatus.value === 'waiting_for_scan' || qrSessionStatus.value === 'waiting_for_confirmation') {
    return '重新生成二维码'
  }

  if (qrSessionStatus.value === 'verified') {
    return '重新扫码登录'
  }

  return '刷新二维码'
})
const tokenHelperCopy = computed(() => {
  if (hasDraftToken.value) {
    return '当前会按手工令牌流程处理，点击下方按钮后会直接验证并尝试替换当前令牌。'
  }

  if (qrSessionStatus.value === 'waiting_for_scan') {
    return '当前正在扫码流程中，不需要手动点验证连接；系统会在检测到扫码后自动继续。'
  }

  if (qrSessionStatus.value === 'waiting_for_confirmation') {
    return '已经检测到扫码，请在手机上确认授权；确认后系统会自动完成验证。'
  }

  if (qrSessionStatus.value === 'ready_for_verification') {
    return '扫码结果已经返回，系统正在自动验证并切换当前令牌。'
  }

  if (qrSessionStatus.value === 'verified') {
    return '扫码流程已经完成。如果要换一个账号，可以直接刷新二维码重新登录。'
  }

  return '如果你已经从其他地方拿到了令牌，也可以直接粘贴到这里，走手工验证流程。'
})
const passiveActionCopy = computed(() => {
  if (isQrAutoManaged.value) {
    return '扫码流程正在由系统自动处理，不需要你额外点击验证。'
  }

  if (qrSessionStatus.value === 'verified') {
    return '当前扫码登录已经完成。如需切换账号，直接刷新二维码重新扫码即可。'
  }

  if (qrSessionStatus.value === 'verify_failed') {
    return '当前扫码验证失败，建议刷新二维码重新开始，或者改用手工令牌。'
  }

  return '粘贴令牌后，下方会自动切换为可提交状态。'
})
const secondaryQrMessage = computed(() => {
  const message = challengeMessage.value

  if (!message) {
    return null
  }

  if (message.includes('验证连接')) {
    return null
  }

  if (message === qrStatusCopy.value.detail) {
    return null
  }

  return message
})
const qrStepItems = computed(() => {
  const status = qrSessionStatus.value
  const steps: Array<{ label: string; state: QrStepState }> = [
    {
      label: '生成二维码',
      state: status ? 'done' : 'active',
    },
    {
      label: '手机确认',
      state: 'pending',
    },
    {
      label: '自动生效',
      state: 'pending',
    },
  ]

  if (!status) {
    return steps
  }

  if (status === 'waiting_for_scan') {
    steps[1].state = 'active'
    return steps
  }

  if (status === 'waiting_for_confirmation') {
    steps[1].state = 'active'
    return steps
  }

  if (status === 'ready_for_verification') {
    steps[1].state = 'done'
    steps[2].state = 'active'
    return steps
  }

  if (status === 'verified') {
    steps[1].state = 'done'
    steps[2].state = 'done'
    return steps
  }

  if (status === 'verify_failed') {
    steps[1].state = 'done'
    steps[2].state = 'error'
    return steps
  }

  if (status === 'expired' || status === 'canceled') {
    steps[1].state = 'error'
    return steps
  }

  return steps
})
const qrStatusCopy = computed(() => {
  const session = displaySession.value

  if (!session || session.accessMode !== 'qr_login') {
    return {
      label: '等待开始',
      detail: '点击刷新二维码，使用目标平台 App 扫码登录。',
    }
  }

  if (session.sessionStatus === 'waiting_for_scan') {
    return {
      label: '等待扫码',
      detail: '二维码已生成，请使用目标平台 App 扫码。',
    }
  }

  if (session.sessionStatus === 'waiting_for_confirmation') {
    return {
      label: '已扫码',
      detail: '已经检测到扫码，请在手机上确认登录授权。',
    }
  }

  if (session.sessionStatus === 'ready_for_verification') {
    return {
      label: '扫码完成',
      detail: '已拿到登录结果，正在验证并生效当前令牌。',
    }
  }

  if (session.sessionStatus === 'verified') {
    return {
      label: '登录成功',
      detail: '扫码登录已经完成，当前令牌已生效。',
    }
  }

  if (session.sessionStatus === 'verify_failed') {
    return {
      label: '验证失败',
      detail: session.sessionStatusReason ?? '扫码结果验证失败，请刷新二维码后重试。',
    }
  }

  if (session.sessionStatus === 'expired') {
    return {
      label: '二维码过期',
      detail: '当前二维码已过期，请刷新后重新扫码。',
    }
  }

  return {
    label: '会话已结束',
    detail: session.sessionStatusReason ?? '当前扫码会话已结束，请重新开始。',
  }
})

watch(
  accountId,
  () => {
    void loadAccount()
  },
  { immediate: true },
)

watch(
  displaySession,
  (session) => {
    if (!session || session.accessMode !== 'qr_login') {
      stopQrPolling()
      return
    }

    if (
      session.sessionStatus === 'waiting_for_scan' ||
      session.sessionStatus === 'waiting_for_confirmation' ||
      session.sessionStatus === 'ready_for_verification'
    ) {
      scheduleQrPolling(1200)
      return
    }

    stopQrPolling()
  },
  { immediate: true },
)

onBeforeUnmount(() => {
  stopQrPolling()

  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
})

function setFeedback(message: string, tone: FeedbackTone) {
  feedbackMessage.value = message
  feedbackTone.value = tone
  feedbackVisible.value = true

  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
  }

  feedbackTimer = setTimeout(() => {
    feedbackVisible.value = false
  }, 2800)
}

function setQrFeedbackOnce(key: string, message: string, tone: FeedbackTone) {
  if (latestQrFeedbackKey === key) {
    return
  }

  latestQrFeedbackKey = key
  setFeedback(message, tone)
}

function dismissFeedback() {
  feedbackVisible.value = false

  if (feedbackTimer) {
    clearTimeout(feedbackTimer)
    feedbackTimer = null
  }
}

function syncProfileForm(detail: AccountDetailRecord) {
  profileForm.internalDisplayName = detail.internalDisplayName
  profileForm.remark = detail.remark ?? ''
  profileForm.tagsText = detail.tags.join(', ')
  profileForm.platformMetadataText = JSON.stringify(detail.platformMetadata ?? {}, null, 2)
}

function parseTags(rawValue: string) {
  return Array.from(
    new Set(
      rawValue
        .split(/[,\n，]/)
        .map((item) => item.trim())
        .filter(Boolean),
    ),
  )
}

function syncTagsText(nextTags: string[]) {
  profileForm.tagsText = nextTags.join(', ')
}

function addProfileTag() {
  const nextTag = tagDraft.value.trim()

  if (!nextTag) {
    return
  }

  syncTagsText([...profileTags.value, nextTag])
  tagDraft.value = ''
  isTagComposerOpen.value = false
}

function removeProfileTag(tag: string) {
  syncTagsText(profileTags.value.filter((item) => item !== tag))
}

function openTagComposer() {
  isTagComposerOpen.value = true
}

function closeTagComposer() {
  tagDraft.value = ''
  isTagComposerOpen.value = false
}

function parseJsonObject(rawValue: string, fieldLabel: string): JsonObject {
  const normalized = rawValue.trim()

  if (!normalized) {
    return {}
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(normalized)
  } catch {
    throw new Error(`${fieldLabel} 必须是合法的 JSON 对象。`)
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error(`${fieldLabel} 必须是 JSON 对象。`)
  }

  return parsed as JsonObject
}

async function refreshSessionLogs(sessionId: string) {
  if (!account.value) {
    currentSessionLogs.value = null
    return
  }

  currentSessionLogs.value = await getAccessSessionLogs(account.value.id, sessionId)
}

function stopQrPolling() {
  if (qrPollingTimer) {
    clearTimeout(qrPollingTimer)
    qrPollingTimer = null
  }
}

function scheduleQrPolling(delayMs = 1800) {
  stopQrPolling()

  qrPollingTimer = setTimeout(() => {
    void tickQrSession()
  }, delayMs)
}

async function applyVerifiedSession(sessionId: string, options: { successMessage?: string } = {}) {
  if (!account.value) {
    return
  }

  const result = await verifyAccessSession(account.value.id, sessionId, {})
  await loadAccount({ showLoading: false })

  if (result.verificationResult === 'succeeded') {
    setFeedback(options.successMessage ?? '连接验证成功，当前令牌已生效。', 'success')
    return
  }

  setFeedback(result.verificationReason ?? '连接验证失败，请检查令牌或扫码状态。', 'error')
}

async function tickQrSession() {
  const sessionId = currentSession.value?.sessionId ?? displaySession.value?.sessionId

  if (!account.value || !sessionId) {
    stopQrPolling()
    return
  }

  let session =
    currentSession.value?.sessionId === sessionId
      ? currentSession.value
      : await getAccessSession(account.value.id, sessionId)

  currentSession.value = session

  if (session.accessMode !== 'qr_login') {
    stopQrPolling()
    return
  }

  if (isQrPolling.value || isVerifyingConnection.value) {
    scheduleQrPolling(1800)
    return
  }

  if (
    session.sessionStatus !== 'waiting_for_scan' &&
    session.sessionStatus !== 'waiting_for_confirmation' &&
    session.sessionStatus !== 'ready_for_verification'
  ) {
    stopQrPolling()
    return
  }

  isQrPolling.value = true

  try {
    let nextSession =
      session.sessionStatus === 'ready_for_verification'
        ? session
        : await pollAccessSession(account.value.id, session.sessionId, {})

    currentSession.value = nextSession
    await refreshSessionLogs(nextSession.sessionId)

    if (nextSession.sessionStatus === 'waiting_for_scan') {
      scheduleQrPolling(1800)
      return
    }

    if (nextSession.sessionStatus === 'waiting_for_confirmation') {
      setQrFeedbackOnce(
        `${nextSession.sessionId}:waiting_for_confirmation`,
        '已经检测到扫码，请在手机上确认登录授权。',
        'info',
      )
      scheduleQrPolling(1500)
      return
    }

    if (nextSession.sessionStatus === 'ready_for_verification') {
      await applyVerifiedSession(nextSession.sessionId, {
        successMessage: '扫码登录成功，当前令牌已自动生效。',
      })
      return
    }

    if (nextSession.sessionStatus === 'expired') {
      await loadAccount({ showLoading: false })
      setFeedback('二维码已过期，请刷新后重新扫码。', 'error')
      return
    }
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '扫码状态同步失败。', 'error')
  } finally {
    isQrPolling.value = false
  }
}

async function loadSessionResources(sessionId: string) {
  if (!account.value) {
    currentSession.value = null
    currentSessionLogs.value = null
    return
  }

  currentSession.value = await getAccessSession(account.value.id, sessionId)
  await refreshSessionLogs(sessionId)
}

async function loadAccount(options: { showLoading?: boolean } = {}) {
  const showLoading = options.showLoading ?? true

  if (showLoading) {
    isLoading.value = true
  }

  pageError.value = ''

  try {
    const detail = await getAccountById(accountId.value)
    account.value = detail
    currentSession.value = null
    currentSessionLogs.value = null

    if (detail) {
      syncProfileForm(detail)

      if (detail.currentAccessSession) {
        await loadSessionResources(detail.currentAccessSession.sessionId)
      }
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '账号详情加载失败，请稍后重试。'
  } finally {
    if (showLoading) {
      isLoading.value = false
    }
  }
}

async function handleSaveProfile() {
  if (!account.value) {
    return
  }

  if (!profileForm.internalDisplayName.trim()) {
    setFeedback('账号名称不能为空。', 'error')
    return
  }

  let platformMetadata: JsonObject

  try {
    platformMetadata = parseJsonObject(profileForm.platformMetadataText, '平台扩展字段')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '平台扩展字段格式错误。', 'error')
    return
  }

  isSavingProfile.value = true

  try {
    account.value = await updateAccount(account.value.id, {
      internalDisplayName: profileForm.internalDisplayName.trim(),
      remark: profileForm.remark.trim() || null,
      tags: parseTags(profileForm.tagsText),
      platformMetadata,
    })

    syncProfileForm(account.value)
    setFeedback('基础资料已保存。', 'success')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '资料保存失败。', 'error')
  } finally {
    isSavingProfile.value = false
  }
}

async function handleRefreshQrSession() {
  if (!account.value) {
    return
  }

  isRefreshingQr.value = true

  try {
    currentSession.value = await startQrAccessSession(account.value.id, {})
    latestQrFeedbackKey = null
    await refreshSessionLogs(currentSession.value.sessionId)
    await loadAccount({ showLoading: false })
    setFeedback('二维码已刷新，请使用对应平台 App 扫码。', 'success')
    scheduleQrPolling(1200)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '二维码刷新失败。', 'error')
  } finally {
    isRefreshingQr.value = false
  }
}

async function handleVerifyConnection() {
  if (!account.value) {
    return
  }

  isVerifyingConnection.value = true

  try {
    let session = currentSession.value
    const trimmedToken = connectForm.tokenValue.trim()

    if (trimmedToken) {
      session = await startTokenAccessSession(account.value.id, {
        token: trimmedToken,
      })
      currentSession.value = session
      connectForm.tokenValue = ''
      await refreshSessionLogs(session.sessionId)
    } else {
      const sessionId = currentSession.value?.sessionId ?? account.value.currentAccessSession?.sessionId

      if (!sessionId) {
        throw new Error('请先输入令牌，或者先刷新二维码开始扫码授权。')
      }

      session =
        currentSession.value?.sessionId === sessionId
          ? currentSession.value
          : await getAccessSession(account.value.id, sessionId)
      currentSession.value = session
    }

    if (!session) {
      throw new Error('当前没有可用的接入会话。')
    }

    if (session.accessMode === 'qr_login' && (
      session.sessionStatus === 'waiting_for_scan' ||
      session.sessionStatus === 'waiting_for_confirmation'
    )) {
      session = await pollAccessSession(account.value.id, session.sessionId, {})
      currentSession.value = session
      await refreshSessionLogs(session.sessionId)
    }

    if (session.sessionStatus === 'waiting_for_scan') {
      await loadAccount({ showLoading: false })
      setFeedback('二维码还未被扫码，请先完成扫码。', 'info')
      return
    }

    if (session.sessionStatus === 'waiting_for_confirmation') {
      await loadAccount({ showLoading: false })
      setFeedback('请在移动端确认登录授权后，再次点击验证连接。', 'info')
      return
    }

    if (session.sessionStatus === 'expired' || session.sessionStatus === 'canceled') {
      await loadAccount({ showLoading: false })
      throw new Error('当前接入会话已失效，请重新刷新二维码或重新录入令牌。')
    }

    if (session.sessionStatus !== 'ready_for_verification' && session.sessionStatus !== 'verify_failed') {
      await loadAccount({ showLoading: false })
      setFeedback(session.sessionStatusReason ?? '当前会话暂时还不能验证，请稍后重试。', 'info')
      return
    }

    await applyVerifiedSession(session.sessionId)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '连接验证失败。', 'error')
  } finally {
    isVerifyingConnection.value = false
  }
}

function resolveLifecycleLabel(status: LifecycleStatus) {
  if (status === 'active') return '活跃'
  if (status === 'disabled') return '停用'
  return '已删除'
}

function resolveConnectionLabel(status: ConnectionStatus) {
  if (status === 'not_logged_in') return '未登录'
  if (status === 'connecting') return '接入中'
  if (status === 'connected') return '已连接'
  if (status === 'connect_failed') return '接入失败'
  return '已过期'
}

function resolveConnectionIcon(status: ConnectionStatus) {
  if (status === 'connected') return 'check_circle'
  if (status === 'connecting') return 'sync'
  if (status === 'connect_failed') return 'error'
  if (status === 'expired') return 'schedule'
  return 'wifi_tethering_error'
}

function resolveAvailabilityLabel(status: AvailabilityStatus) {
  if (status === 'healthy') return '健康'
  if (status === 'risk') return '风险'
  if (status === 'restricted') return '受限'
  if (status === 'offline') return '离线'
  return '未知'
}

function resolveAccessModeLabel(mode: AccessMode) {
  return mode === 'qr_login' ? '扫码授权' : '令牌录入'
}

function resolveIdentityFallback(label: string) {
  const normalized = label.trim()
  return normalized ? normalized.slice(0, 1).toUpperCase() : 'A'
}
</script>

<template>
  <section class="account-detail-page">
    <main class="account-detail-main">
      <section v-if="pageError" class="account-banner account-banner--error">
        <strong>账号详情加载异常</strong>
        <p>{{ pageError }}</p>
      </section>

      <section v-else-if="isLoading" class="account-banner account-banner--info">
        <strong>正在加载账号详情</strong>
        <p>正在请求账号信息、当前接入会话和日志信息，请稍候。</p>
      </section>

      <section v-else-if="!account" class="account-banner account-banner--info">
        <strong>未找到对应账号</strong>
        <p>请确认路由中的账号 ID 是否正确，或返回账号池重新选择。</p>
      </section>

      <template v-else>
        <Teleport to="body">
          <aside
            v-if="feedbackMessage && feedbackVisible"
            class="account-toast"
            :class="`account-toast--${feedbackTone}`"
          >
            <div class="account-toast__content">
              <strong>{{ feedbackTone === 'error' ? '操作未完成' : '操作结果' }}</strong>
              <p>{{ feedbackMessage }}</p>
            </div>
            <button type="button" class="account-toast__close" @click="dismissFeedback">
              <span class="material-symbols-outlined">close</span>
            </button>
          </aside>
        </Teleport>

        <header class="account-detail-header">
          <div class="account-detail-header__title">
            <RouterLink :to="backTo" class="account-detail-context__back" :title="backLabel">
              <span class="material-symbols-outlined">arrow_back</span>
            </RouterLink>
            <div>
              <h1>账户配置</h1>
              <p>
                <span class="account-detail-header__pulse" />
                <span>{{ account.state.label }} · {{ account.state.detail }}</span>
              </p>
            </div>
          </div>

          <div class="account-detail-header__chips">
            <span>
              <span class="material-symbols-outlined">schedule</span>
              <span>{{ account.currentCredential.updatedAtLabel ? `令牌更新 ${account.currentCredential.updatedAtLabel}` : '令牌未生效' }}</span>
            </span>
            <span>
              <span class="material-symbols-outlined">vpn_lock</span>
              <span>{{ account.currentCredential.hasCredential ? '已保存令牌' : '未接入令牌' }}</span>
            </span>
          </div>
        </header>

        <div class="account-detail-grid">
          <div class="account-detail-left">
            <section class="account-card account-card--profile">
              <div class="account-card__glow" />
              <div class="account-profile">
                <div class="account-profile__avatar">
                  <img
                    v-if="account.resolvedPlatformProfile.resolvedAvatarUrl"
                    :src="account.resolvedPlatformProfile.resolvedAvatarUrl"
                    :alt="account.internalDisplayName"
                    referrerpolicy="no-referrer"
                  />
                  <div v-else class="account-profile__avatar-fallback">
                    <span>{{ resolveIdentityFallback(account.internalDisplayName) }}</span>
                  </div>
                  <span class="material-symbols-outlined">verified</span>
                </div>

                <div class="account-profile__content">
                  <div class="account-profile__top">
                    <h2>{{ account.internalDisplayName }}</h2>
                    <span class="account-profile__platform">
                      <span
                        class="material-symbols-outlined"
                        :class="`account-card__icon--${resolvePlatformColorClass(account.platformView.color)}`"
                      >
                        {{ account.platformView.icon }}
                      </span>
                      <span>{{ account.platformView.label }}</span>
                    </span>
                  </div>
                  <p>UID: {{ account.resolvedPlatformProfile.resolvedPlatformAccountUid ?? '待解析' }}</p>
                  <div class="account-profile__tags">
                    <span>{{ account.state.label }}</span>
                    <span>{{ resolveLifecycleLabel(account.lifecycleStatus) }}</span>
                    <span v-if="account.tags[0]">{{ account.tags[0] }}</span>
                    <span v-if="account.tags[1]">{{ account.tags[1] }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="account-card account-card--basic">
              <h3>
                <span class="material-symbols-outlined">tune</span>
                <span>基础资料</span>
              </h3>

              <div class="account-basic-grid">
                <label class="account-field account-field--wide">
                  <span>账号名称</span>
                  <input
                    v-model="profileForm.internalDisplayName"
                    data-testid="detail-internal-name"
                    :readonly="!canEditProfile"
                    type="text"
                  />
                </label>

                <label class="account-field account-field--compact">
                  <span>目标平台</span>
                  <input :value="account.platformView.label" type="text" readonly />
                </label>

                <label class="account-field account-field--full">
                  <span>标签分配</span>
                  <div class="account-tag-editor" :class="{ 'account-tag-editor--readonly': !canEditProfile }">
                    <div v-if="profileTags.length" class="account-tag-editor__list">
                      <span
                        v-for="tag in profileTags"
                        :key="tag"
                        class="account-tag-chip"
                        :class="{ 'account-tag-chip--muted': tag !== profileTags[0] }"
                      >
                        <span>{{ tag }}</span>
                        <button
                          v-if="canEditProfile"
                          type="button"
                          class="account-tag-chip__remove"
                          :aria-label="`删除标签 ${tag}`"
                          @click="removeProfileTag(tag)"
                        >
                          <span class="material-symbols-outlined">close</span>
                        </button>
                      </span>
                    </div>

                    <button
                      v-if="canEditProfile && !isTagComposerOpen"
                      type="button"
                      class="account-tag-editor__add"
                      @click="openTagComposer"
                    >
                      <span class="material-symbols-outlined">add</span>
                      <span>添加</span>
                    </button>

                    <div v-if="canEditProfile && isTagComposerOpen" class="account-tag-editor__draft">
                      <input
                        v-model="tagDraft"
                        data-testid="detail-tags"
                        type="text"
                        placeholder="输入标签后添加"
                        @keydown.enter.prevent="addProfileTag"
                        @keydown.esc.prevent="closeTagComposer"
                      />
                      <button type="button" class="account-tag-editor__confirm" @click="addProfileTag">
                        确定
                      </button>
                      <button type="button" class="account-tag-editor__cancel" @click="closeTagComposer">
                        取消
                      </button>
                    </div>

                    <p v-else-if="!profileTags.length" class="account-tag-editor__empty">暂无标签</p>
                  </div>
                </label>

                <label class="account-field account-field--full">
                  <span>账户备注</span>
                  <textarea
                    v-model="profileForm.remark"
                    data-testid="detail-remark"
                    :readonly="!canEditProfile"
                    rows="3"
                    placeholder="补充这个账号的角色、用途或特殊说明"
                  />
                </label>
              </div>

              <details class="account-metadata-collapse account-metadata-collapse--full">
                <summary>平台扩展字段</summary>
                <label class="account-field account-field--embedded">
                  <span>JSON 对象</span>
                  <textarea
                    v-model="profileForm.platformMetadataText"
                    data-testid="detail-platform-metadata"
                    :readonly="!canEditProfile"
                    rows="3"
                    spellcheck="false"
                    placeholder="输入 JSON 对象"
                  />
                </label>
              </details>

              <div class="account-card__actions">
                <button
                  type="button"
                  class="account-primary-button"
                  data-testid="detail-save-profile"
                  :disabled="!canEditProfile"
                  @click="handleSaveProfile"
                >
                  <span>{{ isSavingProfile ? '保存中…' : '保存基础资料' }}</span>
                </button>
              </div>
            </section>
          </div>

          <div class="account-detail-center">
            <section class="account-card account-card--qr">
              <div class="account-card__row account-card__row--plain">
                <h3>
                  <span class="material-symbols-outlined account-section-icon account-section-icon--cyan">qr_code_scanner</span>
                  <span>扫码授权</span>
                </h3>
              </div>

              <div class="account-qr-inline">
                <div class="account-qr-inline__image">
                  <img v-if="challengeImageUrl" :src="challengeImageUrl" alt="二维码 challenge" />
                  <div v-else class="account-qr-inline__placeholder">
                    <span class="material-symbols-outlined">qr_code_2</span>
                  </div>
                </div>
                <div class="account-qr-inline__content">
                  <div class="account-qr-inline__headline">
                    <div class="account-qr-inline__status">
                      <strong>{{ qrStatusCopy.label }}</strong>
                      <span v-if="isQrPolling">状态同步中…</span>
                    </div>
                    <div class="account-qr-steps" aria-label="扫码流程进度">
                      <div
                        v-for="step in qrStepItems"
                        :key="step.label"
                        class="account-qr-step"
                        :class="`account-qr-step--${step.state}`"
                      >
                        <span class="account-qr-step__dot" />
                        <span class="account-qr-step__label">{{ step.label }}</span>
                      </div>
                    </div>
                  </div>
                  <p class="account-qr-inline__detail">{{ qrStatusCopy.detail }}</p>
                  <small v-if="secondaryQrMessage">
                    {{ secondaryQrMessage }}
                  </small>
                  <div v-if="displaySession" class="account-token-meta">
                    <span>当前会话：{{ resolveAccessModeLabel(displaySession.accessMode) }}</span>
                    <span>状态：{{ displaySession.stateLabel }}</span>
                    <span v-if="displaySession.updatedAtLabel">更新时间：{{ displaySession.updatedAtLabel }}</span>
                  </div>
                </div>
              </div>

              <div class="account-card__actions account-card__actions--qr">
                <button
                  type="button"
                  class="account-secondary-button"
                  data-testid="detail-refresh-qr"
                  :disabled="!canRefreshQr"
                  @click="handleRefreshQrSession"
                >
                  <span class="material-symbols-outlined">refresh</span>
                  <span>{{ qrActionButtonLabel }}</span>
                </button>
              </div>
            </section>

            <section class="account-card account-card--token">
              <div class="account-card__row account-card__row--compact">
                <h3>
                  <span class="material-symbols-outlined account-section-icon account-section-icon--blue">key</span>
                  <span>访问令牌</span>
                </h3>
                <span class="account-card__caption">手工方式</span>
              </div>

              <div v-if="hasStoredCurrentCredential && !connectForm.tokenValue.trim()" class="account-token-saved">
                <span class="material-symbols-outlined">verified_user</span>
                <div>
                  <strong>当前生效令牌已保存</strong>
                  <p>出于安全原因不回显明文。输入新令牌并验证成功后，会替换当前值。</p>
                </div>
              </div>

              <label class="account-token-field">
                <span class="material-symbols-outlined account-token-field__leading">lock</span>
                <textarea
                  v-model="connectForm.tokenValue"
                  data-testid="detail-token-input"
                  rows="1"
                  :readonly="!canVerifyConnection"
                  :placeholder="tokenInputPlaceholder"
                />
                <span class="material-symbols-outlined account-token-field__trailing">vpn_key</span>
              </label>

              <div class="account-inline-tip" :class="{ 'account-inline-tip--active': isQrAutoManaged }">
                <span class="material-symbols-outlined">
                  {{ isQrAutoManaged ? 'auto_awesome' : 'info' }}
                </span>
                <p>{{ tokenHelperCopy }}</p>
              </div>

              <div class="account-token-meta">
                <span>当前令牌：{{ account.currentCredential.hasCredential ? '已保存（不回显）' : '未配置' }}</span>
                <span v-if="account.currentCredential.updatedAtLabel">最近更新：{{ account.currentCredential.updatedAtLabel }}</span>
                <span v-if="account.currentCredential.expiresAtLabel">过期时间：{{ account.currentCredential.expiresAtLabel }}</span>
              </div>

              <div class="account-card__actions">
                <button
                  v-if="hasDraftToken"
                  type="button"
                  class="account-primary-button"
                  data-testid="detail-verify-connection"
                  :disabled="!canManualVerify"
                  @click="handleVerifyConnection"
                >
                  <span>{{ verifyButtonLabel }}</span>
                </button>
                <div v-else class="account-passive-action">
                  <span class="material-symbols-outlined">
                    {{ isQrAutoManaged ? 'bolt' : qrSessionStatus === 'verified' ? 'check_circle' : 'edit_note' }}
                  </span>
                  <span>{{ passiveActionCopy }}</span>
                </div>
              </div>
            </section>
          </div>

          <div class="account-detail-side">
            <section class="account-card account-card--status">
              <h3>
                <span class="material-symbols-outlined account-section-icon account-section-icon--green">wifi_tethering</span>
                <span>连接状态</span>
              </h3>

              <div class="account-status account-status--compact" :class="`account-status--${account.state.tone}`">
                <div class="account-status__hero">
                  <div class="account-status__icon">
                    <span class="material-symbols-outlined">{{ resolveConnectionIcon(account.connectionStatus) }}</span>
                    <span class="account-status__indicator" />
                  </div>
                  <div class="account-status__summary">
                    <h4>{{ account.state.label }}</h4>
                    <p>{{ account.state.detail }}</p>
                  </div>
                  <div class="account-status__meta">
                    <div class="account-status__meta-item">
                      <span>认证状态</span>
                      <strong>{{ resolveConnectionLabel(account.connectionStatus) }}</strong>
                    </div>
                    <div class="account-status__meta-item">
                      <span>可用性</span>
                      <strong>{{ resolveAvailabilityLabel(account.availabilityStatus) }}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <div class="account-token-meta account-token-meta--stacked">
                <span>当前账号：{{ resolveLifecycleLabel(account.lifecycleStatus) }}</span>
                <span v-if="account.lastVerifiedAtLabel">最近验证：{{ account.lastVerifiedAtLabel }}</span>
                <span v-if="account.lastConnectedAtLabel">最近连接：{{ account.lastConnectedAtLabel }}</span>
              </div>
            </section>

            <section class="account-console account-detail-console">
              <header class="account-console__header">
                <div>
                  <span class="material-symbols-outlined">terminal</span>
                  <span>SYSTEM TERMINAL _</span>
                </div>
                <div class="account-console__tools">
                  <span class="material-symbols-outlined">monitoring</span>
                  <span class="material-symbols-outlined">receipt_long</span>
                </div>
              </header>

              <div v-if="displaySession" class="account-console__summary">
                <div>
                  <span>当前会话</span>
                  <strong>{{ displaySession.sessionId }}</strong>
                </div>
                <div>
                  <span>接入方式</span>
                  <strong>{{ resolveAccessModeLabel(displaySession.accessMode) }}</strong>
                </div>
                <div>
                  <span>状态</span>
                  <strong>{{ displaySession.stateLabel }}</strong>
                </div>
                <div>
                  <span>最后更新</span>
                  <strong>{{ displaySession.updatedAtLabel ?? '未更新' }}</strong>
                </div>
              </div>

              <div
                v-if="currentSessionLogs?.entries.length"
                class="account-console__body"
                data-testid="detail-log-console"
              >
                <div
                  v-for="(entry, index) in currentSessionLogs.entries"
                  :key="`${entry.timestamp}-${index}`"
                  class="account-console__line"
                  :class="`account-console__line--${entry.level}`"
                >
                  <span class="account-console__time">{{ entry.timestampLabel ?? entry.timestamp }}</span>
                  <span class="account-console__level">[{{ entry.level.toUpperCase() }}]</span>
                  <span class="account-console__message">{{ entry.message }}</span>
                </div>

                <div class="account-console__tail">
                  <span>_</span>
                  <span>Listening for access-session logs...</span>
                </div>
              </div>

              <div v-else class="account-console__body account-console__body--empty">
                <div>这里会展示二维码生成、扫码轮询、令牌验证和生效过程的结构化日志。</div>
                <div>当你刷新二维码或验证连接后，系统会把本次接入会话的日志实时写在这里。</div>
                <div class="account-console__tail">
                  <span>_</span>
                  <span>Awaiting first access session...</span>
                </div>
              </div>

              <div class="account-console__footnotes">
                <p v-if="account.connectionStatusReason">连接说明：{{ account.connectionStatusReason }}</p>
                <p v-if="account.availabilityStatusReason">可用性说明：{{ account.availabilityStatusReason }}</p>
                <p v-if="displaySession?.sessionStatusReason">会话说明：{{ displaySession.sessionStatusReason }}</p>
              </div>
            </section>
          </div>
        </div>
      </template>
    </main>
  </section>
</template>

<style scoped lang="scss">
.account-detail-page {
  min-height: 100vh;
  color: #fff;
}

.account-detail-page .material-symbols-outlined {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: auto;
  height: auto;
  flex: 0 0 auto;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 1rem !important;
  line-height: 1;
  overflow: visible;
  text-indent: 0;
  font-variation-settings:
    'FILL' 0,
    'wght' 500,
    'GRAD' 0,
    'opsz' 24;
}

.account-detail-page .material-symbols-outlined::before {
  content: none;
}

.account-detail-main {
  width: min(100%, 90rem);
  margin: 0 auto;
  padding: clamp(1.5rem, 2vw, 2.5rem);
}

.account-detail-context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 1.75rem;
  color: #8b8888;
  font-family: var(--cn-font-display);
  font-size: 0.82rem;
}

.account-detail-context__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  color: #adaaaa;
  background: #131313;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.account-detail-context__back .material-symbols-outlined {
  font-size: 1.25rem;
}

.account-detail-context__back .material-symbols-outlined::before {
  content: none;
}

.account-detail-context__back:hover {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.3);
  background: #1b1a1a;
}

.account-detail-context__crumb {
  color: #767575;
  letter-spacing: 0.04em;
}

.account-banner {
  margin-bottom: 1.5rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #151515;
}

.account-banner strong,
.account-banner p {
  margin: 0;
}

.account-banner p {
  margin-top: 0.35rem;
  color: #adaaaa;
  font-size: 0.8rem;
}

.account-banner--success {
  border-color: rgb(143 245 255 / 0.24);
  background: rgb(143 245 255 / 0.06);
}

.account-banner--error {
  border-color: rgb(255 113 108 / 0.24);
  background: rgb(255 113 108 / 0.08);
}

.account-toast {
  position: fixed;
  top: 1.4rem;
  right: 1.4rem;
  z-index: 30;
  display: flex;
  gap: 0.9rem;
  align-items: flex-start;
  width: min(24rem, calc(100vw - 2rem));
  padding: 0.95rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 0.9rem;
  background: rgb(19 19 19 / 0.95);
  box-shadow: 0 18px 48px rgb(0 0 0 / 0.34);
  backdrop-filter: blur(18px);
}

.account-toast--success {
  border-color: rgb(143 245 255 / 0.3);
}

.account-toast--error {
  border-color: rgb(255 113 108 / 0.28);
}

.account-toast__content {
  flex: 1;
}

.account-toast__content strong,
.account-toast__content p {
  margin: 0;
}

.account-toast__content p {
  margin-top: 0.3rem;
  color: #adaaaa;
  font-size: 0.82rem;
  line-height: 1.55;
}

.account-toast__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.9rem;
  height: 1.9rem;
  border: 0;
  border-radius: 999px;
  color: #8b8888;
  background: transparent;
  cursor: pointer;
}

.account-toast__close:hover {
  color: #fff;
  background: rgb(255 255 255 / 0.05);
}

.account-detail-grid,
.account-detail-left,
.account-detail-center,
.account-detail-side {
  display: grid;
  gap: 1.5rem;
}

.account-detail-grid {
  align-items: start;
}

.account-detail-left,
.account-detail-center,
.account-detail-side {
  align-items: start;
  align-content: start;
  min-height: 0;
}

.account-detail-side {
  grid-template-rows: auto minmax(0, 1fr);
  min-height: 0;
}

.account-detail-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.5rem;
  margin-bottom: 2rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.account-detail-header__title {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.account-detail-header h1,
.account-card h3,
.account-status h4 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.account-detail-header h1 {
  font-size: clamp(1.9rem, 2.6vw, 2.25rem);
  font-weight: 700;
  letter-spacing: -0.035em;
}

.account-detail-header p {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.35rem 0 0;
  color: #adaaaa;
}

.account-detail-header__pulse {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #c3f400;
  box-shadow: 0 0 10px rgb(195 244 0 / 0.6);
}

.account-detail-header__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
}

.account-detail-header__chips > span {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 999px;
  background: #201f1f;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
}

.account-detail-header__chips .material-symbols-outlined {
  color: #adaaaa;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 0.9rem;
}

.account-detail-header__chips .material-symbols-outlined::before {
  content: none;
}

.account-card,
.account-console {
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
  background: #1a1919;
}

.account-card--profile {
  position: relative;
  background: #131313;
}

.account-card__glow {
  position: absolute;
  top: -2rem;
  right: -2rem;
  width: 8rem;
  height: 8rem;
  border-radius: 999px;
  background: rgb(143 245 255 / 0.04);
  filter: blur(48px);
}

.account-profile,
.account-card__row,
.account-status,
.account-console__header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.account-profile {
  gap: 1.5rem;
  justify-content: flex-start;
}

.account-profile__avatar {
  position: relative;
  width: 5.25rem;
  height: 5.25rem;
  flex-shrink: 0;
}

.account-profile__avatar img {
  width: 100%;
  height: 100%;
  border: 2px solid #262626;
  border-radius: 0.75rem;
  object-fit: cover;
}

.account-profile__avatar-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: 2px solid #262626;
  border-radius: 0.75rem;
  color: #8ff5ff;
  background: #131313;
  font-size: 1.3rem;
  font-weight: 700;
}

.account-profile__avatar > .material-symbols-outlined {
  position: absolute;
  right: -0.2rem;
  bottom: -0.2rem;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0.2rem;
  border: 1px solid rgb(72 72 71 / 0.5);
  border-radius: 999px;
  color: #8ff5ff;
  background: #262626;
}

.account-profile__avatar > .material-symbols-outlined::before {
  content: none;
}

.account-profile__content {
  flex: 1;
}

.account-profile__top {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.account-profile__top h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: 0.92rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.account-profile__platform {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  padding: 0.32rem 0.65rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.35rem;
  color: #adaaaa;
  background: #201f1f;
  font-size: 0.72rem;
}

.account-profile__content p {
  margin: 0.45rem 0 1rem;
  color: #adaaaa;
  font-size: 0.78rem;
  letter-spacing: 0.02em;
}

.account-profile__tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.account-profile__tags span {
  display: inline-flex;
  align-items: center;
  min-height: 1.45rem;
  padding: 0 0.52rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.3rem;
  font-size: 0.64rem;
}

.account-profile__tags span:first-child {
  color: #c3f400;
  border-color: rgb(195 244 0 / 0.2);
}

.account-card__icon--primary {
  color: #8ff5ff;
}

.account-card__icon--red {
  color: #ff2442;
}

.account-card__icon--blue {
  color: #1da1f2;
}

.account-card__icon--amber {
  color: #ffb800;
}

.account-card__icon--default {
  color: #fff;
}

.account-card h3 {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  font-size: 1rem;
  letter-spacing: 0.01em;
}

.account-section-icon {
  width: 1.35rem;
  height: 1.35rem;
  font-size: 1.05rem !important;
}

.account-section-icon--cyan {
  color: #8ff5ff;
}

.account-section-icon--blue {
  color: #65afff;
}

.account-section-icon--green {
  color: #c3f400;
}

.account-card__tip {
  color: #767575;
  font-size: 0.72rem;
}

.account-card__row {
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.account-card__row h3 {
  padding-bottom: 0;
  border-bottom: 0;
}

.account-card__row--compact,
.account-card__row--plain {
  align-items: center;
}

.account-card__row--plain {
  border-bottom: 0;
}

.account-card__caption {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0 0.6rem;
  border: 1px solid rgb(72 72 71 / 0.25);
  border-radius: 999px;
  color: #8b8888;
  background: rgb(255 255 255 / 0.03);
  font-size: 0.68rem;
  font-weight: 600;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.account-card__link {
  border: 0;
  color: #8ff5ff;
  background: transparent;
  font-family: var(--cn-font-body);
  font-size: 0.8rem;
  font-weight: 500;
}

.account-field {
  display: grid;
  gap: 0.45rem;
  margin-top: 0;
}

.account-field + .account-field {
  margin-top: 0.9rem;
}

.account-card h3 + .account-field,
.account-card__row + .account-field,
.account-card__row + .account-mode-switch {
  margin-top: 1rem;
}

.account-basic-grid {
  display: grid;
  grid-template-columns: minmax(0, 1.35fr) minmax(9rem, 0.82fr);
  gap: 0.78rem 1.1rem;
  margin-top: 0.9rem;
}

.account-field > span {
  color: #adaaaa;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.account-tag-editor {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  align-items: center;
  padding: 0.2rem 0 0.1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
}

.account-tag-editor--readonly {
  padding-bottom: 0.4rem;
}

.account-tag-editor__list {
  display: contents;
}

.account-tag-chip {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0 0.72rem;
  border: 1px solid rgb(110 169 187 / 0.75);
  border-radius: 0.2rem;
  background: rgb(101 175 255 / 0.06);
  color: #b7f4ff;
  font-size: 0.66rem;
  line-height: 1;
}

.account-tag-chip--muted {
  border-color: rgb(72 72 71 / 0.7);
  background: #2a2a2a;
  color: #d5d2d2;
}

.account-tag-chip__remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 0.8rem;
  height: 0.8rem;
  border: 0;
  padding: 0;
  color: inherit;
  background: transparent;
  cursor: pointer;
}

.account-tag-chip__remove .material-symbols-outlined {
  font-size: 0.62rem !important;
}

.account-tag-editor__draft {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  flex: 0 0 auto;
}

.account-tag-editor__draft input {
  width: 8rem;
  min-width: 0;
  min-height: 2rem;
  border: 1px solid rgb(72 72 71 / 0.5);
  border-radius: 0.25rem;
  padding: 0 0.65rem;
  color: #fff;
  background: #1e1e1e;
  font-size: 0.66rem;
  outline: 0;
}

.account-tag-editor__add {
  display: inline-flex;
  align-items: center;
  gap: 0.35rem;
  min-height: 2rem;
  padding: 0 0.8rem;
  border: 1px dashed rgb(118 117 117 / 0.8);
  border-radius: 0.2rem;
  color: #adaaaa;
  background: #131313;
  font-size: 0.66rem;
  cursor: pointer;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.account-tag-editor__add:hover {
  color: #fff;
  border-color: rgb(143 245 255 / 0.3);
  background: rgb(143 245 255 / 0.03);
}

.account-tag-editor__confirm,
.account-tag-editor__cancel {
  min-height: 2rem;
  padding: 0 0.7rem;
  border: 1px solid rgb(72 72 71 / 0.5);
  border-radius: 0.25rem;
  background: #1b1a1a;
  color: #fff;
  font-size: 0.66rem;
  cursor: pointer;
}

.account-tag-editor__confirm {
  border-color: rgb(143 245 255 / 0.3);
  color: #8ff5ff;
}

.account-tag-editor__cancel {
  color: #adaaaa;
}

.account-tag-editor__empty {
  margin: 0;
  color: #767575;
  font-size: 0.76rem;
}

.account-field input,
.account-field textarea {
  width: 100%;
  border: 0;
  padding: 0.72rem 0;
  color: #fff;
  background: transparent;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
  font-size: 0.92rem;
  outline: 0;
}

.account-field textarea {
  min-height: 3.75rem;
  resize: vertical;
  font-family: var(--cn-font-mono);
  line-height: 1.6;
}

.account-field__hint {
  color: #767575;
  font-size: 0.7rem;
  line-height: 1.45;
}

.account-field--wide {
  min-width: 0;
}

.account-field--compact input {
  font-size: 0.84rem;
}

.account-field--full {
  grid-column: 1 / -1;
}

.account-metadata-collapse {
  margin-top: 0.95rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
}

.account-metadata-collapse summary {
  padding: 0.7rem 0;
  color: #adaaaa;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  list-style: none;
  text-transform: uppercase;
  cursor: pointer;
}

.account-metadata-collapse summary::-webkit-details-marker {
  display: none;
}

.account-metadata-collapse summary::after {
  float: right;
  color: #767575;
  content: '+';
}

.account-metadata-collapse[open] summary::after {
  content: '-';
}

.account-field--embedded {
  padding-bottom: 0.8rem;
}

.account-card--basic {
  padding-bottom: 1.15rem;
}

.account-card--basic .account-field input,
.account-card--basic .account-field textarea {
  padding: 0.42rem 0;
  font-size: 0.86rem;
}

.account-card--basic .account-metadata-collapse {
  margin-top: 0.78rem;
}

.account-card--basic .account-metadata-collapse summary {
  padding: 0.48rem 0;
}

.account-card--basic .account-card__actions {
  margin-top: 0.9rem;
}

.account-card--basic .account-primary-button {
  width: auto;
  min-height: 2.45rem;
  padding: 0 1.05rem;
  font-size: 0.78rem;
}

.account-card--token {
  position: relative;
  background: #1f1f1f;
  padding-top: 1.2rem;
  padding-bottom: 1.2rem;
}

.account-token-saved {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  margin-top: 0.9rem;
  border: 1px solid rgb(101 175 255 / 0.18);
  border-radius: 0.55rem;
  background: rgb(101 175 255 / 0.06);
}

.account-token-saved .material-symbols-outlined {
  color: #65afff;
  font-size: 1rem !important;
}

.account-token-saved strong,
.account-token-saved p {
  margin: 0;
}

.account-token-saved strong {
  display: block;
  color: #fff;
  font-size: 0.8rem;
  font-weight: 700;
}

.account-token-saved p {
  margin-top: 0.25rem;
  color: #adaaaa;
  font-size: 0.72rem;
  line-height: 1.55;
}

.account-token-field {
  display: grid;
  grid-template-columns: auto minmax(0, 1fr) auto;
  gap: 0.6rem;
  align-items: center;
  min-height: 3rem;
  padding: 0.1rem 0.7rem;
  margin-top: 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.28);
  border-radius: 0.5rem;
  background: #131313;
}

.account-token-field textarea {
  width: 100%;
  min-height: 1.35rem;
  max-height: 3rem;
  border: 0;
  padding: 0.6rem 0;
  resize: none;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.84rem;
  line-height: 1.35;
  outline: 0;
}

.account-token-field textarea::placeholder {
  color: #767575;
}

.account-token-field__leading,
.account-token-field__trailing {
  color: #767575;
  font-size: 0.95rem !important;
}

.account-token-meta {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 1rem;
  margin-top: 0.5rem;
  color: #8b8888;
  font-size: 0.7rem;
}

.account-inline-tip {
  display: flex;
  gap: 0.65rem;
  align-items: flex-start;
  padding: 0.8rem 0.9rem;
  margin-top: 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.75rem;
  color: #9a9898;
  background: rgb(255 255 255 / 0.02);
}

.account-inline-tip .material-symbols-outlined {
  margin-top: 0.05rem;
  color: #8b8888;
}

.account-inline-tip p {
  margin: 0;
  font-size: 0.73rem;
  line-height: 1.6;
}

.account-inline-tip--active {
  border-color: rgb(143 245 255 / 0.2);
  background: rgb(143 245 255 / 0.05);
}

.account-inline-tip--active .material-symbols-outlined {
  color: #8ff5ff;
}

.account-passive-action {
  display: inline-flex;
  gap: 0.6rem;
  align-items: center;
  min-height: 3.1rem;
  width: 100%;
  padding: 0 1rem;
  border: 1px dashed rgb(72 72 71 / 0.26);
  border-radius: 0.45rem;
  color: #9c9a9a;
  background: rgb(255 255 255 / 0.02);
  font-size: 0.76rem;
  line-height: 1.55;
}

.account-passive-action .material-symbols-outlined {
  color: #8ff5ff;
}

.account-card__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.account-card__actions--column {
  flex-direction: column;
}

.account-primary-button,
.account-secondary-button {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  min-height: 3.1rem;
  padding: 0 1.2rem;
  border: 1px solid transparent;
  border-radius: 0.35rem;
  font-family: var(--cn-font-body);
  font-size: 0.86rem;
  font-weight: 700;
  transition:
    transform var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.account-primary-button {
  color: #07353b;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  box-shadow: 0 0 0 rgba(143 245 255 / 0);
}

.account-secondary-button {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.28);
  background: #1b1a1a;
}

.account-secondary-button--danger {
  border-color: rgb(255 113 108 / 0.18);
}

.account-primary-button:hover:not(:disabled),
.account-secondary-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.account-primary-button:hover:not(:disabled) {
  box-shadow: 0 0 15px rgb(143 245 255 / 0.22);
}

.account-primary-button:disabled,
.account-secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.48;
}

.account-card__actions--column .account-primary-button,
.account-card__actions--column .account-secondary-button,
.account-card > .account-secondary-button {
  width: 100%;
}

.account-card > .account-secondary-button {
  margin-top: 1.25rem;
}

.account-card > .account-secondary-button + .account-secondary-button {
  margin-top: 0.75rem;
}

.account-mode-switch {
  display: inline-grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  width: 100%;
  padding: 0.25rem;
  margin-top: 0;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 0.5rem;
  background: #131313;
}

.account-mode-switch__item {
  min-height: 2.45rem;
  border: 0;
  border-radius: 0.35rem;
  color: #adaaaa;
  background: transparent;
  font-family: var(--cn-font-body);
  font-size: 0.8rem;
  font-weight: 600;
}

.account-mode-switch__item--active {
  color: #8ff5ff;
  background: #262626;
}

.account-mode-switch + .account-field,
.account-mode-switch + .account-qr-inline {
  margin-top: 1.25rem;
}

.account-qr-inline {
  display: grid;
  grid-template-columns: minmax(8.4rem, 9.6rem) minmax(0, 1fr);
  gap: 1rem;
  margin-top: 0;
  padding: 1rem 0 0.15rem;
  border: 0;
  background: transparent;
  align-items: start;
}

.account-qr-inline__image {
  display: grid;
  place-items: center;
  width: 100%;
  max-width: 9.6rem;
  padding: 0.45rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.6rem;
  background: #0e0e0e;
}

.account-qr-inline__image img {
  width: 100%;
  border-radius: 0.45rem;
  background: #fff;
}

.account-qr-inline__placeholder {
  display: grid;
  place-items: center;
  width: 100%;
  aspect-ratio: 1;
  border: 2px dashed rgb(143 245 255 / 0.4);
  border-radius: 0.45rem;
  color: #767575;
  background: #0e0e0e;
  position: relative;
  overflow: hidden;
}

.account-qr-inline__placeholder .material-symbols-outlined {
  font-size: 1.9rem !important;
  color: #484847;
}

.account-qr-inline__placeholder::before {
  position: absolute;
  inset: 0;
  background: rgb(143 245 255 / 0.05);
  content: '';
}

.account-qr-inline__placeholder::after {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 2px;
  background: rgb(143 245 255 / 0.45);
  animation: account-qr-scan 2s ease-in-out infinite;
  content: '';
}

.account-qr-inline__content {
  display: grid;
  gap: 0.6rem;
  min-width: 0;
  text-align: left;
}

.account-qr-inline__headline {
  display: grid;
  gap: 0.55rem;
}

.account-qr-inline__status {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  flex-wrap: wrap;
}

.account-qr-inline__status strong {
  color: #f5f5f5;
  font-size: 0.9rem;
  font-weight: 700;
}

.account-qr-inline__status span {
  color: #8ff5ff;
  font-size: 0.69rem;
}

.account-qr-steps {
  display: flex;
  align-items: center;
  flex-wrap: wrap;
  gap: 0.45rem;
  min-width: 0;
}

.account-qr-step {
  display: flex;
  gap: 0.42rem;
  align-items: center;
  padding: 0.34rem 0.62rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 999px;
  background: rgb(255 255 255 / 0.02);
  min-height: 2rem;
}

.account-qr-step__dot {
  width: 0.46rem;
  height: 0.46rem;
  flex: 0 0 auto;
  border-radius: 999px;
  background: #4d4c4c;
}

.account-qr-step__label {
  color: #efefef;
  font-size: 0.72rem;
  font-weight: 600;
  line-height: 1;
  white-space: nowrap;
}

.account-qr-step--done {
  border-color: rgb(143 245 255 / 0.16);
  background: rgb(143 245 255 / 0.04);
}

.account-qr-step--done .account-qr-step__dot {
  background: #8ff5ff;
  box-shadow: 0 0 10px rgb(143 245 255 / 0.35);
}

.account-qr-step--active {
  border-color: rgb(192 255 109 / 0.2);
  background: rgb(192 255 109 / 0.05);
}

.account-qr-step--active .account-qr-step__dot {
  background: #c0ff6d;
  box-shadow: 0 0 10px rgb(192 255 109 / 0.35);
}

.account-qr-step--error {
  border-color: rgb(255 113 108 / 0.2);
  background: rgb(255 113 108 / 0.05);
}

.account-qr-step--error .account-qr-step__dot {
  background: #ff716c;
  box-shadow: 0 0 10px rgb(255 113 108 / 0.35);
}

.account-qr-inline__content strong,
.account-qr-inline__content p {
  margin: 0;
}

.account-qr-inline__detail {
  color: #adaaaa;
  font-size: 0.74rem;
  line-height: 1.55;
}

.account-qr-inline__content small {
  display: block;
  color: #767575;
  font-size: 0.68rem;
  line-height: 1.5;
}

.account-card--qr {
  display: flex;
  flex-direction: column;
  background: #131313;
}

.account-card--qr .account-card__row {
  width: 100%;
}

.account-card__actions--qr {
  justify-content: center;
  margin-top: 0.85rem;
}

.account-card__actions--qr .account-secondary-button {
  min-height: 2.6rem;
  min-width: 10rem;
  padding: 0 1.1rem;
  color: #fff;
  border-color: rgb(72 72 71 / 0.3);
  font-size: 0.78rem;
  font-weight: 600;
}

.account-status {
  margin-top: 0.25rem;
  align-items: center;
  justify-content: flex-start;
  gap: 1.25rem;
}

.account-status--compact {
  display: grid;
  gap: 0.75rem;
  margin-top: 0.1rem;
}

.account-status__hero {
  display: flex;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  width: 100%;
}

.account-status__summary {
  display: grid;
  gap: 0.35rem;
  flex: 1;
}

.account-status__summary h4 {
  font-size: 1.08rem;
}

.account-status__summary p {
  margin: 0;
  color: #8b8888;
  font-size: 0.72rem;
}

.account-status__meta {
  display: grid;
  gap: 0.65rem;
  min-width: 11rem;
}

.account-status__meta-item {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  justify-content: space-between;
  min-height: 3.15rem;
  padding: 0 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.6rem;
  background: #201f1f;
}

.account-status__meta-item span {
  color: #8b8888;
  font-size: 0.75rem;
  white-space: nowrap;
}

.account-status__meta-item strong {
  color: #fff;
  font-size: 0.88rem;
  font-weight: 700;
  white-space: nowrap;
}

.account-status__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  flex-shrink: 0;
  border: 2px solid currentcolor;
  border-radius: 999px;
  background: #262626;
  box-shadow: 0 0 12px rgb(143 245 255 / 0.18);
}

.account-status__icon .material-symbols-outlined {
  font-size: 1.7rem !important;
}

.account-status__indicator {
  position: absolute;
  top: -0.15rem;
  right: -0.15rem;
  width: 0.8rem;
  height: 0.8rem;
  border: 2px solid #1a1919;
  border-radius: 999px;
  background: currentcolor;
}

.account-status p {
  margin: 0.4rem 0 0;
  color: #adaaaa;
  font-size: 0.78rem;
  line-height: 1.55;
}

.account-status h4 {
  font-size: 1.2rem;
  font-weight: 700;
}

.account-status--healthy,
.account-status--neutral {
  color: #c3f400;
}

.account-status--warning {
  color: #ffb800;
}

.account-status--danger {
  color: #ff716c;
}

.account-status--muted {
  color: #767575;
}

.account-profile-grid,
.account-console__summary {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.9rem;
  margin-top: 1.1rem;
}

.account-profile-grid div,
.account-console__summary div {
  padding: 0 0 0.75rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.16);
  background: transparent;
}

.account-profile-grid span,
.account-console__summary span {
  display: block;
  margin-bottom: 0.35rem;
  color: #8b8888;
  font-size: 0.78rem;
}

.account-profile-grid strong,
.account-console__summary strong {
  display: block;
  word-break: break-word;
  line-height: 1.55;
}

.account-detail-side > .account-card {
  display: flex;
  flex-direction: column;
  min-height: 0;
}

.account-detail-side > .account-card > .account-secondary-button:first-of-type {
  margin-top: 1.5rem;
}

.account-detail-console {
  min-width: 0;
  min-height: 0;
  height: clamp(24rem, 58vh, 34rem);
  max-height: clamp(24rem, 58vh, 34rem);
  overflow: hidden;
}

.account-json-block {
  margin: 1rem 0 0;
  padding: 1rem;
  overflow: auto;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.75rem;
  background: #111;
  color: #d1cece;
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  line-height: 1.75;
}

.account-console {
  display: flex;
  flex-direction: column;
  min-height: 0;
  height: 100%;
  padding: 0;
  background: #0a0a0a;
}

.account-console__header {
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: #151515;
}

.account-console__header div,
.account-console__tools {
  display: flex;
  gap: 0.55rem;
  align-items: center;
}

.account-console__header span:not(.material-symbols-outlined) {
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  letter-spacing: 0.08em;
}

.account-console__header .material-symbols-outlined {
  color: #767575;
  font-family: 'Material Symbols Outlined', sans-serif;
  font-size: 0.9rem;
}

.account-console__summary {
  padding: 1rem 1rem 0;
}

.account-console__body {
  flex: 1;
  min-height: 0;
  padding: 1rem 1rem 1.15rem;
  overflow: auto;
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  line-height: 1.75;
  scrollbar-width: thin;
  scrollbar-color: rgb(143 245 255 / 0.28) transparent;
}

.account-console__body::-webkit-scrollbar {
  width: 0.42rem;
}

.account-console__body::-webkit-scrollbar-track {
  background: transparent;
}

.account-console__body::-webkit-scrollbar-thumb {
  border-radius: 999px;
  background: rgb(143 245 255 / 0.22);
}

.account-console__body::-webkit-scrollbar-thumb:hover {
  background: rgb(143 245 255 / 0.34);
}

.account-console__body--empty {
  color: #8b8888;
}

.account-console__line {
  display: grid;
  grid-template-columns: auto auto 1fr;
  gap: 0.6rem;
  color: #d8d4d4;
}

.account-console__time {
  color: #767575;
}

.account-console__line--info .account-console__level {
  color: #65afff;
}

.account-console__line--warn .account-console__level {
  color: #ffb800;
}

.account-console__line--error .account-console__level {
  color: #ff716c;
}

.account-console__tail,
.account-console__footnotes {
  display: grid;
  gap: 0.4rem;
  color: #767575;
}

.account-console__tail {
  margin-top: 1rem;
  grid-auto-flow: column;
  justify-content: start;
}

.account-console__tail span:first-child {
  color: #8ff5ff;
}

.account-console__footnotes {
  padding: 0 1rem 1rem;
}

.account-console__footnotes p {
  margin: 0;
  line-height: 1.7;
}

@keyframes account-qr-scan {
  0% {
    transform: translateY(0);
    opacity: 0;
  }

  10% {
    opacity: 1;
  }

  90% {
    opacity: 1;
  }

  100% {
    transform: translateY(12rem);
    opacity: 0;
  }
}

@media (min-width: 1200px) {
  .account-detail-grid {
    grid-template-columns: minmax(17rem, 0.82fr) minmax(22rem, 0.98fr) minmax(20rem, 1.1fr);
    column-gap: 1.5rem;
    align-items: start;
  }
}

@media (min-width: 900px) and (max-width: 1199px) {
  .account-detail-grid {
    grid-template-columns: minmax(16rem, 0.9fr) minmax(0, 1.1fr);
  }

  .account-detail-center {
    grid-column: 2;
  }

  .account-detail-side {
    grid-column: 2;
  }

  .account-detail-console {
    grid-column: 2;
  }
}

@media (min-width: 760px) {
  .account-detail-header {
    flex-direction: row;
    align-items: flex-end;
    justify-content: space-between;
  }
}

@media (max-width: 900px) {
  .account-basic-grid,
  .account-profile-grid,
  .account-console__summary {
    grid-template-columns: 1fr;
  }

  .account-status__hero {
    align-items: flex-start;
    flex-direction: column;
  }

  .account-status__meta {
    width: 100%;
    min-width: 0;
  }

  .account-detail-console {
    height: 22rem;
    max-height: 22rem;
  }

  .account-qr-inline {
    grid-template-columns: minmax(7.8rem, 8.8rem) minmax(0, 1fr);
    gap: 0.85rem;
  }

  .account-qr-steps {
    gap: 0.4rem;
  }
}


@media (max-width: 760px) {
  .account-detail-main {
    padding: 1rem;
  }

  .account-toast {
    top: auto;
    right: 1rem;
    bottom: 1rem;
    left: 1rem;
    width: auto;
  }

  .account-detail-header {
    align-items: stretch;
  }

  .account-profile {
    flex-direction: column;
  }

  .account-tag-editor__draft {
    flex-wrap: wrap;
  }

  .account-token-field {
    grid-template-columns: auto minmax(0, 1fr);
  }

  .account-token-field__trailing {
    grid-column: 2;
    justify-self: end;
    margin-top: -0.35rem;
    margin-bottom: 0.25rem;
  }

  .account-qr-inline {
    grid-template-columns: 1fr;
    justify-items: center;
    gap: 0.85rem;
    padding-top: 0.85rem;
  }

  .account-qr-inline__content {
    width: 100%;
    text-align: center;
  }

  .account-qr-inline__status,
  .account-qr-steps {
    justify-content: center;
  }

  .account-qr-inline__detail {
    max-width: 24rem;
    margin-inline: auto;
  }
}
</style>
