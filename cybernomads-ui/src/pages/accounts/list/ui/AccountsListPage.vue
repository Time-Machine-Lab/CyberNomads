<script setup lang="ts">
import { ref, watch } from 'vue'

import { listAccounts } from '@/entities/account/api/account-service'
import type { AccountRecord } from '@/entities/account/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

const accounts = ref<AccountRecord[]>([])

const platformSummary = [
  { platform: 'B站', icon: 'play_circle', count: 12, detail: '+2 本周', tone: 'primary', signal: 'primary' },
  { platform: '小红书', icon: 'book', count: 8, detail: '稳定', tone: 'red', signal: 'primary' },
  { platform: '抖音', icon: 'music_note', count: 15, detail: '2个风控警告', tone: 'default', signal: 'error' },
  { platform: 'Twitter', icon: 'chat_bubble', count: 5, detail: '离线', tone: 'blue', signal: 'muted' },
] as const

watch(
  mockScenarioId,
  async () => {
    accounts.value = await listAccounts()
  },
  { immediate: true },
)

function resolveRowTone(account: AccountRecord) {
  if (account.status === 'error') return 'error'
  if (account.status === 'needs-auth') return 'warning'
  return 'primary'
}

function resolvePlatformIcon(platform: string) {
  if (platform === 'B站') return 'play_circle'
  if (platform === '小红书') return 'book'
  if (platform === '抖音') return 'music_note'
  return 'chat_bubble'
}

function resolvePlatformColor(platform: string) {
  if (platform === 'B站') return 'primary'
  if (platform === '小红书') return 'red'
  if (platform === '抖音') return 'default'
  return 'blue'
}
</script>

<template>
  <section class="accounts-page">
    <div class="accounts-canvas">
      <header class="accounts-header">
        <div>
          <h1>账号池管理</h1>
          <p>多平台账号同步与管理</p>
        </div>

        <button type="button" class="accounts-header__button">
          <span class="material-symbols-outlined">add</span>
          <span>添加账号</span>
        </button>
      </header>

      <section class="accounts-summary">
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

        <article class="summary-card summary-card--add">
          <div class="summary-card__add-circle">
            <span class="material-symbols-outlined">add</span>
          </div>
          <p>接入平台</p>
        </article>
      </section>

      <section class="accounts-board">
        <div class="accounts-board__head">
          <span />
          <span>身份</span>
          <span>UID</span>
          <span>标签</span>
          <span>状态</span>
          <span>最后活跃</span>
          <span>操作</span>
        </div>

        <RouterLink
          v-for="account in accounts"
          :key="account.id"
          :to="`/accounts/${account.id}`"
          class="accounts-row"
          :class="`accounts-row--${resolveRowTone(account)}`"
        >
          <div class="accounts-row__platform">
            <span class="material-symbols-outlined" :class="`accounts-row__platform-icon--${resolvePlatformColor(account.platform)}`">
              {{ resolvePlatformIcon(account.platform) }}
            </span>
          </div>

          <div class="accounts-row__identity">
            <div class="accounts-row__avatar">
              <img v-if="account.avatarUrl" :src="account.avatarUrl" :alt="account.name" />
              <span v-else class="material-symbols-outlined">person</span>
            </div>
            <span>{{ account.name }}</span>
          </div>

          <div class="accounts-row__mono">{{ account.uid }}</div>

          <div>
            <span class="accounts-row__tag">{{ account.tags[0] }}</span>
          </div>

          <div class="accounts-row__status">
            <span class="accounts-row__status-dot" />
            <span>{{ account.statusLabel }}</span>
          </div>

          <div class="accounts-row__mono">{{ account.lastActiveLabel }}</div>

          <div class="accounts-row__actions">
            <button type="button" class="accounts-row__action-button accounts-row__action-button--login">
              <span class="material-symbols-outlined">login</span>
            </button>
            <button type="button" class="accounts-row__action-button accounts-row__action-button--edit">
              <span class="material-symbols-outlined">edit_square</span>
            </button>
            <button type="button" class="accounts-row__action-button accounts-row__action-button--delete">
              <span class="material-symbols-outlined">delete</span>
            </button>
          </div>
        </RouterLink>
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

.summary-card--add {
  display: grid;
  place-items: center;
}

.summary-card__add-circle {
  display: grid;
  place-items: center;
  width: 2.55rem;
  height: 2.55rem;
  margin-bottom: 0.5rem;
  border: 1px dashed #484847;
  border-radius: 999px;
  color: #767575;
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
  color: #fff;
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
  font-size: 0.9rem;
  font-weight: 600;
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
