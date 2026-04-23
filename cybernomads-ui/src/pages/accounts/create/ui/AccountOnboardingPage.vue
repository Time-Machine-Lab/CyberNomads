<script setup lang="ts">
import { reactive, ref } from 'vue'
import { useRouter } from 'vue-router'

import { createAccount } from '@/entities/account/api/account-service'
import type { JsonObject } from '@/entities/account/model/types'

type FeedbackTone = 'info' | 'success' | 'error'

const router = useRouter()

const form = reactive({
  platform: 'bilibili',
  internalDisplayName: '',
  remark: '',
  tagsText: '',
  platformMetadataText: '{}',
})

const isSubmitting = ref(false)
const feedbackMessage = ref('')
const feedbackTone = ref<FeedbackTone>('info')

function setFeedback(message: string, tone: FeedbackTone) {
  feedbackMessage.value = message
  feedbackTone.value = tone
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

function parseJsonObject(rawValue: string): JsonObject {
  const normalized = rawValue.trim()

  if (!normalized) {
    return {}
  }

  let parsed: unknown

  try {
    parsed = JSON.parse(normalized)
  } catch {
    throw new Error('平台扩展字段必须是合法的 JSON 对象。')
  }

  if (!parsed || Array.isArray(parsed) || typeof parsed !== 'object') {
    throw new Error('平台扩展字段必须是 JSON 对象。')
  }

  return parsed as JsonObject
}

async function handleSubmit() {
  if (!form.internalDisplayName.trim()) {
    setFeedback('请输入内部显示名。', 'error')
    return
  }

  let platformMetadata: JsonObject

  try {
    platformMetadata = parseJsonObject(form.platformMetadataText)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '平台扩展字段格式错误。', 'error')
    return
  }

  isSubmitting.value = true

  try {
    const created = await createAccount({
      platform: form.platform,
      internalDisplayName: form.internalDisplayName.trim(),
      remark: form.remark.trim() || null,
      tags: parseTags(form.tagsText),
      platformMetadata,
    })

    setFeedback('账号已创建，正在进入详情页。', 'success')
    await router.push(`/accounts/${created.id}`)
  } catch (error) {
    setFeedback(error instanceof Error ? error.message : '账号创建失败，请稍后重试。', 'error')
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="account-create-page">
    <main class="account-create-main">
      <header class="account-create-hero">
        <div class="account-create-hero__title">
          <RouterLink to="/accounts" class="account-create-context__back" title="返回账号池">
            <span class="material-symbols-outlined">arrow_back</span>
          </RouterLink>
          <div>
            <h1>新增账号</h1>
            <p>
              <span class="account-create-hero__pulse" />
              <span>先建档，再到详情页完成令牌接入。</span>
            </p>
          </div>
        </div>

        <div class="account-create-hero__chips">
          <span>
            <span class="material-symbols-outlined">smart_display</span>
            <span>仅支持 Bilibili</span>
          </span>
          <span>
            <span class="material-symbols-outlined">token</span>
            <span>创建后默认未登录</span>
          </span>
        </div>
      </header>

      <section
        v-if="feedbackMessage"
        class="account-create-banner"
        :class="`account-create-banner--${feedbackTone}`"
      >
        <strong>{{ feedbackTone === 'error' ? '创建失败' : '当前状态' }}</strong>
        <p>{{ feedbackMessage }}</p>
      </section>

      <div class="account-create-layout">
        <form class="account-create-card account-create-card--form" @submit.prevent="handleSubmit">
          <div class="account-create-card__header">
            <h3>
              <span class="material-symbols-outlined">person_add</span>
              <span>快速建档</span>
            </h3>
            <p>填写最少必要信息，创建后再继续登录和校验。</p>
          </div>

          <div class="account-create-section-label">
            <span>基础信息</span>
            <small>带 <em>*</em> 的字段为必填</small>
          </div>

          <div class="account-create-grid">
            <label class="account-create-field account-create-field--platform">
              <span>目标平台 <em>*</em></span>
              <div class="account-create-select">
                <select v-model="form.platform" data-testid="create-platform" :disabled="isSubmitting">
                  <option value="bilibili">Bilibili</option>
                </select>
                <span class="material-symbols-outlined">expand_more</span>
              </div>
            </label>

            <label class="account-create-field account-create-field--name">
              <span>账号名称 <em>*</em></span>
              <input
                v-model="form.internalDisplayName"
                data-testid="create-internal-name"
                :disabled="isSubmitting"
                type="text"
                placeholder="例如：Bili 主运营号"
              />
              <small>这是你们在系统里识别这个账号的名称，不会被平台昵称覆盖。</small>
            </label>

            <label class="account-create-field">
              <span>备注</span>
              <textarea
                v-model="form.remark"
                data-testid="create-remark"
                :disabled="isSubmitting"
                rows="3"
                placeholder="例如：主号、评论互动号、素材测试号"
              />
              <small>补充这个账号的用途、角色或特殊说明。</small>
            </label>

            <label class="account-create-field">
              <span>标签</span>
              <input
                v-model="form.tagsText"
                data-testid="create-tags"
                :disabled="isSubmitting"
                type="text"
                placeholder="多个标签用逗号分隔，例如：主号, 科技"
              />
              <small>方便后续检索和筛选，建议填写 1 到 3 个标签。</small>
            </label>
          </div>

          <details class="account-create-advanced">
            <summary>高级设置</summary>
            <label class="account-create-field account-create-field--advanced">
              <span>平台扩展字段</span>
              <textarea
                v-model="form.platformMetadataText"
                data-testid="create-platform-metadata"
                :disabled="isSubmitting"
                rows="4"
                spellcheck="false"
                placeholder="输入 JSON 对象"
              />
              <small>平台特有的静态扩展信息统一放这里，不污染主体字段。</small>
            </label>
          </details>

          <div class="account-create-actions">
            <div class="account-create-inline-note">
              <span class="material-symbols-outlined">info</span>
              <span>账号创建后默认为未登录，后续在详情页完成令牌接入。</span>
            </div>

            <button
              type="submit"
              class="account-create-primary"
              data-testid="create-submit"
              :disabled="isSubmitting"
            >
              <span>{{ isSubmitting ? '创建中…' : '创建账号' }}</span>
            </button>
          </div>
        </form>

        <aside class="account-create-card account-create-card--tips">
          <div class="account-create-card__header account-create-card__header--compact">
            <h3>
              <span class="material-symbols-outlined">tips_and_updates</span>
              <span>建档后会发生什么</span>
            </h3>
          </div>

          <div class="account-create-tips">
            <div>
              <strong>1. 立即生成记录</strong>
              <p>账号会先进入账号池，状态为未登录。</p>
            </div>
            <div>
              <strong>2. 再去详情页登录</strong>
              <p>详情页里可以录入令牌，或者走扫码登录。</p>
            </div>
            <div>
              <strong>3. 校验成功才生效</strong>
              <p>只有平台校验通过，令牌才会替换当前生效值。</p>
            </div>
          </div>
        </aside>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.account-create-page {
  min-height: 100vh;
  color: #fff;
}

.account-create-page .material-symbols-outlined {
  font-family: 'Material Symbols Outlined', sans-serif;
  font-style: normal;
  font-weight: normal;
  line-height: 1;
}

.account-create-main {
  width: min(100%, 84rem);
  margin: 0 auto;
  padding: clamp(1rem, 2vw, 2rem);
}

.account-create-context__back {
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

.account-create-context__back:hover {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.3);
  background: #1b1a1a;
}

.account-create-hero {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem 1.5rem;
  align-items: flex-end;
  justify-content: space-between;
  padding-bottom: 1.25rem;
  margin-bottom: 1.25rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.account-create-hero__title {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.account-create-hero h1,
.account-create-card h3 {
  margin: 0;
  font-family: var(--cn-font-display);
}

.account-create-hero h1 {
  font-size: clamp(1.9rem, 3vw, 2.45rem);
  font-weight: 700;
  letter-spacing: -0.035em;
}

.account-create-hero p {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0.35rem 0 0;
  color: #adaaaa;
  font-size: 0.92rem;
}

.account-create-hero__pulse {
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: #c3f400;
  box-shadow: 0 0 10px rgb(195 244 0 / 0.6);
}

.account-create-hero__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
}

.account-create-hero__chips > span {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  padding: 0.45rem 0.8rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 999px;
  background: #201f1f;
  color: #d1cece;
  font-size: 0.76rem;
}

.account-create-banner {
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #151515;
}

.account-create-banner strong,
.account-create-banner p {
  margin: 0;
}

.account-create-banner p {
  margin-top: 0.35rem;
  color: #adaaaa;
  font-size: 0.8rem;
}

.account-create-banner--success {
  border-color: rgb(143 245 255 / 0.24);
  background: rgb(143 245 255 / 0.06);
}

.account-create-banner--error {
  border-color: rgb(255 113 108 / 0.24);
  background: rgb(255 113 108 / 0.08);
}

.account-create-layout {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(18rem, 0.44fr);
  gap: 1rem;
  align-items: start;
}

.account-create-card {
  display: grid;
  gap: 0.9rem;
  align-content: start;
  padding: 1.25rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #1a1919;
}

.account-create-card__header {
  display: grid;
  gap: 0.25rem;
}

.account-create-card__header h3 {
  display: flex;
  gap: 0.6rem;
  align-items: center;
}

.account-create-card__header p {
  margin: 0;
  color: #8b8888;
  font-size: 0.8rem;
  line-height: 1.55;
}

.account-create-card__header--compact {
  gap: 0;
}

.account-create-card--form {
  gap: 1rem;
}

.account-create-section-label {
  display: flex;
  flex-wrap: wrap;
  gap: 0.5rem 0.85rem;
  align-items: center;
  justify-content: space-between;
  padding: 0.2rem 0 0.1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.14);
}

.account-create-section-label > span {
  color: #fff;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  font-weight: 700;
  letter-spacing: 0.01em;
}

.account-create-section-label small {
  color: #8b8888;
  font-size: 0.72rem;
}

.account-create-section-label em {
  color: #ff716c;
  font-style: normal;
  font-weight: 700;
}

.account-create-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.85rem 1rem;
}

.account-create-field > span {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  color: #d1cece;
  font-size: 0.7rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.account-create-field > span em {
  color: #ff716c;
  font-style: normal;
  font-weight: 700;
  transform: translateY(-0.02rem);
}

.account-create-field {
  display: grid;
  gap: 0.4rem;
  padding: 0.15rem 0;
}

.account-create-field--platform,
.account-create-field--name {
  align-self: end;
}

.account-create-field input,
.account-create-field textarea,
.account-create-select select {
  width: 100%;
  border: 0;
  min-height: 2.8rem;
  padding: 0.55rem 0;
  color: #fff;
  background: transparent;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
  outline: 0;
  font-size: 0.95rem;
  transition:
    border-color var(--cn-transition),
    box-shadow var(--cn-transition),
    color var(--cn-transition);
}

.account-create-field textarea {
  min-height: 4.3rem;
  resize: vertical;
  font-family: var(--cn-font-mono);
  line-height: 1.55;
}

.account-create-field input:focus,
.account-create-field textarea:focus,
.account-create-select select:focus {
  outline: none;
  border-color: rgb(143 245 255 / 0.5);
  box-shadow: none;
}

.account-create-field small {
  color: #767575;
  font-size: 0.68rem;
  line-height: 1.45;
}

.account-create-select {
  position: relative;
}

.account-create-select span {
  position: absolute;
  top: 50%;
  right: 0;
  pointer-events: none;
  transform: translateY(-50%);
  color: #767575;
}

.account-create-advanced {
  border-top: 1px solid rgb(72 72 71 / 0.18);
  padding-top: 0.25rem;
}

.account-create-advanced summary {
  padding: 0.5rem 0;
  color: #adaaaa;
  font-size: 0.74rem;
  font-weight: 600;
  letter-spacing: 0.12em;
  list-style: none;
  text-transform: uppercase;
  cursor: pointer;
}

.account-create-advanced summary::-webkit-details-marker {
  display: none;
}

.account-create-advanced summary::after {
  float: right;
  color: #767575;
  content: '+';
}

.account-create-advanced[open] summary::after {
  content: '-';
}

.account-create-field--advanced {
  padding-bottom: 0.25rem;
}

.account-create-actions {
  display: grid;
  gap: 0.85rem;
  margin-top: 0.25rem;
}

.account-create-inline-note {
  display: flex;
  gap: 0.55rem;
  align-items: flex-start;
  padding: 0.75rem 0.85rem;
  border: 1px solid rgb(143 245 255 / 0.14);
  border-radius: 0.65rem;
  background: rgb(143 245 255 / 0.04);
  color: #d1cece;
  font-size: 0.78rem;
  line-height: 1.55;
}

.account-create-inline-note .material-symbols-outlined {
  margin-top: 0.05rem;
  color: #8ff5ff;
}

.account-create-primary {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  width: 100%;
  padding: 0 1.15rem;
  color: #07353b;
  border: none;
  border-radius: 0.65rem;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-family: var(--cn-font-body);
  font-size: 0.95rem;
  font-weight: 700;
  transition: transform var(--cn-transition);
}

.account-create-primary:hover:not(:disabled) {
  transform: translateY(-1px);
}

.account-create-primary:disabled {
  opacity: 0.55;
}

.account-create-card--tips {
  gap: 0.85rem;
  background: #171717;
}

.account-create-tips {
  display: grid;
  gap: 0.85rem;
}

.account-create-tips div {
  padding-bottom: 0.8rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.14);
}

.account-create-tips div:last-child {
  padding-bottom: 0;
  border-bottom: 0;
}

.account-create-tips strong {
  display: block;
  margin-bottom: 0.28rem;
  color: #fff;
  font-size: 0.84rem;
}

.account-create-tips p {
  margin: 0;
  color: #adaaaa;
  font-size: 0.76rem;
  line-height: 1.55;
}

@media (max-width: 900px) {
  .account-create-layout {
    grid-template-columns: 1fr;
  }

  .account-create-tips {
    grid-template-columns: repeat(3, minmax(0, 1fr));
    gap: 0.75rem;
  }

  .account-create-tips div {
    padding: 0;
    border-bottom: 0;
  }
}

@media (max-width: 640px) {
  .account-create-main {
    padding: 0.85rem;
  }

  .account-create-hero {
    gap: 0.85rem;
    margin-bottom: 1rem;
  }

  .account-create-hero__title {
    gap: 0.75rem;
  }

  .account-create-context__back {
    width: 2.75rem;
    height: 2.75rem;
  }

  .account-create-hero h1 {
    font-size: 1.85rem;
  }

  .account-create-hero p {
    font-size: 0.84rem;
  }

  .account-create-hero__chips {
    gap: 0.5rem;
  }

  .account-create-hero__chips > span {
    font-size: 0.72rem;
  }

  .account-create-card {
    padding: 1rem;
  }

  .account-create-grid {
    grid-template-columns: 1fr;
    gap: 0.7rem;
  }

  .account-create-section-label {
    align-items: flex-start;
    justify-content: flex-start;
  }

  .account-create-field input,
  .account-create-field textarea,
  .account-create-select select {
    min-height: 2.55rem;
    font-size: 0.9rem;
  }

  .account-create-field textarea {
    min-height: 3.5rem;
  }

  .account-create-tips {
    grid-template-columns: 1fr;
    gap: 0.65rem;
  }

  .account-create-actions {
    position: sticky;
    bottom: 0;
    z-index: 2;
    padding-top: 0.5rem;
    background: linear-gradient(180deg, rgb(26 25 25 / 0) 0%, rgb(26 25 25 / 0.92) 28%, #1a1919 100%);
  }
}
</style>
