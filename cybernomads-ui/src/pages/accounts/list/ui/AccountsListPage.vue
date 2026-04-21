<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { deleteAccount, isRealAccountApiEnabled, listAccounts, restoreAccount } from '@/entities/account/api/account-service'
import type { AccountPlatformColor, AccountRecord } from '@/entities/account/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

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

const usesRealAccountApi = isRealAccountApiEnabled()

const overviewCard = computed<PlatformSummaryCard>(() => ({
  platform: '全部账号',
  icon: 'group',
  count: accounts.value.length,
  detail: usesRealAccountApi ? '账号列表已连接真实后端' : '当前仍为 mock 预览数据',
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

watch(
  mockScenarioId,
  () => {
    if (!usesRealAccountApi) {
      void loadAccounts()
    }
  },
  { immediate: !usesRealAccountApi },
)

if (usesRealAccountApi) {
  void loadAccounts()
}

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

function openAccount(accountId: string) {
  void router.push(`/accounts/${accountId}`)
}

function resolveLifecycleActionLabel(account: AccountRecord) {
  return account.lifecycleStatus === 'deleted' ? '恢复' : '删除'
}

function resolveLifecycleActionIcon(account: AccountRecord) {
  return account.lifecycleStatus === 'deleted' ? 'restore_from_trash' : 'delete'
}

async function handleLifecycleAction(account: AccountRecord) {
  if (!usesRealAccountApi) {
    errorMessage.value = '当前未启用账号模块真实后端，删除与恢复操作仅在真实后端模式可用。'
    return
  }

  pendingActionId.value = account.id
  errorMessage.value = ''

  try {
    if (account.lifecycleStatus === 'deleted') {
      await restoreAccount(account.id)
    } else {
      await deleteAccount(account.id)
    }

    await loadAccounts()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '账号生命周期操作失败，请稍后重试。'
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
          <p>{{ usesRealAccountApi ? '真实 AccountSummary 列表已接入' : '当前仍使用 mock 数据预览账号池' }}</p>
        </div>

        <button type="button" class="accounts-header__button" :disabled="isLoading" @click="loadAccounts">
          <span class="material-symbols-outlined">refresh</span>
          <span>{{ isLoading ? '刷新中…' : '刷新列表' }}</span>
        </button>
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
        <strong>正在加载账号列表</strong>
        <p>正在请求当前账号摘要，请稍候。</p>
      </section>

      <section v-else-if="!accounts.length" class="accounts-feedback accounts-feedback--empty">
        <strong>当前没有账号记录</strong>
        <p>列表为空时不会展示行数据。接入真实后端后可通过创建接口补充账号。</p>
      </section>

      <section v-else class="accounts-board">
        <div class="accounts-board__head">
          <span />
          <span>身份</span>
          <span>UID</span>
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
              <img v-if="account.avatarUrl" :src="account.avatarUrl" :alt="account.displayName" />
              <span v-else class="material-symbols-outlined">person</span>
            </div>
            <div class="accounts-row__identity-copy">
              <span>{{ account.displayName }}</span>
              <small>{{ account.remark || account.platformView.label }}</small>
            </div>
          </div>

          <div class="accounts-row__mono">{{ account.platformAccountUid }}</div>

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
              class="accounts-row__action-button accounts-row__action-button--login"
              @click.stop="openAccount(account.id)"
            >
              <span class="material-symbols-outlined">open_in_new</span>
            </button>
            <button
              type="button"
              class="accounts-row__action-button accounts-row__action-button--edit"
              @click.stop="openAccount(account.id)"
            >
              <span class="material-symbols-outlined">edit_square</span>
            </button>
            <button
              type="button"
              class="accounts-row__action-button accounts-row__action-button--delete"
              :disabled="pendingActionId === account.id"
              :title="resolveLifecycleActionLabel(account)"
              @click.stop="handleLifecycleAction(account)"
            >
              <span class="material-symbols-outlined">{{ resolveLifecycleActionIcon(account) }}</span>
            </button>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.accounts-page {
  min-height: 100vh;
  color: #fff;
  background: transparent;
}

.accounts-topbar,
.accounts-topbar__actions,
.accounts-summary,
.summary-card__top,
.summary-card__label,
.accounts-board__head,
.accounts-row,
.accounts-row__identity,
.accounts-row__status,
.accounts-row__actions {
  display: flex;
  align-items: center;
}

.accounts-topbar {
  justify-content: space-between;
  gap: 1rem;
  min-height: 4.4rem;
  padding: 0 1.9rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.15);
}

.accounts-topbar__title {
  color: #00eefc;
  font-family: var(--cn-font-display);
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: 0.16em;
}

.accounts-topbar__search {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  width: min(18rem, 100%);
  height: 2.7rem;
  padding: 0 0.9rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.35);
  color: #767575;
}

.accounts-topbar__search input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #fff;
  background: transparent;
}

.accounts-topbar__search input::placeholder {
  color: #767575;
}

.accounts-topbar__actions {
  gap: 1rem;
  color: #adaaaa;
}

.accounts-topbar__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.accounts-topbar__actions img {
  width: 1.9rem;
  height: 1.9rem;
  border-radius: 999px;
  object-fit: cover;
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
  justify-content: space-between;
  margin-bottom: 1rem;
}

.summary-card__label {
  gap: 0.4rem;
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
  grid-template-columns: 4rem 1.6fr 1fr 0.9fr 1fr 1fr 0.8fr;
  gap: 0.75rem;
}

.accounts-board__head {
  padding: 1rem 1.3rem;
  color: #767575;
  font-family: var(--cn-font-display);
  font-size: 0.7rem;
  text-transform: uppercase;
}

.accounts-row {
  position: relative;
  align-items: center;
  padding: 0.9rem 1.3rem;
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
  justify-content: center;
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
  gap: 0.7rem;
  min-width: 0;
}

.accounts-row__identity-copy {
  display: grid;
  min-width: 0;
}

.accounts-row__identity-copy span {
  font-size: 0.9rem;
  font-weight: 600;
}

.accounts-row__identity-copy small {
  overflow: hidden;
  margin-top: 0.1rem;
  color: #767575;
  font-size: 0.72rem;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.accounts-row__avatar {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
  background: #131313;
}

.accounts-row__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.accounts-row__mono {
  color: #adaaaa;
  font-family: ui-monospace, 'SFMono-Regular', monospace;
  font-size: 0.76rem;
}

.accounts-row__tag {
  display: inline-flex;
  align-items: center;
  min-height: 1.45rem;
  padding: 0 0.45rem;
  border: 1px solid rgb(143 245 255 / 0.2);
  border-radius: 0.35rem;
  color: #c3f400;
  background: rgb(195 244 0 / 0.08);
  font-size: 0.68rem;
}

.accounts-row__tag-list {
  display: flex;
  flex-wrap: wrap;
  gap: 0.35rem;
}

.accounts-row__tag--empty {
  border-color: rgb(118 117 117 / 0.3);
  color: #767575;
  background: rgb(118 117 117 / 0.08);
}

.accounts-row__status {
  gap: 0.42rem;
  color: #8ff5ff;
  font-size: 0.78rem;
}

.accounts-row__status-dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: #8ff5ff;
}

.accounts-row--error .accounts-row__status {
  color: #ff716c;
}

.accounts-row--error .accounts-row__status-dot {
  background: #ff716c;
}

.accounts-row--warning .accounts-row__status {
  color: #ffb800;
}

.accounts-row--warning .accounts-row__status-dot {
  background: #ffb800;
}

.accounts-row--muted .accounts-row__status {
  color: #8b8888;
}

.accounts-row--muted .accounts-row__status-dot {
  background: #8b8888;
}

.accounts-row__actions {
  gap: 0.3rem;
  justify-content: flex-end;
  color: #adaaaa;
  opacity: 0;
  transition: opacity var(--cn-transition);
}

.accounts-row:hover .accounts-row__actions,
.accounts-row:focus-visible .accounts-row__actions {
  opacity: 1;
}

.accounts-row__action-button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.65rem;
  height: 1.65rem;
  padding: 0;
  border: 0;
  outline: 0;
  color: #adaaaa;
  background: transparent;
  appearance: none;
  transition: color var(--cn-transition);
}

.accounts-row__action-button:disabled {
  cursor: wait;
  opacity: 0.6;
}

.accounts-row__action-button .material-symbols-outlined {
  font-size: 1rem;
}

.accounts-row__action-button--login:hover {
  color: #8ff5ff;
}

.accounts-row__action-button--edit:hover {
  color: #65afff;
}

.accounts-row__action-button--delete:hover {
  color: #ff716c;
}

@media (max-width: 1200px) {
  .accounts-summary {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .accounts-feedback {
    flex-direction: column;
    align-items: flex-start;
  }
}

@media (max-width: 980px) {
  .accounts-topbar,
  .accounts-header {
    flex-direction: column;
    align-items: stretch;
  }

  .accounts-summary {
    grid-template-columns: 1fr;
  }

  .accounts-board {
    overflow-x: auto;
  }

  .accounts-board__head,
  .accounts-row {
    min-width: 58rem;
  }
}
</style>
