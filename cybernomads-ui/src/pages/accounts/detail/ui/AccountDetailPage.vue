<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  deleteAccount,
  getAccountById,
  isRealAccountApiEnabled,
  restoreAccount,
  runAvailabilityCheck,
  startAuthorizationAttempt,
  updateAccount,
  verifyAuthorizationAttempt,
} from '@/entities/account/api/account-service'
import type {
  AccountDetailRecord,
  AuthorizationAttemptStatus,
  AuthorizationStatus,
  AvailabilityStatus,
  JsonObject,
  LifecycleStatus,
} from '@/entities/account/model/types'

type FeedbackTone = 'info' | 'success' | 'error'

const route = useRoute()
const usesRealAccountApi = isRealAccountApiEnabled()

const account = ref<AccountDetailRecord | null>(null)
const isLoading = ref(false)
const pageError = ref('')
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const isSavingProfile = ref(false)
const isSubmittingCredential = ref(false)
const isCheckingAvailability = ref(false)
const isUpdatingLifecycle = ref(false)
const qrChallenge = ref<JsonObject | null>(null)
const qrAttemptId = ref<string | null>(null)

const profileForm = reactive({
  displayName: '',
  remark: '',
  tagsText: '',
  platformMetadataText: '{}',
})

const credentialForm = reactive({
  authorizationMethod: 'token_input',
  credentialValue: '',
})

const backTo = computed(() => String(route.meta.backTo ?? '/accounts'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回账号池'))
const accountId = computed(() => String(route.params.accountId ?? ''))
const isDeleted = computed(() => account.value?.lifecycleStatus === 'deleted')
const canEditProfile = computed(() => usesRealAccountApi && Boolean(account.value) && !isDeleted.value)
const canSubmitCredential = computed(() => usesRealAccountApi && Boolean(account.value) && !isDeleted.value)
const canResolveQrAuthorization = computed(
  () =>
    usesRealAccountApi &&
    Boolean(account.value) &&
    Boolean(qrAttemptId.value) &&
    credentialForm.authorizationMethod === 'qr_authorization' &&
    !isDeleted.value,
)
const canRunAvailabilityCheck = computed(
  () =>
    usesRealAccountApi &&
    Boolean(account.value) &&
    account.value?.lifecycleStatus === 'active' &&
    account.value.authorizationStatus === 'authorized' &&
    account.value.activeCredential.hasCredential,
)
const canToggleLifecycle = computed(() => usesRealAccountApi && Boolean(account.value))
const lifecycleActionLabel = computed(() =>
  isDeleted.value ? '恢复账号' : '逻辑删除账号',
)
const credentialFieldLabel = computed(() => '令牌内容')
const credentialPrimaryActionLabel = computed(() =>
  credentialForm.authorizationMethod === 'qr_authorization' ? '获取二维码' : '验证并替换当前令牌',
)

function setFeedback(message: string, tone: FeedbackTone) {
  feedbackMessage.value = message
  feedbackTone.value = tone
}

function syncProfileForm(detail: AccountDetailRecord) {
  profileForm.displayName = detail.displayName
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

async function loadAccount() {
  isLoading.value = true
  pageError.value = ''

  try {
    const detail = await getAccountById(accountId.value)
    account.value = detail

    if (detail) {
      syncProfileForm(detail)

      if (
        detail.authorizationAttempt?.authorizationMethod === 'qr_authorization' &&
        detail.authorizationAttempt.attemptStatus === 'pending_verification'
      ) {
        qrAttemptId.value = detail.authorizationAttempt.attemptId
      } else {
        qrAttemptId.value = null
      }
    }
  } catch (error) {
    pageError.value = error instanceof Error ? error.message : '账号详情加载失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

watch(
  accountId,
  () => {
    void loadAccount()
  },
  { immediate: true },
)

watch(
  () => credentialForm.authorizationMethod,
  (nextMethod) => {
    if (nextMethod !== 'qr_authorization') {
      qrChallenge.value = null
      qrAttemptId.value = null
    }
  },
)

async function handleSaveProfile() {
  if (!account.value) {
    return
  }

  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，资料保存已禁用。', 'error')
    return
  }

  const displayName = profileForm.displayName.trim()

  if (!displayName) {
    setFeedback('显示名不能为空。', 'error')
    return
  }

  let platformMetadata: JsonObject

  try {
    platformMetadata = parseJsonObject(profileForm.platformMetadataText, '平台扩展字段')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '平台扩展字段格式不正确。', 'error')
    return
  }

  isSavingProfile.value = true

  try {
    const detail = await updateAccount(account.value.id, {
      displayName,
      remark: profileForm.remark.trim() || null,
      tags: parseTags(profileForm.tagsText),
      platformMetadata,
    })

    account.value = detail
    syncProfileForm(detail)
    setFeedback('基础资料已保存，并已刷新为后端确认结果。', 'success')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '基础资料保存失败。', 'error')
  } finally {
    isSavingProfile.value = false
  }
}

async function handleSubmitCredential() {
  if (!account.value) {
    return
  }

  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，凭证接入已禁用。', 'error')
    return
  }

  const credentialValue = credentialForm.credentialValue.trim()

  if (credentialForm.authorizationMethod !== 'qr_authorization' && !credentialValue) {
    setFeedback(`${credentialFieldLabel.value}不能为空。`, 'error')
    return
  }

  let platformMetadata: JsonObject

  try {
    platformMetadata = parseJsonObject(profileForm.platformMetadataText, '平台扩展字段')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '平台扩展字段格式不正确。', 'error')
    return
  }

  isSubmittingCredential.value = true

  try {
    const attempt = await startAuthorizationAttempt(account.value.id, {
      authorizationMethod: credentialForm.authorizationMethod,
      expectedCredentialType: credentialForm.authorizationMethod === 'qr_authorization' ? null : 'token',
      payload:
        credentialForm.authorizationMethod === 'qr_authorization'
          ? {}
          : {
              displayName: profileForm.displayName.trim() || account.value.displayName,
              platformMetadata,
              credentialPayload: {
                token: credentialValue,
              },
            },
    })

    qrAttemptId.value = attempt.attemptId

    if (credentialForm.authorizationMethod === 'qr_authorization') {
      qrChallenge.value = attempt.challenge
      await loadAccount()
      setFeedback(
        attempt.challenge
          ? '二维码已生成，扫码后点击“解析令牌并替换当前令牌”。'
          : '扫码接入已启动，请在扫码后点击“解析令牌并替换当前令牌”。',
        'success',
      )
      return
    }

    const verification = await verifyAuthorizationAttempt(account.value.id, attempt.attemptId, {
      verificationPayload: {},
    })

    await loadAccount()
    qrChallenge.value = null
    qrAttemptId.value = null

    if (verification.verificationResult === 'succeeded') {
      credentialForm.credentialValue = ''
      setFeedback(
        verification.verificationReason ?? '凭证已验证成功，并已切换为当前生效凭证。',
        'success',
      )
      return
    }

    setFeedback(verification.verificationReason ?? '凭证验证失败，请检查输入后重试。', 'error')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '凭证验证流程执行失败。', 'error')
  } finally {
    isSubmittingCredential.value = false
  }
}

async function handleResolveQrAuthorization() {
  if (!account.value || !qrAttemptId.value) {
    return
  }

  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，扫码接入已禁用。', 'error')
    return
  }

  isSubmittingCredential.value = true

  try {
    const verification = await verifyAuthorizationAttempt(account.value.id, qrAttemptId.value, {
      verificationPayload: {},
    })

    await loadAccount()
    qrChallenge.value = null
    qrAttemptId.value = null

    if (verification.verificationResult === 'succeeded') {
      setFeedback(
        verification.verificationReason ?? '扫码令牌已验证成功，并已替换当前令牌。',
        'success',
      )
      return
    }

    setFeedback(verification.verificationReason ?? '扫码令牌解析失败，请稍后重试。', 'error')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '扫码令牌解析失败。', 'error')
  } finally {
    isSubmittingCredential.value = false
  }
}

async function handleAvailabilityCheck() {
  if (!account.value) {
    return
  }

  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，连接验证已禁用。', 'error')
    return
  }

  isCheckingAvailability.value = true

  try {
    const result = await runAvailabilityCheck(account.value.id)
    await loadAccount()
    setFeedback(
      result.availabilityStatusReason ??
        (result.availabilityStatus === 'healthy' ? '连接验证通过。' : '连接验证已完成，但账号不可消费。'),
      result.availabilityStatus === 'healthy' ? 'success' : 'error',
    )
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '连接验证失败。', 'error')
  } finally {
    isCheckingAvailability.value = false
  }
}

async function handleLifecycleToggle() {
  if (!account.value) {
    return
  }

  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，删除与恢复已禁用。', 'error')
    return
  }

  isUpdatingLifecycle.value = true

  try {
    const nextDetail =
      account.value.lifecycleStatus === 'deleted'
        ? await restoreAccount(account.value.id)
        : await deleteAccount(account.value.id)

    account.value = nextDetail
    syncProfileForm(nextDetail)
    setFeedback(
      nextDetail.lifecycleStatus === 'deleted'
        ? '账号已逻辑删除。'
        : '账号已恢复为可管理状态。',
      'success',
    )
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '生命周期操作失败。', 'error')
  } finally {
    isUpdatingLifecycle.value = false
  }
}

function resolveLifecycleLabel(status: LifecycleStatus) {
  if (status === 'active') return '活跃'
  if (status === 'disabled') return '停用'
  return '已删除'
}

function resolveAuthorizationLabel(status: AuthorizationStatus) {
  if (status === 'authorized') return '已授权'
  if (status === 'authorizing') return '授权中'
  if (status === 'expired') return '授权过期'
  if (status === 'revoked') return '授权撤销'
  return '未授权'
}

function resolveAvailabilityLabel(status: AvailabilityStatus) {
  if (status === 'healthy') return '健康'
  if (status === 'risk') return '风险'
  if (status === 'restricted') return '受限'
  if (status === 'offline') return '离线'
  return '未知'
}

function resolveAttemptStatusLabel(status: AuthorizationAttemptStatus) {
  if (status === 'pending_verification') return '待验证'
  if (status === 'verification_succeeded') return '验证成功'
  if (status === 'verification_failed') return '验证失败'
  if (status === 'expired') return '已过期'
  return '已取消'
}
</script>

<template>
  <section class="account-detail-page">
    <main class="account-detail-main">
      <div class="account-detail-context">
        <RouterLink :to="backTo" class="account-detail-context__back">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>{{ backLabel }}</span>
        </RouterLink>
        <span class="account-detail-context__crumb">/ 账号池 / 账号配置</span>
      </div>

      <section v-if="pageError" class="account-banner account-banner--error">
        <strong>账号详情加载异常</strong>
        <p>{{ pageError }}</p>
      </section>

      <section v-else-if="isLoading" class="account-banner account-banner--info">
        <strong>正在加载账号详情</strong>
        <p>正在请求脱敏管理视图，请稍候。</p>
      </section>

      <section v-else-if="!account" class="account-banner account-banner--info">
        <strong>未找到对应账号</strong>
        <p>请确认路由中的账号 ID 是否正确，或返回账号池重新选择。</p>
      </section>

      <template v-else>
        <section v-if="feedbackMessage" class="account-banner" :class="`account-banner--${feedbackTone}`">
          <strong>{{ feedbackTone === 'error' ? '操作未完成' : '操作结果' }}</strong>
          <p>{{ feedbackMessage }}</p>
        </section>

        <header class="account-detail-header">
          <div>
            <h1>账户配置</h1>
            <p>
              <span class="account-detail-header__pulse" />
              <span>{{ account.state.label }} · {{ account.state.detail }}</span>
            </p>
          </div>

          <div class="account-detail-header__chips">
            <span>
              <span class="material-symbols-outlined">hub</span>
              <span>{{ resolveLifecycleLabel(account.lifecycleStatus) }}</span>
            </span>
            <span>
              <span class="material-symbols-outlined">verified_user</span>
              <span>{{ resolveAuthorizationLabel(account.authorizationStatus) }}</span>
            </span>
            <span>
              <span class="material-symbols-outlined">wifi_tethering</span>
              <span>{{ resolveAvailabilityLabel(account.availabilityStatus) }}</span>
            </span>
          </div>
        </header>

        <div class="account-detail-grid">
          <div class="account-detail-left">
            <section class="account-card account-card--profile">
              <div class="account-card__glow" />
              <div class="account-profile">
                <div class="account-profile__avatar">
                  <img v-if="account.avatarUrl" :src="account.avatarUrl" :alt="account.displayName" />
                  <div v-else class="account-profile__avatar-fallback">
                    <span class="material-symbols-outlined">smart_display</span>
                  </div>
                </div>

                <div class="account-profile__content">
                  <div class="account-profile__top">
                    <h2>{{ account.displayName }}</h2>
                    <span class="account-profile__platform">
                      <span class="material-symbols-outlined">{{ account.platformView.icon }}</span>
                      <span>{{ account.platformView.label }}</span>
                    </span>
                  </div>
                  <p>UID: {{ account.platformAccountUid }}</p>
                  <div class="account-profile__tags">
                    <span>{{ account.state.label }}</span>
                    <span>{{ resolveLifecycleLabel(account.lifecycleStatus) }}</span>
                    <span v-for="tag in account.tags.slice(0, 2)" :key="tag">{{ tag }}</span>
                  </div>
                </div>
              </div>
            </section>

            <section class="account-card">
              <h3>
                <span class="material-symbols-outlined">tune</span>
                <span>基础资料</span>
              </h3>

              <label class="account-field">
                <span>显示名</span>
                <input v-model="profileForm.displayName" type="text" :readonly="!canEditProfile" />
              </label>

              <label class="account-field">
                <span>账户备注</span>
                <input v-model="profileForm.remark" type="text" :readonly="!canEditProfile" />
              </label>

              <label class="account-field">
                <span>目标平台</span>
                <input :value="account.platformView.label" type="text" readonly />
              </label>

              <label class="account-field">
                <span>平台 UID</span>
                <input :value="account.platformAccountUid" type="text" readonly />
              </label>

              <label class="account-field">
                <span>标签分配</span>
                <input
                  v-model="profileForm.tagsText"
                  type="text"
                  :readonly="!canEditProfile"
                  placeholder="使用逗号分隔多个标签"
                />
                <small class="account-field__hint">只允许修改显示名、备注、标签和平台扩展字段。</small>
              </label>

              <label class="account-field">
                <span>平台扩展字段</span>
                <textarea
                  v-model="profileForm.platformMetadataText"
                  rows="6"
                  :readonly="!canEditProfile"
                  placeholder="输入 JSON 对象"
                />
                <small class="account-field__hint">这里用于承载平台特有的附加信息，不污染主体字段。</small>
              </label>

              <div class="account-card__actions">
                <button
                  type="button"
                  class="account-primary-button"
                  :disabled="isSavingProfile || !canEditProfile"
                  @click="handleSaveProfile"
                >
                  <span>{{ isSavingProfile ? '保存中…' : '保存基础资料' }}</span>
                </button>
              </div>
            </section>

            <section class="account-card">
              <div class="account-card__row">
                <h3>
                  <span class="material-symbols-outlined">key</span>
                  <span>令牌接入</span>
                </h3>
                <span class="account-card__tip">手工录入和扫码都走同一套令牌接入流程</span>
              </div>

              <label class="account-field">
                <span>接入方式</span>
                <div class="account-select">
                  <select v-model="credentialForm.authorizationMethod" :disabled="!canSubmitCredential">
                    <option value="token_input">手工录入令牌</option>
                    <option value="qr_authorization">扫码接入令牌</option>
                  </select>
                  <span class="material-symbols-outlined">expand_more</span>
                </div>
              </label>

              <label v-if="credentialForm.authorizationMethod !== 'qr_authorization'" class="account-field">
                <span>{{ credentialFieldLabel }}</span>
                <textarea
                  v-model="credentialForm.credentialValue"
                  rows="5"
                  :readonly="!canSubmitCredential"
                  placeholder="粘贴平台令牌，验证成功后才会替换当前令牌"
                />
                <small class="account-field__hint">前端只提交给授权流程，详情页不会展示原始令牌内容。</small>
              </label>

              <div v-else class="account-qr-inline">
                <div v-if="qrChallenge && typeof qrChallenge.imageUrl === 'string'" class="account-qr-inline__image">
                  <img :src="String(qrChallenge.imageUrl)" alt="扫码 challenge" />
                </div>
                <div class="account-qr-inline__content">
                  <strong>扫码接入令牌</strong>
                  <p>
                    {{
                      qrChallenge && typeof qrChallenge.message === 'string'
                        ? qrChallenge.message
                        : '先获取二维码，扫码完成后再解析并决定是否替换当前令牌。'
                    }}
                  </p>
                </div>
              </div>

              <div class="account-status__details account-status__details--compact">
                <div>
                  <span>当前生效凭证</span>
                  <strong>{{ account.activeCredential.hasCredential ? account.activeCredential.credentialType || '已存在' : '未配置' }}</strong>
                </div>
                <div>
                  <span>待验证授权</span>
                  <strong>{{ account.authorizationAttempt ? resolveAttemptStatusLabel(account.authorizationAttempt.attemptStatus) : '无' }}</strong>
                </div>
              </div>

              <button
                type="button"
                class="account-primary-button"
                :disabled="isSubmittingCredential || !canSubmitCredential"
                @click="handleSubmitCredential"
              >
                <span>{{ isSubmittingCredential ? '处理中…' : credentialPrimaryActionLabel }}</span>
              </button>

              <button
                v-if="credentialForm.authorizationMethod === 'qr_authorization'"
                type="button"
                class="account-secondary-button"
                :disabled="isSubmittingCredential || !canResolveQrAuthorization"
                @click="handleResolveQrAuthorization"
              >
                <span class="material-symbols-outlined">qr_code_scanner</span>
                <span>{{ isSubmittingCredential ? '解析中…' : '解析令牌并替换当前令牌' }}</span>
              </button>
            </section>
          </div>

          <div class="account-detail-right">
            <div class="account-detail-right__top">
              <section class="account-card">
                <h3>
                  <span class="material-symbols-outlined">wifi_tethering</span>
                  <span>连接状态</span>
                </h3>

                <div class="account-status" :class="`account-status--${account.state.tone}`">
                  <div class="account-status__icon">
                    <span class="material-symbols-outlined">check_circle</span>
                    <span class="account-status__indicator" />
                  </div>
                  <div>
                    <h4>{{ account.state.label }}</h4>
                    <p>{{ account.state.detail }}</p>
                  </div>
                </div>

                <div class="account-status__details">
                  <div>
                    <span>生命周期</span>
                    <strong>{{ resolveLifecycleLabel(account.lifecycleStatus) }}</strong>
                  </div>
                  <div>
                    <span>授权状态</span>
                    <strong>{{ resolveAuthorizationLabel(account.authorizationStatus) }}</strong>
                  </div>
                  <div>
                    <span>可用性</span>
                    <strong>{{ resolveAvailabilityLabel(account.availabilityStatus) }}</strong>
                  </div>
                  <div>
                    <span>最近授权</span>
                    <strong>{{ account.lastAuthorizedAtLabel ?? '未完成' }}</strong>
                  </div>
                  <div>
                    <span>最近校验</span>
                    <strong>{{ account.lastAvailabilityCheckedAtLabel ?? '未校验' }}</strong>
                  </div>
                </div>

                <button
                  type="button"
                  class="account-secondary-button"
                  :disabled="isCheckingAvailability || !canRunAvailabilityCheck"
                  @click="handleAvailabilityCheck"
                >
                  <span class="material-symbols-outlined">swap_calls</span>
                  <span>{{ isCheckingAvailability ? '验证中…' : '验证连接' }}</span>
                </button>

                <button
                  type="button"
                  class="account-secondary-button account-secondary-button--danger"
                  :disabled="isUpdatingLifecycle || !canToggleLifecycle"
                  @click="handleLifecycleToggle"
                >
                  <span class="material-symbols-outlined">
                    {{ account.lifecycleStatus === 'deleted' ? 'restore_from_trash' : 'delete' }}
                  </span>
                  <span>{{ isUpdatingLifecycle ? '处理中…' : lifecycleActionLabel }}</span>
                </button>
              </section>
            </div>

            <section class="account-console">
              <header class="account-console__header">
                <div>
                  <span class="material-symbols-outlined">terminal</span>
                  <span>Phase One Degraded Regions</span>
                </div>
                <div>
                  <button type="button" disabled>
                    <span class="material-symbols-outlined">visibility_off</span>
                  </button>
                </div>
              </header>

              <div class="account-console__body">
                <div>二维码图片、原始凭证回显、凭证历史记录和终端日志目前都没有发布后端契约。</div>
                <div>当前详情页只展示脱敏管理视图，并通过真实授权与可用性接口驱动状态更新。</div>
                <div v-if="account.authorizationStatusReason">授权说明：{{ account.authorizationStatusReason }}</div>
                <div v-if="account.availabilityStatusReason">可用性说明：{{ account.availabilityStatusReason }}</div>
                <div class="account-console__tail">
                  <span>_</span>
                  <span>{{ usesRealAccountApi ? 'Connected via /api proxy' : 'Mock preview mode' }}</span>
                </div>
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

.account-detail-main {
  width: min(100%, 96rem);
  margin: 0 auto;
  padding: clamp(1.25rem, 2vw, 2rem);
}

.account-detail-context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: #8b8888;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
}

.account-detail-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(72 72 71 / 0.2);
  padding: 0.58rem 0.92rem;
  border-radius: 999px;
  color: #fff;
  background: rgb(19 19 19 / 0.72);
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.account-detail-context__back:hover {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.3);
  background: rgb(38 38 38 / 0.9);
}

.account-detail-context__crumb {
  color: #767575;
  letter-spacing: 0.04em;
}

.account-detail-header {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1.25rem;
  margin-bottom: 1.5rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.account-banner {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.85rem;
  background: #151515;
}

.account-banner strong,
.account-banner p {
  margin: 0;
}

.account-banner p {
  margin-top: 0.35rem;
  color: #adaaaa;
  font-size: 0.84rem;
}

.account-banner--success {
  border-color: rgb(143 245 255 / 0.24);
  background: rgb(143 245 255 / 0.06);
}

.account-banner--error {
  border-color: rgb(255 113 108 / 0.24);
  background: rgb(255 113 108 / 0.08);
}

.account-detail-header h1,
.account-card h3,
.account-status h4 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.account-detail-header h1 {
  font-size: clamp(2rem, 4vw, 2.85rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.account-detail-header p {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.45rem 0 0;
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
  gap: 0.75rem;
}

.account-detail-header__chips span {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  padding: 0.34rem 0.65rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 0.45rem;
  background: #171717;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
}

.account-detail-grid,
.account-detail-left,
.account-detail-right,
.account-detail-right__top {
  display: grid;
  gap: 1.5rem;
}

.account-card,
.account-console {
  overflow: hidden;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
}

.account-card--profile {
  position: relative;
}

.account-card__glow {
  position: absolute;
  top: -2rem;
  right: -2rem;
  width: 8rem;
  height: 8rem;
  border-radius: 999px;
  background: rgb(143 245 255 / 0.06);
  filter: blur(40px);
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

.account-profile__avatar {
  position: relative;
  width: 5rem;
  height: 5rem;
  flex-shrink: 0;
}

.account-profile__avatar img {
  width: 100%;
  height: 100%;
  border: 2px solid #262626;
  border-radius: 0.9rem;
}

.account-profile__avatar-fallback {
  display: grid;
  place-items: center;
  width: 100%;
  height: 100%;
  border: 2px solid #262626;
  border-radius: 0.9rem;
  color: #8ff5ff;
  background: #131313;
}

.account-profile__avatar-fallback .material-symbols-outlined {
  font-size: 1.6rem;
}

.account-profile__avatar > .material-symbols-outlined {
  position: absolute;
  right: -0.2rem;
  bottom: -0.2rem;
  padding: 0.2rem;
  border: 1px solid rgb(72 72 71 / 0.5);
  border-radius: 999px;
  color: #8ff5ff;
  background: #262626;
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
  font-size: 1.4rem;
  font-weight: 700;
}

.account-profile__platform {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  padding: 0.3rem 0.6rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.45rem;
  color: #adaaaa;
  background: #201f1f;
  font-size: 0.72rem;
}

.account-profile__content p {
  margin: 0.4rem 0 1rem;
  color: #adaaaa;
}

.account-profile__tags {
  display: flex;
  gap: 0.5rem;
  flex-wrap: wrap;
}

.account-profile__tags span {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0 0.6rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.45rem;
  font-size: 0.72rem;
}

.account-profile__tags span:first-child {
  color: #c3f400;
  border-color: rgb(195 244 0 / 0.2);
}

.account-field {
  display: grid;
  gap: 0.45rem;
  margin-top: 1rem;
}

.account-field > span {
  color: #adaaaa;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.account-field input,
.account-field textarea,
.account-select select {
  width: 100%;
  border: 0;
  padding: 0.65rem 0;
  color: #fff;
  background: transparent;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
  outline: 0;
}

.account-field textarea {
  min-height: 6rem;
  resize: vertical;
  font-family: var(--cn-font-mono);
  line-height: 1.6;
}

.account-field__hint {
  color: #767575;
  font-size: 0.72rem;
}

.account-select {
  position: relative;
}

.account-select .material-symbols-outlined {
  position: absolute;
  top: 50%;
  right: 0;
  color: #767575;
  transform: translateY(-50%);
}

.account-tags {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem;
}

.account-tags button {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  border: 1px solid rgb(72 72 71 / 0.22);
  padding: 0.34rem 0.62rem;
  border-radius: 0.35rem;
  color: #adaaaa;
  background: #151515;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
}

.account-tags button:first-child {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.3);
}

.account-tags__add {
  border-style: dashed !important;
  color: #767575 !important;
  background: #131313 !important;
}

.account-card__actions {
  display: flex;
  gap: 0.75rem;
  margin-top: 1rem;
}

.account-card__tip {
  color: #767575;
  font-size: 0.72rem;
}

.account-qr-inline {
  display: grid;
  gap: 0.85rem;
  margin-top: 1rem;
  padding: 1rem;
  border: 1px dashed rgb(143 245 255 / 0.28);
  border-radius: 0.85rem;
  background: rgb(143 245 255 / 0.04);
}

.account-qr-inline__image {
  display: flex;
  justify-content: center;
}

.account-qr-inline__image img {
  width: min(100%, 13rem);
  border-radius: 0.85rem;
  background: #fff;
}

.account-qr-inline__content strong {
  display: block;
  margin-bottom: 0.35rem;
}

.account-qr-inline__content p {
  margin: 0;
  color: #cdebed;
  font-size: 0.8rem;
  line-height: 1.6;
}

.account-card__row button {
  border: 0;
  color: #8ff5ff;
  background: transparent;
  font-family: var(--cn-font-body);
  font-size: 0.76rem;
  font-weight: 500;
}

.account-token {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.25rem 0.75rem;
  margin-top: 1rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 0.6rem;
  background: #131313;
}

.account-token input {
  flex: 1;
  border: 0;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-mono);
  outline: 0;
}

.account-token button {
  border: 0;
  color: #767575;
  background: transparent;
}

.account-primary-button,
.account-secondary-button {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  width: 100%;
  border: 1px solid transparent;
  padding: 0.78rem 1rem;
  margin-top: 1rem;
  border-radius: 0.55rem;
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 600;
}

.account-primary-button:disabled,
.account-secondary-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.account-primary-button {
  color: #041316;
  background: #8ff5ff;
  border-color: rgb(143 245 255 / 0.26);
}

.account-secondary-button {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.3);
  background: rgb(143 245 255 / 0.05);
}

.account-secondary-button--danger {
  color: #ffb7b2;
  border-color: rgb(255 113 108 / 0.25);
  background: rgb(255 113 108 / 0.06);
}

.account-card--center {
  text-align: center;
}

.account-card--center h3 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: flex-start;
  margin-bottom: 1rem;
}

.account-qr {
  position: relative;
  display: grid;
  place-items: center;
  width: 10rem;
  height: 10rem;
  margin: 0 auto 1rem;
  border: 2px dashed rgb(143 245 255 / 0.4);
  border-radius: 0.75rem;
  background: #0e0e0e;
}

.account-qr__scan {
  position: absolute;
  top: 0;
  left: 0;
  width: 100%;
  height: 0.2rem;
  background: rgb(143 245 255 / 0.5);
  animation: scan 2s ease-in-out infinite;
}

.account-qr .material-symbols-outlined {
  color: #767575;
  font-size: 2.5rem;
}

.account-card--center p {
  max-width: 14rem;
  margin: 0 auto 1rem;
  color: #adaaaa;
  font-size: 0.78rem;
  line-height: 1.6;
}

.account-status {
  align-items: center;
  margin: 1rem 0 1.25rem;
}

.account-status__icon {
  position: relative;
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border: 2px solid #c3f400;
  border-radius: 999px;
  color: #c3f400;
  background: #262626;
  box-shadow: 0 0 12px rgb(143 245 255 / 0.3);
}

.account-status__indicator {
  position: absolute;
  top: 0.1rem;
  right: 0.1rem;
  width: 0.75rem;
  height: 0.75rem;
  border: 2px solid #1a1919;
  border-radius: 999px;
  background: #c3f400;
}

.account-status--warning .account-status__icon {
  border-color: #ffb800;
  color: #ffb800;
  background: #262626;
}

.account-status--warning .account-status__indicator {
  background: #ffb800;
}

.account-status--danger .account-status__icon {
  border-color: #ff716c;
  color: #ff716c;
  background: #262626;
}

.account-status--danger .account-status__indicator {
  background: #ff716c;
}

.account-status--muted .account-status__icon {
  border-color: #8b8888;
  color: #8b8888;
  background: #262626;
}

.account-status--muted .account-status__indicator {
  background: #8b8888;
}

.account-status--neutral .account-status__icon {
  border-color: #8ff5ff;
  color: #8ff5ff;
  background: #262626;
}

.account-status--neutral .account-status__indicator {
  background: #8ff5ff;
}

.account-status h4 {
  font-size: 1.15rem;
  font-weight: 700;
}

.account-status p {
  margin: 0.25rem 0 0;
  color: #adaaaa;
  font-size: 0.78rem;
}

.account-status__details {
  display: grid;
  gap: 0.75rem;
}

.account-status__details div {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding-bottom: 0.65rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.1);
  font-size: 0.86rem;
}

.account-status__details span {
  color: #adaaaa;
}

.account-status__details--compact {
  margin-top: 1rem;
}

.account-status__details strong {
  color: #fff;
}

.account-console {
  display: flex;
  flex-direction: column;
  min-height: 20rem;
  padding: 0;
  background: #0a0a0a;
}

.account-console__header {
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: #131313;
}

.account-console__header > div,
.account-console__header button {
  display: flex;
  gap: 0.45rem;
  align-items: center;
}

.account-console__header > div:first-child {
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.account-console__header button {
  border: 0;
  color: #767575;
  background: transparent;
}

.account-console__body {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
  line-height: 1.7;
}

.account-console__tail {
  display: flex;
  gap: 0.35rem;
  align-items: center;
  margin-top: 1rem;
  color: #565555;
}

.account-console__tail span:first-child {
  color: #8ff5ff;
}

@keyframes scan {
  0%,
  100% {
    transform: translateY(0);
  }

  50% {
    transform: translateY(9.3rem);
  }
}

@media (min-width: 1024px) {
  .account-detail-main {
    padding: 2rem;
  }

  .account-detail-header {
    flex-direction: row;
    justify-content: space-between;
    align-items: flex-end;
  }

  .account-detail-grid {
    grid-template-columns: 5fr 7fr;
  }

  .account-detail-right__top {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
