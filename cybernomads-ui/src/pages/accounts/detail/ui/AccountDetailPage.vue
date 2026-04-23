<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getAccountById,
  getConnectionAttempt,
  getConnectionAttemptLogs,
  runAvailabilityCheck,
  startConnectionAttempt,
  updateAccount,
  validateConnectionAttempt,
} from '@/entities/account/api/account-service'
import {
  resolvePlatformColorClass,
} from '@/entities/account/model/mappers'
import type {
  AccountConnectionAttemptDetailRecord,
  AccountDetailRecord,
  AvailabilityStatus,
  ConnectionAttemptLogsRecord,
  ConnectionMethod,
  JsonObject,
  LifecycleStatus,
  LoginStatus,
} from '@/entities/account/model/types'

type FeedbackTone = 'info' | 'success' | 'error'

const route = useRoute()

const account = ref<AccountDetailRecord | null>(null)
const currentAttempt = ref<AccountConnectionAttemptDetailRecord | null>(null)
const currentAttemptLogs = ref<ConnectionAttemptLogsRecord | null>(null)
const isLoading = ref(false)
const pageError = ref('')
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const feedbackVisible = ref(false)
const isSavingProfile = ref(false)
const isStartingAttempt = ref(false)
const isCheckingAvailability = ref(false)
let feedbackTimer: ReturnType<typeof setTimeout> | null = null

const profileForm = reactive({
  internalDisplayName: '',
  remark: '',
  tagsText: '',
  platformMetadataText: '{}',
})

const tagDraft = ref('')
const isTagComposerOpen = ref(false)

const connectForm = reactive({
  connectionMethod: 'manual_token' as ConnectionMethod,
  tokenValue: '',
})

const backTo = computed(() => String(route.meta.backTo ?? '/accounts'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回账号池'))
const accountId = computed(() => String(route.params.accountId ?? ''))
const isDeleted = computed(() => account.value?.lifecycleStatus === 'deleted')

const canEditProfile = computed(
  () => Boolean(account.value) && !isDeleted.value && !isSavingProfile.value,
)

const canStartAttempt = computed(
  () => Boolean(account.value) && !isDeleted.value && !isStartingAttempt.value,
)

const canRunAvailabilityCheck = computed(
  () =>
    Boolean(account.value) &&
    account.value?.lifecycleStatus === 'active' &&
    (
      (account.value.loginStatus === 'connected' && account.value.activeToken.hasToken) ||
      currentAttempt.value?.attemptStatus === 'ready_for_validation'
    ) &&
    !isCheckingAvailability.value,
)

const challengeImageUrl = computed(() => currentAttempt.value?.challengeImageUrl ?? null)
const challengeMessage = computed(() => currentAttempt.value?.challengeMessage ?? null)
const hasStoredActiveToken = computed(() => Boolean(account.value?.activeToken.hasToken))
const tokenInputPlaceholder = computed(() =>
  hasStoredActiveToken.value
    ? '输入新的 Token 以覆盖当前已保存凭证'
    : '输入或粘贴新的 Token',
)

watch(
  accountId,
  () => {
    void loadAccount()
  },
  { immediate: true },
)

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

const profileTags = computed(() => parseTags(profileForm.tagsText))

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

async function loadAttemptResources(attemptId: string) {
  if (!account.value) {
    currentAttempt.value = null
    currentAttemptLogs.value = null
    return
  }

  const detail = await getConnectionAttempt(account.value.id, attemptId)
  currentAttempt.value = detail
  currentAttemptLogs.value = detail.hasLogs
    ? await getConnectionAttemptLogs(account.value.id, attemptId)
    : {
        accountId: account.value.id,
        attemptId,
        entries: [],
      }
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
    currentAttempt.value = null
    currentAttemptLogs.value = null

    if (detail) {
      syncProfileForm(detail)

      if (detail.latestConnectionAttempt) {
        await loadAttemptResources(detail.latestConnectionAttempt.attemptId)
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

async function handleStartAttempt() {
  if (!account.value) {
    return
  }

  if (connectForm.connectionMethod === 'manual_token' && !connectForm.tokenValue.trim()) {
    setFeedback('请输入令牌。', 'error')
    return
  }

  isStartingAttempt.value = true

  try {
    const attempt = await startConnectionAttempt(account.value.id, {
      connectionMethod: connectForm.connectionMethod,
      tokenValue: connectForm.connectionMethod === 'manual_token' ? connectForm.tokenValue.trim() : null,
      context: connectForm.connectionMethod === 'qr_login' ? {} : undefined,
    })

    currentAttempt.value = attempt
    currentAttemptLogs.value = attempt.hasLogs
      ? await getConnectionAttemptLogs(account.value.id, attempt.attemptId)
      : {
          accountId: account.value.id,
          attemptId: attempt.attemptId,
          entries: [],
        }

    const latest = await getAccountById(account.value.id)

    if (latest) {
      account.value = latest
      syncProfileForm(latest)
    }

    if (attempt.connectionMethod === 'qr_login') {
      setFeedback('二维码已生成，请扫码完成授权。', 'success')
      return
    }

    setFeedback('令牌已写入待校验连接尝试，接下来点击“验证连接”。', 'success')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '连接尝试创建失败。', 'error')
  } finally {
    isStartingAttempt.value = false
  }
}

async function handleStartManualAttempt() {
  connectForm.connectionMethod = 'manual_token'
  await handleStartAttempt()
}

async function handleStartQrAttempt() {
  connectForm.connectionMethod = 'qr_login'
  await handleStartAttempt()
}

async function handleAvailabilityCheck() {
  if (!account.value) {
    return
  }

  isCheckingAvailability.value = true

  try {
    if (!account.value.activeToken.hasToken || account.value.loginStatus !== 'connected') {
      if (!currentAttempt.value || currentAttempt.value.attemptStatus !== 'ready_for_validation') {
        throw new Error('当前还没有可验证的令牌，请先录入令牌或完成扫码授权。')
      }

      const validation = await validateConnectionAttempt(account.value.id, currentAttempt.value.attemptId, {})

      if (validation.validationResult !== 'succeeded') {
        await loadAttemptResources(currentAttempt.value.attemptId)
        await loadAccount({ showLoading: false })
        throw new Error(validation.validationReason ?? '令牌校验失败，请检查后重试。')
      }

      await loadAttemptResources(currentAttempt.value.attemptId)
      await loadAccount({ showLoading: false })
    }

    const result = await runAvailabilityCheck(account.value.id)
    await loadAccount({ showLoading: false })
    setFeedback(
      result.availabilityStatusReason ??
        (result.availabilityStatus === 'healthy' ? '可用性检查通过。' : '可用性检查已完成。'),
      result.availabilityStatus === 'healthy' ? 'success' : 'error',
    )
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '可用性检查失败。', 'error')
  } finally {
    isCheckingAvailability.value = false
  }
}

function resolveLifecycleLabel(status: LifecycleStatus) {
  if (status === 'active') return '活跃'
  if (status === 'disabled') return '停用'
  return '已删除'
}

function resolveLoginLabel(status: LoginStatus) {
  if (status === 'not_logged_in') return '未登录'
  if (status === 'connecting') return '接入中'
  if (status === 'connected') return '已连接'
  if (status === 'login_failed') return '登录失败'
  return '令牌过期'
}

function resolveAvailabilityLabel(status: AvailabilityStatus) {
  if (status === 'healthy') return '健康'
  if (status === 'risk') return '风险'
  if (status === 'restricted') return '受限'
  if (status === 'offline') return '离线'
  return '未知'
}

function resolveConnectionMethodLabel(method: ConnectionMethod) {
  return method === 'qr_login' ? '扫码登录' : '手工令牌'
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
        <p>正在请求账号脱敏视图、连接尝试和日志信息，请稍候。</p>
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
              <span>{{ account.activeToken.updatedAtLabel ? `令牌更新 ${account.activeToken.updatedAtLabel}` : '令牌未生效' }}</span>
            </span>
            <span>
              <span class="material-symbols-outlined">vpn_lock</span>
              <span>{{ account.activeToken.hasToken ? 'Encrypted' : 'Pending Login' }}</span>
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
                  <p>{{ challengeMessage ?? '请使用目标平台移动端 App 扫描二维码进行授权登录。' }}</p>
                </div>
              </div>

              <div class="account-card__actions account-card__actions--qr">
                <button
                  type="button"
                  class="account-secondary-button"
                  data-testid="detail-mode-qr"
                  :disabled="!canStartAttempt"
                  @click="handleStartQrAttempt"
                >
                  <span class="material-symbols-outlined">refresh</span>
                  <span>{{ isStartingAttempt && connectForm.connectionMethod === 'qr_login' ? '生成中…' : '刷新二维码' }}</span>
                </button>
              </div>
            </section>

            <section class="account-card account-card--token">
              <div class="account-card__row account-card__row--compact">
                <h3>
                  <span class="material-symbols-outlined account-section-icon account-section-icon--blue">key</span>
                  <span>访问凭证 (Token)</span>
                </h3>
              </div>

              <div v-if="hasStoredActiveToken && !connectForm.tokenValue.trim()" class="account-token-saved">
                <span class="material-symbols-outlined">verified_user</span>
                <div>
                  <strong>当前生效令牌已保存</strong>
                  <p>出于安全原因不回显明文。输入新的 Token 后保存，将覆盖当前凭证。</p>
                </div>
              </div>

              <label class="account-token-field">
                <span class="material-symbols-outlined account-token-field__leading">lock</span>
                <textarea
                  v-model="connectForm.tokenValue"
                  data-testid="detail-token-input"
                  rows="1"
                  :readonly="!canStartAttempt"
                  :placeholder="tokenInputPlaceholder"
                />
                <span class="material-symbols-outlined account-token-field__trailing">visibility</span>
              </label>

              <div class="account-token-meta">
                <span>
                  当前生效令牌：{{ account.activeToken.hasToken ? '已保存（不回显明文）' : '未配置' }}
                </span>
                <span v-if="account.activeToken.updatedAtLabel">
                  最近更新：{{ account.activeToken.updatedAtLabel }}
                </span>
              </div>

              <div class="account-card__actions">
                <button
                  type="button"
                  class="account-primary-button"
                  data-testid="detail-start-attempt"
                  :disabled="!canStartAttempt"
                  @click="handleStartManualAttempt"
                >
                  <span>{{ isStartingAttempt ? '处理中…' : '保存凭证配置' }}</span>
                </button>
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
                    <span class="material-symbols-outlined">
                      {{ account.loginStatus === 'connected' ? 'check_circle' : account.loginStatus === 'connecting' ? 'sync' : 'wifi_tethering_error' }}
                    </span>
                    <span class="account-status__indicator" />
                  </div>
                  <div class="account-status__summary">
                    <h4>{{ account.state.label }}</h4>
                    <p>{{ account.state.detail }}</p>
                  </div>
                  <div class="account-status__meta">
                    <div class="account-status__meta-item">
                      <span>认证状态</span>
                      <strong>{{ resolveLoginLabel(account.loginStatus) }}</strong>
                    </div>
                    <div class="account-status__meta-item">
                      <span>可用性</span>
                      <strong>{{ resolveAvailabilityLabel(account.availabilityStatus) }}</strong>
                    </div>
                  </div>
                </div>
              </div>

              <button
                type="button"
                class="account-secondary-button"
                data-testid="detail-availability-check"
                :disabled="!canRunAvailabilityCheck"
                @click="handleAvailabilityCheck"
              >
                <span class="material-symbols-outlined">swap_calls</span>
                <span>{{ isCheckingAvailability ? '验证中…' : '验证连接' }}</span>
              </button>
            </section>

            <section class="account-console account-detail-console">
              <header class="account-console__header">
                <div>
                  <span class="material-symbols-outlined">terminal</span>
                  <span>SYSTEM TERMINAL _</span>
                </div>
                <div class="account-console__tools">
                  <span class="material-symbols-outlined">delete_sweep</span>
                  <span class="material-symbols-outlined">content_copy</span>
                </div>
              </header>

              <div v-if="currentAttempt" class="account-console__summary">
                <div>
                  <span>当前连接尝试</span>
                  <strong>{{ currentAttempt.attemptId }}</strong>
                </div>
                <div>
                  <span>连接方式</span>
                  <strong>{{ resolveConnectionMethodLabel(currentAttempt.connectionMethod) }}</strong>
                </div>
                <div>
                  <span>状态</span>
                  <strong>{{ currentAttempt.stateLabel }}</strong>
                </div>
                <div>
                  <span>最后更新</span>
                  <strong>{{ currentAttempt.updatedAtLabel ?? '未更新' }}</strong>
                </div>
              </div>

              <div
                v-if="currentAttemptLogs?.entries.length"
                class="account-console__body"
                data-testid="detail-log-console"
              >
                <div
                  v-for="(entry, index) in currentAttemptLogs.entries"
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
                  <span>Awaiting input stream...</span>
                </div>
              </div>

              <div v-else class="account-console__body account-console__body--empty">
                <div>这里会展示二维码生成、解析、令牌校验和可用性检查的结构化日志。</div>
                <div>发起一次连接尝试后，系统会按真实后端返回的日志逐条输出。</div>
                <div class="account-console__tail">
                  <span>_</span>
                  <span>Awaiting first attempt...</span>
                </div>
              </div>

              <div class="account-console__footnotes">
                <p v-if="account.loginStatusReason">登录说明：{{ account.loginStatusReason }}</p>
                <p v-if="account.availabilityStatusReason">可用性说明：{{ account.availabilityStatusReason }}</p>
                <p v-if="currentAttempt?.attemptStatusReason">尝试说明：{{ currentAttempt.attemptStatusReason }}</p>
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
}

.account-detail-side {
  grid-template-rows: auto minmax(0, 1fr);
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
  gap: 1.1rem;
  margin-top: 0;
  padding: 1.45rem 0 0.5rem;
  border: 0;
  background: transparent;
  justify-items: center;
}

.account-qr-inline__image {
  display: grid;
  place-items: center;
  width: min(100%, 11.25rem);
  padding: 0.55rem;
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
  font-size: 2.1rem !important;
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
  text-align: center;
  max-width: 13rem;
}

.account-qr-inline__content strong,
.account-qr-inline__content p {
  margin: 0;
}

.account-qr-inline__content p {
  color: #adaaaa;
  font-size: 0.74rem;
  line-height: 1.55;
}

.account-card--qr {
  display: flex;
  flex-direction: column;
  align-items: center;
  background: #131313;
  text-align: center;
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
}

.account-detail-side > .account-card > .account-secondary-button:first-of-type {
  margin-top: 1.5rem;
}

.account-detail-console {
  min-width: 0;
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
  min-height: 22rem;
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
  padding: 1rem 1rem 1.15rem;
  overflow: auto;
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  line-height: 1.75;
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
}
</style>
