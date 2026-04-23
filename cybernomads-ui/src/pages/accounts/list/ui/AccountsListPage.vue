<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRouter } from 'vue-router'

import { deleteAccount, listAccounts } from '@/entities/account/api/account-service'
import type { AccountPlatformColor, AccountRecord } from '@/entities/account/model/types'

type SummaryCardTone = 'primary' | 'red' | 'default' | 'blue'
type SummaryCardSignal = 'primary' | 'error' | 'muted'

interface PlatformSummaryCard {
  platform: string
  icon: string
  count: number
  detail: string
  tone: SummaryCardTone
  signal: SummaryCardSignal
}

const router = useRouter()
const accounts = ref<AccountRecord[]>([])
const isLoading = ref(false)
const errorMessage = ref('')
const pendingActionId = ref<string | null>(null)
const accountPendingDeletion = ref<AccountRecord | null>(null)

const overviewCard = computed<PlatformSummaryCard>(() => ({
  platform: '全部账号',
  icon: 'group',
  count: accounts.value.length,
  detail: accounts.value.length ? '当前账号池已接入真实后端数据' : '当前还没有账号包装对象',
  tone: 'default',
  signal: accounts.value.length ? 'primary' : 'muted',
}))

const platformSummary = computed<PlatformSummaryCard[]>(() => {
  const grouped = new Map<
    string,
    { label: string; icon: string; tone: SummaryCardTone; count: number; consumableCount: number; attentionCount: number }
  >()

  for (const account of accounts.value) {
    const key = account.platform
    const current = grouped.get(key)

    if (current) {
      current.count += 1
      current.consumableCount += account.isConsumable ? 1 : 0
      current.attentionCount += account.isConsumable ? 0 : 1
      continue
    }

    grouped.set(key, {
      label: account.platformView.label,
      icon: account.platformView.icon,
      tone: resolveSummaryTone(account.platformView.color),
      count: 1,
      consumableCount: account.isConsumable ? 1 : 0,
      attentionCount: account.isConsumable ? 0 : 1,
    })
  }

  return Array.from(grouped.values())
    .sort((left, right) => right.count - left.count)
    .slice(0, 4)
    .map((item) => ({
      platform: item.label,
      icon: item.icon,
      count: item.count,
      detail:
        item.attentionCount > 0 ? `${item.attentionCount} 个待处理` : `${item.consumableCount} 个可消费`,
      tone: item.tone,
      signal: item.attentionCount > 0 ? 'error' : item.count ? 'primary' : 'muted',
    }))
})

async function loadAccounts() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    accounts.value = await listAccounts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '账号列表加载失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

void loadAccounts()

function resolveSummaryTone(color: AccountPlatformColor): SummaryCardTone {
  if (color === 'primary') return 'primary'
  if (color === 'red') return 'red'
  if (color === 'blue') return 'blue'
  return 'default'
}

function resolveRowTone(account: AccountRecord) {
  if (account.state.tone === 'danger') return 'error'
  if (account.state.tone === 'warning') return 'warning'
  if (account.state.tone === 'muted') return 'muted'
  return 'primary'
}

function resolvePlatformColor(color: AccountPlatformColor) {
  if (color === 'primary') return 'primary'
  if (color === 'red') return 'red'
  if (color === 'blue') return 'blue'
  return 'default'
}

function resolveIdentityAvatar(account: AccountRecord) {
  return account.resolvedPlatformProfile.resolvedAvatarUrl
}

function resolveIdentitySubline(account: AccountRecord) {
  return account.remark || account.resolvedPlatformProfile.resolvedDisplayName || account.platformView.label
}

function resolvePlatformUid(account: AccountRecord) {
  return account.resolvedPlatformProfile.resolvedPlatformAccountUid ?? '待解析'
}

function resolveIdentityFallback(account: AccountRecord) {
  const label = account.internalDisplayName.trim()
  return label ? label.slice(0, 1).toUpperCase() : 'A'
}

function openAccount(accountId: string) {
  void router.push(`/accounts/${accountId}`)
}

function openCreateAccount() {
  void router.push('/accounts/new')
}

function openDeleteConfirm(account: AccountRecord) {
  if (account.lifecycleStatus === 'deleted') return
  accountPendingDeletion.value = account
}

function closeDeleteConfirm() {
  if (pendingActionId.value) return
  accountPendingDeletion.value = null
}

async function confirmDeleteAccount() {
  const account = accountPendingDeletion.value
  if (!account) return

  pendingActionId.value = account.id
  errorMessage.value = ''

  try {
    await deleteAccount(account.id)
    await loadAccounts()
    accountPendingDeletion.value = null
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '账号删除失败，请稍后重试。'
  } finally {
    pendingActionId.value = null
  }
}
</script>

<template>
  <section class="accounts-page">
    <div class="accounts-canvas">
      <header class="accounts-header">
        <div>
          <h1>账号池管理</h1>
          <p>样式沿用上一版账号池控制台，交互已切换为新的包装账号模型。</p>
        </div>

        <div class="accounts-header__actions">
          <button
            type="button"
            class="accounts-header__button accounts-header__button--secondary"
            data-testid="accounts-create-button"
            @click="openCreateAccount"
          >
            <span class="material-symbols-outlined">person_add</span>
            <span>添加账号</span>
          </button>

          <button type="button" class="accounts-header__button" :disabled="isLoading" @click="loadAccounts">
            <span class="material-symbols-outlined">refresh</span>
            <span>{{ isLoading ? '刷新中…' : '刷新列表' }}</span>
          </button>
        </div>
      </header>

      <section class="accounts-summary">
        <article class="summary-card" :class="`summary-card--${overviewCard.tone}`">
          <div class="summary-card__corner" />

          <div class="summary-card__top">
            <div class="summary-card__label">
              <span class="material-symbols-outlined">{{ overviewCard.icon }}</span>
              <span>{{ overviewCard.platform }}</span>
            </div>
            <span class="summary-card__dot" :class="`summary-card__dot--${overviewCard.signal}`" />
          </div>

          <strong>{{ overviewCard.count }}</strong>
          <p>{{ overviewCard.detail }}</p>
        </article>

        <article
          v-for="summary in platformSummary"
          :key="summary.platform"
          class="summary-card"
          :class="`summary-card--${summary.tone}`"
        >
          <div class="summary-card__corner" />

          <div class="summary-card__top">
            <div class="summary-card__label">
              <span class="material-symbols-outlined">{{ summary.icon }}</span>
              <span>{{ summary.platform }}</span>
            </div>
            <span class="summary-card__dot" :class="`summary-card__dot--${summary.signal}`" />
          </div>

          <strong>{{ summary.count }}</strong>
          <p :class="{ 'summary-card__detail--warning': summary.signal === 'error' }">{{ summary.detail }}</p>
        </article>
      </section>

      <section v-if="errorMessage" class="accounts-feedback accounts-feedback--error">
        <div>
          <strong>账号列表加载异常</strong>
          <p>{{ errorMessage }}</p>
        </div>
        <button type="button" @click="loadAccounts">重试</button>
      </section>

      <section v-else-if="isLoading" class="accounts-feedback">
        <div>
          <strong>正在加载账号列表</strong>
          <p>正在请求当前账号摘要，请稍候。</p>
        </div>
      </section>

      <section v-else-if="!accounts.length" class="accounts-feedback accounts-feedback--empty">
        <div>
          <strong>当前没有账号记录</strong>
          <p>先创建包装对象，再进入详情页完成令牌接入和日志查看。</p>
        </div>
        <button type="button" @click="openCreateAccount">新增账号</button>
      </section>

      <section v-else class="accounts-board">
        <div class="accounts-board__head">
          <span />
          <span>身份</span>
          <span>平台 UID</span>
          <span>标签</span>
          <span>状态</span>
          <span>最后更新</span>
          <span>操作</span>
        </div>

        <article
          v-for="account in accounts"
          :key="account.id"
          class="accounts-row"
          :class="`accounts-row--${resolveRowTone(account)}`"
          tabindex="0"
          role="link"
          @click="openAccount(account.id)"
          @keyup.enter="openAccount(account.id)"
          @keyup.space.prevent="openAccount(account.id)"
        >
          <div class="accounts-row__platform">
            <span
              class="material-symbols-outlined"
              :class="`accounts-row__platform-icon--${resolvePlatformColor(account.platformView.color)}`"
            >
              {{ account.platformView.icon }}
            </span>
          </div>

          <div class="accounts-row__identity">
            <div class="accounts-row__avatar">
              <img v-if="resolveIdentityAvatar(account)" :src="resolveIdentityAvatar(account)!" :alt="account.internalDisplayName" />
              <span v-else>{{ resolveIdentityFallback(account) }}</span>
            </div>
            <div class="accounts-row__identity-copy">
              <span>{{ account.internalDisplayName }}</span>
              <small>{{ resolveIdentitySubline(account) }}</small>
            </div>
          </div>

          <div class="accounts-row__mono">{{ resolvePlatformUid(account) }}</div>

          <div class="accounts-row__tag-list">
            <span v-if="account.tags.length" class="accounts-row__tag">{{ account.tags[0] }}</span>
            <span v-if="account.tags.length > 1" class="accounts-row__tag">+{{ account.tags.length - 1 }}</span>
            <span v-if="!account.tags.length" class="accounts-row__tag accounts-row__tag--empty">未分配</span>
          </div>

          <div class="accounts-row__status">
            <span class="accounts-row__status-dot" />
            <span>{{ account.state.label }}</span>
          </div>

          <div class="accounts-row__mono">{{ account.updatedAtLabel }}</div>

          <div class="accounts-row__actions">
            <button
              type="button"
              class="accounts-row__action-button accounts-row__action-button--delete"
              :disabled="account.lifecycleStatus === 'deleted' || pendingActionId === account.id"
              :title="account.lifecycleStatus === 'deleted' ? '账号已删除' : '删除账号'"
              @click.stop="openDeleteConfirm(account)"
            >
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </article>
      </section>
    </div>

    <teleport to="body">
      <div v-if="accountPendingDeletion" class="delete-dialog" role="presentation" @click.self="closeDeleteConfirm">
        <section class="delete-dialog__panel" role="dialog" aria-modal="true" aria-labelledby="delete-dialog-title">
          <div class="delete-dialog__icon">
            <span class="material-symbols-outlined">delete</span>
          </div>

          <div class="delete-dialog__copy">
            <p class="delete-dialog__eyebrow">删除账号</p>
            <h2 id="delete-dialog-title">确认删除这个账号吗？</h2>
            <p>
              账号「{{ accountPendingDeletion.internalDisplayName }}」删除后会从账号池可用列表中移除，后续调用方将无法继续消费它的令牌。
            </p>
          </div>

          <div class="delete-dialog__account">
            <span class="material-symbols-outlined">{{ accountPendingDeletion.platformView.icon }}</span>
            <div>
              <strong>{{ accountPendingDeletion.internalDisplayName }}</strong>
              <small>{{ accountPendingDeletion.platformView.label }} · {{ resolvePlatformUid(accountPendingDeletion) }}</small>
            </div>
          </div>

          <div class="delete-dialog__actions">
            <button type="button" class="delete-dialog__button delete-dialog__button--ghost" :disabled="!!pendingActionId" @click="closeDeleteConfirm">
              取消
            </button>
            <button
              type="button"
              class="delete-dialog__button delete-dialog__button--danger"
              :disabled="pendingActionId === accountPendingDeletion.id"
              @click="confirmDeleteAccount"
            >
              <span v-if="pendingActionId === accountPendingDeletion.id">删除中…</span>
              <span v-else>确认删除</span>
            </button>
          </div>
        </section>
      </div>
    </teleport>
  </section>
</template>

<style scoped lang="scss">
.accounts-page {
  min-height: 100vh;
  color: #fff;
  background: transparent;
}

.accounts-canvas {
  width: min(100%, 100rem);
  margin: 0 auto;
  padding: 2.3rem 2rem 3.4rem;
}

.accounts-header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1.4rem;
}

.accounts-header__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.accounts-header h1 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(2.5rem, 3vw, 3.3rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.accounts-header p {
  margin: 0.42rem 0 0;
  color: #adaaaa;
  font-size: 0.92rem;
}

.accounts-header__button {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1.2rem;
  border: 0;
  border-radius: 0.75rem;
  color: #005d63;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 0 0 16px rgb(143 245 255 / 0.22);
}

.accounts-header__button:disabled {
  cursor: wait;
  opacity: 0.75;
}

.accounts-header__button--secondary {
  color: #fff;
  background: #1f1f1f;
  box-shadow: none;
}

.accounts-summary {
  display: grid;
  grid-template-columns: repeat(5, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.summary-card {
  position: relative;
  min-height: 8.7rem;
  padding: 1.2rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 1rem;
  background: #131313;
  box-shadow: var(--cn-shadow-soft);
}

.summary-card__corner {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  width: 4rem;
  height: 4rem;
  border-radius: 0 0 0 999px;
  opacity: 0.5;
}

.summary-card--primary .summary-card__corner {
  background: rgb(143 245 255 / 0.08);
}

.summary-card--red .summary-card__corner {
  background: rgb(255 36 66 / 0.08);
}

.summary-card--default .summary-card__corner {
  background: rgb(255 255 255 / 0.06);
}

.summary-card--blue .summary-card__corner {
  background: rgb(29 161 242 / 0.08);
}

.summary-card__top {
  display: flex;
  align-items: center;
  justify-content: space-between;
  margin-bottom: 1rem;
}

.summary-card__label {
  display: flex;
  gap: 0.4rem;
  align-items: center;
  color: #adaaaa;
  font-size: 0.86rem;
}

.summary-card--primary .summary-card__label .material-symbols-outlined {
  color: #8ff5ff;
}

.summary-card--red .summary-card__label .material-symbols-outlined {
  color: #ff2442;
}

.summary-card--blue .summary-card__label .material-symbols-outlined {
  color: #1da1f2;
}

.summary-card__dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
}

.summary-card__dot--primary {
  background: #8ff5ff;
  box-shadow: 0 0 8px rgb(143 245 255 / 0.65);
}

.summary-card__dot--error {
  background: #ff716c;
  box-shadow: 0 0 8px rgb(255 113 108 / 0.65);
}

.summary-card__dot--muted {
  background: #484847;
}

.summary-card strong {
  display: block;
  font-family: var(--cn-font-display);
  font-size: 2rem;
  font-weight: 700;
}

.summary-card p {
  margin: 0.45rem 0 0;
  color: #adaaaa;
  font-size: 0.78rem;
}

.summary-card__detail--warning {
  color: #ff716c;
}

.accounts-feedback {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1.25rem 1.3rem;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 1rem;
  background: #131313;
  box-shadow: var(--cn-shadow-soft);
}

.accounts-feedback strong,
.accounts-feedback p {
  margin: 0;
}

.accounts-feedback p {
  margin-top: 0.35rem;
  color: #adaaaa;
  font-size: 0.82rem;
}

.accounts-feedback button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid rgb(143 245 255 / 0.2);
  border-radius: 0.75rem;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.08);
}

.accounts-feedback--error {
  border-color: rgb(255 113 108 / 0.22);
}

.accounts-feedback--error button {
  border-color: rgb(255 113 108 / 0.2);
  color: #ffb7b2;
  background: rgb(255 113 108 / 0.08);
}

.accounts-board {
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: var(--cn-shadow-ambient);
}

.accounts-board__head,
.accounts-row {
  display: grid;
  grid-template-columns: 3.4rem minmax(15rem, 1.7fr) minmax(9rem, 1fr) minmax(9rem, 0.95fr) minmax(9rem, 0.95fr) minmax(8.5rem, 0.9fr) 4.2rem;
  gap: 0.9rem;
}

.accounts-board__head {
  padding: 0.95rem 1.4rem 0.9rem;
  color: #767575;
  font-family: var(--cn-font-display);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.accounts-row {
  position: relative;
  align-items: center;
  min-height: 5.15rem;
  padding: 1rem 1.4rem;
  border: 0;
  color: #fff;
  background: transparent;
  cursor: pointer;
  text-align: left;
  transition: background-color var(--cn-transition);
}

.accounts-row + .accounts-row {
  border-top: 1px solid rgb(72 72 71 / 0.12);
}

.accounts-row:hover {
  background: #201f1f;
}

.accounts-row::before {
  content: '';
  position: absolute;
  inset: 0 auto 0 0;
  width: 2px;
  background: transparent;
  transition: background-color var(--cn-transition);
}

.accounts-row--primary:hover::before {
  background: #8ff5ff;
}

.accounts-row--error:hover::before {
  background: #ff716c;
}

.accounts-row--warning:hover::before {
  background: #ffb800;
}

.accounts-row--muted:hover::before {
  background: #767575;
}

.accounts-row__platform {
  display: flex;
  align-items: center;
  justify-content: center;
}

.accounts-row__platform .material-symbols-outlined {
  font-size: 1.35rem;
}

.accounts-row__platform-icon--primary {
  color: #8ff5ff;
}

.accounts-row__platform-icon--red {
  color: #ff2442;
}

.accounts-row__platform-icon--default {
  color: #fff;
}

.accounts-row__platform-icon--blue {
  color: #1da1f2;
}

.accounts-row__identity {
  display: flex;
  gap: 0.7rem;
  align-items: center;
  min-width: 0;
}

.accounts-row__identity-copy {
  display: grid;
  min-width: 0;
}

.accounts-row__identity-copy span {
  overflow: hidden;
  font-size: 0.95rem;
  line-height: 1.2;
  text-overflow: ellipsis;
  white-space: nowrap;
  font-weight: 600;
}

.accounts-row__identity-copy small {
  overflow: hidden;
  margin-top: 0.18rem;
  color: #767575;
  font-size: 0.76rem;
  line-height: 1.35;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.accounts-row__avatar {
  display: grid;
  place-items: center;
  width: 2.35rem;
  height: 2.35rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
  color: #d8f9fc;
  background: #131313;
  font-size: 0.72rem;
  font-weight: 700;
}

.accounts-row__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.accounts-row__mono {
  color: #adaaaa;
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-size: 0.78rem;
  line-height: 1.45;
}

.accounts-row__tag-list {
  display: flex;
  gap: 0.4rem;
  flex-wrap: wrap;
  align-items: center;
}

.accounts-row__tag {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0 0.62rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 999px;
  color: #8ff5ff;
  background: #151515;
  font-size: 0.72rem;
  white-space: nowrap;
}

.accounts-row__tag + .accounts-row__tag {
  color: #adaaaa;
}

.accounts-row__tag--empty {
  color: #767575;
  border-style: dashed;
}

.accounts-row__status {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  color: #d7faff;
  font-size: 0.82rem;
  font-weight: 500;
}

.accounts-row__status-dot {
  width: 0.42rem;
  height: 0.42rem;
  border-radius: 999px;
  background: currentcolor;
  box-shadow: 0 0 8px currentcolor;
}

.accounts-row--error .accounts-row__status {
  color: #ff716c;
}

.accounts-row--warning .accounts-row__status {
  color: #ffb800;
}

.accounts-row--muted .accounts-row__status {
  color: #767575;
}

.accounts-row__actions {
  display: flex;
  justify-content: center;
}

.accounts-row__action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.3rem;
  height: 2.3rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.72rem;
  color: #adaaaa;
  background: #151515;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.accounts-row__action-button:hover:not(:disabled) {
  color: #fff;
  border-color: rgb(255 113 108 / 0.24);
  background: rgb(255 113 108 / 0.08);
}

.accounts-row__action-button:disabled {
  cursor: not-allowed;
  opacity: 0.55;
}

.delete-dialog {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1.25rem;
  background: rgb(6 7 8 / 0.68);
  backdrop-filter: blur(18px);
}

.delete-dialog__panel {
  width: min(100%, 29rem);
  padding: 1.3rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1.15rem;
  background:
    radial-gradient(circle at top right, rgb(255 113 108 / 0.1), transparent 34%),
    linear-gradient(180deg, rgb(24 24 24 / 0.98), rgb(16 16 16 / 0.98));
  box-shadow: 0 24px 80px rgb(0 0 0 / 0.38);
}

.delete-dialog__icon {
  display: grid;
  place-items: center;
  width: 2.7rem;
  height: 2.7rem;
  border: 1px solid rgb(255 113 108 / 0.2);
  border-radius: 0.9rem;
  color: #ffb7b2;
  background: rgb(255 113 108 / 0.08);
}

.delete-dialog__copy {
  margin-top: 1rem;
}

.delete-dialog__eyebrow {
  margin: 0;
  color: #ffb7b2;
  font-family: var(--cn-font-display);
  font-size: 0.72rem;
  font-weight: 700;
  letter-spacing: 0.1em;
  text-transform: uppercase;
}

.delete-dialog__copy h2 {
  margin: 0.45rem 0 0;
  font-family: var(--cn-font-display);
  font-size: 1.45rem;
  letter-spacing: -0.03em;
}

.delete-dialog__copy p {
  margin: 0.55rem 0 0;
  color: #adaaaa;
  font-size: 0.84rem;
  line-height: 1.6;
}

.delete-dialog__account {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  margin-top: 1rem;
  padding: 0.95rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.9rem;
  background: rgb(255 255 255 / 0.02);
}

.delete-dialog__account .material-symbols-outlined {
  color: #8ff5ff;
}

.delete-dialog__account strong,
.delete-dialog__account small {
  display: block;
}

.delete-dialog__account strong {
  font-size: 0.92rem;
  font-weight: 600;
}

.delete-dialog__account small {
  margin-top: 0.22rem;
  color: #767575;
  font-size: 0.75rem;
}

.delete-dialog__actions {
  display: flex;
  gap: 0.75rem;
  justify-content: flex-end;
  margin-top: 1.15rem;
}

.delete-dialog__button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 6.6rem;
  min-height: 2.75rem;
  padding: 0 1rem;
  border: 1px solid transparent;
  border-radius: 0.8rem;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
  font-weight: 700;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.delete-dialog__button--ghost {
  border-color: rgb(72 72 71 / 0.24);
  color: #f1f1f1;
  background: rgb(255 255 255 / 0.04);
}

.delete-dialog__button--ghost:hover:not(:disabled) {
  border-color: rgb(143 245 255 / 0.2);
  background: rgb(143 245 255 / 0.08);
}

.delete-dialog__button--danger {
  color: #2f0906;
  background: linear-gradient(135deg, #ffb7b2 0%, #ff716c 100%);
  box-shadow: 0 0 20px rgb(255 113 108 / 0.2);
}

.delete-dialog__button--danger:hover:not(:disabled) {
  filter: brightness(1.02);
}

.delete-dialog__button:disabled {
  cursor: not-allowed;
  opacity: 0.65;
}

@media (max-width: 1200px) {
  .accounts-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .accounts-board {
    overflow-x: auto;
  }

  .accounts-board__head,
  .accounts-row {
    min-width: 64rem;
  }
}

@media (max-width: 720px) {
  .accounts-canvas {
    padding: 1.25rem 1rem 2rem;
  }

  .accounts-header,
  .accounts-feedback {
    flex-direction: column;
    align-items: stretch;
  }

  .accounts-header__actions {
    justify-content: stretch;
    flex-direction: column;
  }

  .accounts-header__button {
    justify-content: center;
  }

  .accounts-summary {
    grid-template-columns: 1fr;
  }

  .accounts-board {
    overflow: visible;
    border: 0;
    background: transparent;
    box-shadow: none;
  }

  .accounts-board__head {
    display: none;
  }

  .accounts-row {
    grid-template-columns: 2.5rem minmax(0, 1fr) auto;
    gap: 0.8rem;
    min-width: 0;
    margin-bottom: 0.8rem;
    padding: 1rem;
    border: 1px solid rgb(72 72 71 / 0.14);
    border-radius: 1rem;
    background: #1a1919;
    box-shadow: var(--cn-shadow-soft);
  }

  .accounts-row + .accounts-row {
    border-top: 1px solid rgb(72 72 71 / 0.14);
  }

  .accounts-row__platform {
    grid-column: 1;
    grid-row: 1;
  }

  .accounts-row__identity {
    grid-column: 2;
    grid-row: 1;
  }

  .accounts-row__actions {
    grid-column: 3;
    grid-row: 1;
    justify-content: flex-end;
  }

  .accounts-row__mono,
  .accounts-row__tag-list,
  .accounts-row__status {
    grid-column: 2 / -1;
  }

  .accounts-row__mono {
    display: flex;
    align-items: center;
    min-height: 1.45rem;
  }

  .delete-dialog {
    padding: 1rem;
  }

  .delete-dialog__panel {
    padding: 1.15rem;
  }

  .delete-dialog__actions {
    flex-direction: column-reverse;
  }

  .delete-dialog__button {
    width: 100%;
  }
}
</style>
