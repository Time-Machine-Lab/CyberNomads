<script setup lang="ts">
import { computed, reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import {
  finalizeAccountOnboardingSession,
  isRealAccountApiEnabled,
  resolveAccountOnboardingSession,
  startAccountOnboardingSession,
} from '@/entities/account/api/account-service'
import type { AccountOnboardingSessionDetailDto } from '@/entities/account/model/types'

type FeedbackTone = 'info' | 'success' | 'error'

const router = useRouter()
const usesRealAccountApi = isRealAccountApiEnabled()

const form = reactive({
  platform: 'bilibili',
  authorizationMethod: 'token_input',
  tokenValue: '',
})

const session = ref<AccountOnboardingSessionDetailDto | null>(null)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('info')
const isStarting = ref(false)
const isResolving = ref(false)
const isFinalizing = ref(false)

const isManualTokenMode = computed(() => form.authorizationMethod === 'token_input')
const challengeImageUrl = computed(() => {
  const challenge = session.value?.challenge
  return challenge && typeof challenge.imageUrl === 'string' ? challenge.imageUrl : null
})
const challengeMessage = computed(() => {
  const challenge = session.value?.challenge
  return challenge && typeof challenge.message === 'string' ? challenge.message : null
})
const canResolve = computed(
  () =>
    usesRealAccountApi &&
    Boolean(session.value) &&
    (session.value?.sessionStatus === 'pending_resolution' ||
      session.value?.sessionStatus === 'resolution_failed'),
)
const canFinalize = computed(
  () => usesRealAccountApi && session.value?.sessionStatus === 'resolved',
)

function setFeedback(message: string, tone: FeedbackTone) {
  feedbackMessage.value = message
  feedbackTone.value = tone
}

async function handleStart() {
  if (!usesRealAccountApi) {
    setFeedback('当前未启用账号模块真实后端，新增账号流程不可用。', 'error')
    return
  }

  if (isManualTokenMode.value && !form.tokenValue.trim()) {
    setFeedback('请输入令牌内容。', 'error')
    return
  }

  isStarting.value = true

  try {
    const startedSession = await startAccountOnboardingSession({
      platform: form.platform,
      authorizationMethod: form.authorizationMethod,
      expectedCredentialType: 'token',
      payload: isManualTokenMode.value
        ? {
            credentialPayload: {
              token: form.tokenValue.trim(),
            },
          }
        : {},
    })

    session.value = startedSession

    if (isManualTokenMode.value) {
      await handleResolve()
      return
    }

    setFeedback('二维码 challenge 已生成，扫码后点击“解析令牌”。', 'success')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '账号接入会话创建失败。', 'error')
  } finally {
    isStarting.value = false
  }
}

async function handleResolve() {
  if (!session.value) {
    return
  }

  isResolving.value = true

  try {
    session.value = await resolveAccountOnboardingSession(session.value.sessionId, {
      resolutionPayload: {},
    })

    if (session.value.sessionStatus === 'resolved') {
      setFeedback('平台身份与令牌已解析成功，可以完成接入。', 'success')
      return
    }

    setFeedback(session.value.sessionStatusReason ?? '令牌解析未完成，请重试。', 'error')
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '令牌解析失败。', 'error')
  } finally {
    isResolving.value = false
  }
}

async function handleFinalize() {
  if (!session.value) {
    return
  }

  isFinalizing.value = true

  try {
    const result = await finalizeAccountOnboardingSession(session.value.sessionId)
    setFeedback(
      result.finalDisposition === 'existing'
        ? '命中已存在账号，正在跳转到账号详情。'
        : result.finalDisposition === 'restored'
          ? '已恢复原账号并写入当前令牌，正在跳转。'
          : '账号已创建并写入当前令牌，正在跳转。',
      'success',
    )
    await router.push(`/accounts/${result.accountId}`)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '完成账号接入失败。', 'error')
  } finally {
    isFinalizing.value = false
  }
}
</script>

<template>
  <section class="account-onboarding-page">
    <main class="account-onboarding-main">
      <div class="account-onboarding-context">
        <RouterLink to="/accounts" class="account-onboarding-context__back">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>返回账号池</span>
        </RouterLink>
        <span class="account-onboarding-context__crumb">/ 账号池 / 新增账号</span>
      </div>

      <section class="account-onboarding-hero">
        <div>
          <h1>新增账号</h1>
          <p>统一令牌接入流程。先拿到 challenge 或提交令牌，再解析平台身份，最后创建或恢复账号。</p>
        </div>
      </section>

      <section
        v-if="feedbackMessage || !usesRealAccountApi"
        class="account-onboarding-banner"
        :class="`account-onboarding-banner--${usesRealAccountApi ? feedbackTone : 'error'}`"
      >
        <strong>{{ usesRealAccountApi ? '当前状态' : '不可用' }}</strong>
        <p>
          {{
            usesRealAccountApi
              ? feedbackMessage
              : '当前未启用账号模块真实后端，请开启 VITE_USE_REAL_ACCOUNT_API 后再使用新增账号流程。'
          }}
        </p>
      </section>

      <div class="account-onboarding-grid">
        <section class="account-onboarding-card">
          <h3>
            <span class="material-symbols-outlined">person_add</span>
            <span>启动接入</span>
          </h3>

          <label class="account-onboarding-field">
            <span>目标平台</span>
            <div class="account-onboarding-select">
              <select v-model="form.platform" :disabled="isStarting || isResolving || isFinalizing">
                <option value="bilibili">Bilibili</option>
              </select>
              <span class="material-symbols-outlined">expand_more</span>
            </div>
          </label>

          <label class="account-onboarding-field">
            <span>接入方式</span>
            <div class="account-onboarding-select">
              <select v-model="form.authorizationMethod" :disabled="isStarting || isResolving || isFinalizing">
                <option value="token_input">手工录入令牌</option>
                <option value="qr_authorization">扫码接入令牌</option>
              </select>
              <span class="material-symbols-outlined">expand_more</span>
            </div>
          </label>

          <label v-if="isManualTokenMode" class="account-onboarding-field">
            <span>令牌内容</span>
            <textarea
              v-model="form.tokenValue"
              rows="6"
              :readonly="isStarting || isResolving || isFinalizing"
              placeholder="粘贴平台令牌，系统会先解析身份，再决定创建或恢复账号。"
            />
          </label>

          <button
            type="button"
            class="account-onboarding-primary"
            :disabled="isStarting || isResolving || isFinalizing"
            @click="handleStart"
          >
            <span class="material-symbols-outlined">
              {{ isManualTokenMode ? 'key' : 'qr_code_scanner' }}
            </span>
            <span>
              {{
                isStarting
                  ? '启动中…'
                  : isManualTokenMode
                    ? '解析令牌'
                    : '获取二维码'
              }}
            </span>
          </button>
        </section>

        <section class="account-onboarding-card">
          <h3>
            <span class="material-symbols-outlined">hub</span>
            <span>接入结果</span>
          </h3>

          <div v-if="!session" class="account-onboarding-empty">
            <strong>还没有接入会话</strong>
            <p>先选择平台和接入方式，启动一次会话。</p>
          </div>

          <template v-else>
            <div class="account-onboarding-state">
              <div>
                <span>会话状态</span>
                <strong>{{ session.sessionStatus }}</strong>
              </div>
              <div>
                <span>目标平台</span>
                <strong>{{ session.platform }}</strong>
              </div>
              <div>
                <span>接入方式</span>
                <strong>{{ session.authorizationMethod }}</strong>
              </div>
            </div>

            <div v-if="challengeImageUrl || challengeMessage" class="account-onboarding-challenge">
              <img v-if="challengeImageUrl" :src="challengeImageUrl" alt="二维码 challenge" />
              <p>{{ challengeMessage ?? '二维码已生成。' }}</p>
            </div>

            <div v-if="session.resolvedIdentity" class="account-onboarding-result">
              <div>
                <span>解析平台 UID</span>
                <strong>{{ session.resolvedIdentity.platformAccountUid }}</strong>
              </div>
              <div>
                <span>解析显示名</span>
                <strong>{{ session.resolvedProfile?.displayName ?? '未返回' }}</strong>
              </div>
              <div>
                <span>候选令牌</span>
                <strong>{{ session.hasCandidateCredential ? session.candidateCredentialType ?? '已生成' : '未生成' }}</strong>
              </div>
            </div>

            <div class="account-onboarding-actions">
              <button
                type="button"
                class="account-onboarding-secondary"
                :disabled="!canResolve || isResolving || isFinalizing"
                @click="handleResolve"
              >
                <span class="material-symbols-outlined">autorenew</span>
                <span>{{ isResolving ? '解析中…' : '解析令牌' }}</span>
              </button>

              <button
                type="button"
                class="account-onboarding-primary"
                :disabled="!canFinalize || isFinalizing"
                @click="handleFinalize"
              >
                <span class="material-symbols-outlined">done_all</span>
                <span>{{ isFinalizing ? '接入中…' : '完成接入' }}</span>
              </button>
            </div>
          </template>
        </section>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.account-onboarding-page {
  min-height: 100vh;
  color: #fff;
}

.account-onboarding-main {
  width: min(100%, 88rem);
  margin: 0 auto;
  padding: clamp(1.25rem, 2vw, 2rem);
}

.account-onboarding-context {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 1.5rem;
  color: #8b8888;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
}

.account-onboarding-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  padding: 0.58rem 0.92rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  color: #fff;
  background: rgb(19 19 19 / 0.72);
}

.account-onboarding-hero {
  margin-bottom: 1.25rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 1.25rem;
  background:
    radial-gradient(circle at top right, rgb(143 245 255 / 0.08), transparent 16rem),
    #131313;
}

.account-onboarding-hero h1 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(2.3rem, 3vw, 3rem);
}

.account-onboarding-hero p {
  margin: 0.5rem 0 0;
  color: #adaaaa;
}

.account-onboarding-banner {
  margin-bottom: 1.25rem;
  padding: 1rem 1.1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 1rem;
  background: #151515;
}

.account-onboarding-banner strong,
.account-onboarding-banner p {
  margin: 0;
}

.account-onboarding-banner p {
  margin-top: 0.35rem;
  color: #c7c5c5;
}

.account-onboarding-banner--success {
  border-color: rgb(143 245 255 / 0.26);
}

.account-onboarding-banner--error {
  border-color: rgb(255 113 108 / 0.26);
}

.account-onboarding-grid {
  display: grid;
  grid-template-columns: minmax(0, 0.95fr) minmax(0, 1.05fr);
  gap: 1rem;
}

.account-onboarding-card {
  padding: 1.25rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 1.2rem;
  background: #131313;
  box-shadow: var(--cn-shadow-soft);
}

.account-onboarding-card h3 {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  margin: 0 0 1rem;
  font-family: var(--cn-font-display);
}

.account-onboarding-field {
  display: flex;
  flex-direction: column;
  gap: 0.45rem;
  margin-bottom: 1rem;
}

.account-onboarding-field span {
  color: #b7b3b3;
  font-size: 0.86rem;
}

.account-onboarding-field textarea,
.account-onboarding-select select {
  width: 100%;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 0.9rem;
  color: #fff;
  background: #1b1a1a;
}

.account-onboarding-field textarea {
  min-height: 8rem;
  padding: 0.9rem 1rem;
  resize: vertical;
}

.account-onboarding-select {
  position: relative;
}

.account-onboarding-select select {
  min-height: 3rem;
  padding: 0 2.8rem 0 1rem;
  appearance: none;
}

.account-onboarding-select .material-symbols-outlined {
  position: absolute;
  top: 50%;
  right: 0.9rem;
  transform: translateY(-50%);
  color: #8b8888;
  pointer-events: none;
}

.account-onboarding-primary,
.account-onboarding-secondary {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  padding: 0 1.1rem;
  border-radius: 0.85rem;
  font-family: var(--cn-font-display);
  font-weight: 700;
}

.account-onboarding-primary {
  color: #07353b;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
}

.account-onboarding-secondary {
  color: #fff;
  background: #212020;
}

.account-onboarding-primary:disabled,
.account-onboarding-secondary:disabled {
  cursor: not-allowed;
  opacity: 0.6;
}

.account-onboarding-empty {
  color: #adaaaa;
}

.account-onboarding-empty strong,
.account-onboarding-empty p {
  margin: 0;
}

.account-onboarding-empty p {
  margin-top: 0.45rem;
}

.account-onboarding-state,
.account-onboarding-result {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.75rem;
  margin-bottom: 1rem;
}

.account-onboarding-state div,
.account-onboarding-result div {
  padding: 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.9rem;
  background: #181717;
}

.account-onboarding-state span,
.account-onboarding-result span {
  display: block;
  margin-bottom: 0.35rem;
  color: #8b8888;
  font-size: 0.78rem;
}

.account-onboarding-state strong,
.account-onboarding-result strong {
  display: block;
  word-break: break-word;
}

.account-onboarding-challenge {
  display: grid;
  gap: 0.75rem;
  margin-bottom: 1rem;
  padding: 1rem;
  border: 1px dashed rgb(143 245 255 / 0.28);
  border-radius: 1rem;
  background: rgb(143 245 255 / 0.04);
  justify-items: center;
}

.account-onboarding-challenge img {
  width: min(100%, 16rem);
  border-radius: 1rem;
  background: #fff;
}

.account-onboarding-challenge p {
  margin: 0;
  color: #d8f9fc;
  text-align: center;
}

.account-onboarding-actions {
  display: flex;
  gap: 0.75rem;
}

@media (max-width: 900px) {
  .account-onboarding-grid {
    grid-template-columns: 1fr;
  }

  .account-onboarding-state,
  .account-onboarding-result {
    grid-template-columns: 1fr;
  }

  .account-onboarding-actions {
    flex-direction: column;
  }
}
</style>
