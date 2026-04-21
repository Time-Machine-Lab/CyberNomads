<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import { getAccountById, updateAccountStatus } from '@/entities/account/api/account-service'
import { referenceAccountDetailAvatarUrl } from '@/shared/config/reference-ui'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const account = ref<Awaited<ReturnType<typeof getAccountById>>>(null)
const backTo = computed(() => String(route.meta.backTo ?? '/accounts'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回账号池'))
const terminalLogs = ref([
  '[14:02:11] [SYS] Initializing Handshake sequence...',
  '[14:02:12] [SYS] Establishing secure socket via wss://api.cybernomads.net/v2',
  '[14:02:13] [AUTH] Validating existing token signature...',
  '[14:02:14] [AUTH] Token Validated Successfully. Session ID: 9A8B-7C6D',
  '[14:02:15] [DATA] Fetching User Profile...',
  '[14:02:16] [DATA] Profile sync complete. Metadata loaded.',
  '[14:05:30] [SYS] Heartbeat ping... OK (22ms)',
  '[14:10:30] [SYS] Heartbeat ping... OK (24ms)',
])

const accountId = computed(() => String(route.params.accountId ?? ''))
const displayAccount = computed(() => {
  if (!account.value) return null
  if (account.value.id !== 'account-bili-main') return account.value

  return {
    ...account.value,
    name: 'Cyber_Nova_88',
    platform: 'Bilibili',
    owner: '主控运营号-01',
    uid: '8492019948',
    avatarUrl: referenceAccountDetailAvatarUrl,
    tags: ['Tech', 'Review'],
  }
})

watch(
  [accountId, mockScenarioId],
  async () => {
    account.value = await getAccountById(accountId.value)
  },
  { immediate: true },
)

async function connectAccount() {
  account.value = await updateAccountStatus(accountId.value, 'connected')
}

function resolvePlatformLabel(platform: string) {
  if (platform === 'B站') return 'Bilibili'
  return platform
}
</script>

<template>
  <section v-if="displayAccount" class="account-detail-page">
    <main class="account-detail-main">
      <div class="account-detail-context">
        <RouterLink :to="backTo" class="account-detail-context__back">
          <span class="material-symbols-outlined">arrow_back</span>
          <span>{{ backLabel }}</span>
        </RouterLink>
        <span class="account-detail-context__crumb">/ 账号池 / 账号配置</span>
      </div>

      <header class="account-detail-header">
        <div>
          <h1>账户配置</h1>
          <p>
            <span class="account-detail-header__pulse" />
            <span>Node Status: Secure Connection Established</span>
          </p>
        </div>

        <div class="account-detail-header__chips">
          <span>
            <span class="material-symbols-outlined">schedule</span>
            <span>Session: 04:22:18</span>
          </span>
          <span>
            <span class="material-symbols-outlined">vpn_lock</span>
            <span>Encrypted</span>
          </span>
        </div>
      </header>

      <div class="account-detail-grid">
        <div class="account-detail-left">
          <section class="account-card account-card--profile">
            <div class="account-card__glow" />
            <div class="account-profile">
              <div class="account-profile__avatar">
                <img v-if="displayAccount.avatarUrl" :src="displayAccount.avatarUrl" :alt="displayAccount.name" />
                <span class="material-symbols-outlined">verified</span>
              </div>

              <div class="account-profile__content">
                <div class="account-profile__top">
                  <h2>{{ displayAccount.name }}</h2>
                  <span class="account-profile__platform">
                    <span class="material-symbols-outlined">smart_display</span>
                    <span>{{ resolvePlatformLabel(displayAccount.platform) }}</span>
                  </span>
                </div>
                <p>UID: {{ displayAccount.uid }}</p>
                <div class="account-profile__tags">
                  <span>Active</span>
                  <span>Lv. 4</span>
                </div>
              </div>
            </div>
          </section>

          <section class="account-card">
            <h3>
              <span class="material-symbols-outlined">tune</span>
              <span>基础配置</span>
            </h3>

            <label class="account-field">
              <span>账户备注</span>
              <input type="text" :value="displayAccount.owner" />
            </label>

            <label class="account-field">
              <span>目标平台</span>
              <div class="account-select">
                <select>
                  <option>Bilibili (B站)</option>
                  <option>TikTok</option>
                  <option>小红书</option>
                </select>
                <span class="material-symbols-outlined">expand_more</span>
              </div>
            </label>

            <div class="account-field">
              <span>标签分配</span>
              <div class="account-tags">
                <button v-for="tag in displayAccount.tags" :key="tag" type="button">{{ tag }} <span class="material-symbols-outlined">close</span></button>
                <button type="button" class="account-tags__add">
                  <span class="material-symbols-outlined">add</span>
                  <span>添加</span>
                </button>
              </div>
            </div>
          </section>

          <section class="account-card">
            <div class="account-card__row">
              <h3>
                <span class="material-symbols-outlined">key</span>
                <span>访问凭证 (Token)</span>
              </h3>
              <button type="button">历史记录</button>
            </div>

            <div class="account-token">
              <span class="material-symbols-outlined">lock</span>
              <input type="password" value="token_live_placeholder_replace_in_prod" />
              <button type="button">
                <span class="material-symbols-outlined">visibility</span>
              </button>
            </div>

            <button type="button" class="account-primary-button" @click="connectAccount">保存凭证配置</button>
          </section>
        </div>

        <div class="account-detail-right">
          <div class="account-detail-right__top">
            <section class="account-card account-card--center">
              <h3>
                <span class="material-symbols-outlined">qr_code_scanner</span>
                <span>扫码授权</span>
              </h3>
              <div class="account-qr">
                <div class="account-qr__scan" />
                <span class="material-symbols-outlined">qr_code_2</span>
              </div>
              <p>请使用目标平台移动端 App 扫描二维码进行授权登录。</p>
              <button type="button" class="account-secondary-button">
                <span class="material-symbols-outlined">refresh</span>
                <span>刷新二维码</span>
              </button>
            </section>

            <section class="account-card">
              <h3>
                <span class="material-symbols-outlined">wifi_tethering</span>
                <span>连接状态</span>
              </h3>

              <div class="account-status">
                <div class="account-status__icon">
                  <span class="material-symbols-outlined">check_circle</span>
                  <span class="account-status__indicator" />
                </div>
                <div>
                  <h4>已连接</h4>
                  <p>延迟: 24ms | 节点: AP-Northeast</p>
                </div>
              </div>

              <div class="account-status__details">
                <div>
                  <span>认证到期</span>
                  <strong>2026-11-20 14:00</strong>
                </div>
                <div>
                  <span>权限级别</span>
                  <strong>Full Access</strong>
                </div>
              </div>

              <button type="button" class="account-secondary-button" @click="connectAccount">
                <span class="material-symbols-outlined">swap_calls</span>
                <span>验证连接</span>
              </button>
            </section>
          </div>

          <section class="account-console">
            <header class="account-console__header">
              <div>
                <span class="material-symbols-outlined">terminal</span>
                <span>System Terminal _</span>
              </div>
              <div>
                <button type="button">
                  <span class="material-symbols-outlined">delete_sweep</span>
                </button>
                <button type="button">
                  <span class="material-symbols-outlined">content_copy</span>
                </button>
              </div>
            </header>

            <div class="account-console__body">
              <div v-for="entry in terminalLogs" :key="entry">{{ entry }}</div>
              <div class="account-console__tail">
                <span>_</span>
                <span>Awaiting input stream...</span>
              </div>
            </div>
          </section>
        </div>
      </div>
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

.account-profile__avatar .material-symbols-outlined {
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
.account-select select {
  width: 100%;
  border: 0;
  padding: 0.65rem 0;
  color: #fff;
  background: transparent;
  border-bottom: 1px solid rgb(72 72 71 / 0.4);
  outline: 0;
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
