<script setup lang="ts">
import { computed, onMounted, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { listAccounts } from '@/entities/account/api/account-service'
import { listAgentNodes } from '@/entities/agent/api/agent-service'
import { listAssets } from '@/entities/asset/api/asset-service'
import { listStrategies } from '@/entities/strategy/api/strategy-service'
import { createWorkspace } from '@/entities/workspace/api/workspace-service'
import type { AccountRecord } from '@/entities/account/model/types'
import type { AgentNodeRecord } from '@/entities/agent/model/types'
import type { AssetAttachmentRecord, AssetRecord } from '@/entities/asset/model/types'
import type { StrategyRecord } from '@/entities/strategy/model/types'

const route = useRoute()
const router = useRouter()

const assets = ref<AssetRecord[]>([])
const strategies = ref<StrategyRecord[]>([])
const accounts = ref<AccountRecord[]>([])
const agentNodes = ref<AgentNodeRecord[]>([])
const selectedAssetId = ref('')
const selectedStrategyId = ref('')
const selectedAccountIds = ref<string[]>([])
const isSubmitting = ref(false)

const hasActiveAgent = computed(() => agentNodes.value.some((node) => node.status === 'active'))
const backTo = computed(() => String(route.meta.backTo ?? '/workspaces'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回工作区列表'))

const selectedAsset = computed(() => assets.value.find((asset) => asset.id === selectedAssetId.value) ?? null)
const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedStrategyId.value) ?? null)

function isConnectedAccount(account: AccountRecord) {
  return account.lifecycleStatus === 'active' && account.connectionStatus === 'connected' && account.hasCurrentCredential
}

const workspaceName = computed(() => {
  if (!selectedAsset.value || !selectedStrategy.value) {
    return '增长编排工作区'
  }

  return `${selectedAsset.value.platform} · ${selectedStrategy.value.name}`
})

const workspaceSummary = computed(() => {
  if (!selectedAsset.value || !selectedStrategy.value) {
    return '绑定一套资产、策略和执行账号，直接进入执行视图。'
  }

  return `以「${selectedAsset.value.name}」作为内容资产，结合「${selectedStrategy.value.name}」策略进行自动化执行。`
})

async function loadPage() {
  ;[assets.value, strategies.value, accounts.value, agentNodes.value] = await Promise.all([
    listAssets(),
    listStrategies(),
    listAccounts({ onlyConnected: true }),
    listAgentNodes(),
  ])

  selectedAssetId.value ||= assets.value[0]?.id ?? ''
  selectedStrategyId.value ||= strategies.value[1]?.id ?? strategies.value[0]?.id ?? ''
  if (!selectedAccountIds.value.length) {
    selectedAccountIds.value = accounts.value.filter(isConnectedAccount).slice(0, 1).map((account) => account.id)
  }
}

onMounted(loadPage)

function resolveAttachmentIcon(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'video_file'
  if (kind === 'link') return 'link'
  return 'description'
}

function resolveAttachmentLabel(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'MP4'
  if (kind === 'link') return 'URL'
  return 'PDF'
}

function resolveStrategyGlyph(strategy: StrategyRecord, index: number) {
  if (strategy.tags.some((tag) => tag.includes('私信'))) return 'forum'
  if (strategy.tags.some((tag) => tag.includes('活动'))) return 'bolt'
  return index % 2 === 0 ? 'hub' : 'description'
}

function resolveStrategyUpdatedAt(strategy: StrategyRecord) {
  return strategy.updatedAtLabel
}

function resolveStrategyTag(strategy: StrategyRecord) {
  return strategy.tags[0] ?? '未分类'
}

function resolveAccountVisualState(account: AccountRecord) {
  if (account.availabilityStatus === 'risk' || account.availabilityStatus === 'restricted' || account.availabilityStatus === 'offline') return 'risk'
  if (account.connectionStatus === 'expired' || account.connectionStatus === 'connect_failed') return 'expired'
  if (account.connectionStatus === 'connecting') return 'standby'
  return 'healthy'
}

function isSelectableAccount(account: AccountRecord) {
  return isConnectedAccount(account)
}

function toggleAccount(accountId: string) {
  const account = accounts.value.find((item) => item.id === accountId)
  if (!account || !isSelectableAccount(account)) {
    return
  }

  if (selectedAccountIds.value.includes(accountId)) {
    selectedAccountIds.value = selectedAccountIds.value.filter((item) => item !== accountId)
    return
  }

  selectedAccountIds.value = [...selectedAccountIds.value, accountId]
}

function resolveAccountStatus(account: AccountRecord) {
  return account.state.label.replace(/\s+/g, '')
}

function resolveAccountStatusClass(account: AccountRecord) {
  return resolveAccountVisualState(account)
}

async function handleSubmit() {
  if (!hasActiveAgent.value || !selectedAssetId.value || !selectedStrategyId.value || !selectedAccountIds.value.length) {
    return
  }

  isSubmitting.value = true

  try {
    const workspace = await createWorkspace({
      name: workspaceName.value,
      summary: workspaceSummary.value,
      assetId: selectedAssetId.value,
      strategyId: selectedStrategyId.value,
      accountIds: selectedAccountIds.value,
    })

    await router.push(`/workspaces/${workspace.id}/runtime`)
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="create-page">
    <main class="create-main">
      <div class="create-main__glow" />

      <div class="create-main__content">
        <div class="create-context">
          <RouterLink :to="backTo" class="create-context__back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ backLabel }}</span>
          </RouterLink>
          <span class="create-context__crumb">/ 推广工作区 / 创建引流团队</span>
        </div>

        <header class="create-main__header">
          <div>
            <h2>创建引流团队</h2>
            <p>配置并启动自动化流量获取矩阵</p>
          </div>
          <button
            class="create-main__submit create-main__submit--header"
            type="button"
            :disabled="!hasActiveAgent || !selectedAccountIds.length || isSubmitting"
            @click="handleSubmit"
          >
            <span class="material-symbols-outlined fill">play_arrow</span>
            <span>{{ isSubmitting ? '创建中…' : '确认并启动团队' }}</span>
          </button>
        </header>

        <section v-if="!hasActiveAgent" class="create-warning">
          <strong>当前无法创建工作区</strong>
          <p>因为没有可用执行节点。请先完成 OpenClaw 初始化。</p>
          <RouterLink to="/console/openclaw">初始化节点</RouterLink>
        </section>

        <div class="create-timeline">
          <div class="create-timeline__line">
            <div class="create-timeline__line-glow" />
          </div>

          <section class="create-step">
            <div class="create-step__node">1</div>
            <h3>
              选择引流资产
              <span>必选</span>
            </h3>

            <div class="create-carousel">
              <article
                v-for="asset in assets"
                :key="asset.id"
                class="create-card"
                :class="{ 'create-card--active': selectedAssetId === asset.id }"
                @click="selectedAssetId = asset.id"
              >
                <div class="create-card__overlay" />
                <div class="create-card__top">
                  <div class="create-card__icon">
                    <span class="material-symbols-outlined">{{ resolveAttachmentIcon(asset.attachments[0]?.kind ?? 'pdf') }}</span>
                  </div>
                  <div v-if="selectedAssetId === asset.id" class="create-card__check">
                    <span class="material-symbols-outlined">check</span>
                  </div>
                  <div v-else class="create-card__radio" />
                </div>
                <h4>{{ asset.name }}</h4>
                <p>{{ asset.summary }}</p>
                <div class="create-card__chips">
                  <span v-for="chip in [resolveAttachmentLabel(asset.attachments[0]?.kind ?? 'pdf'), ...asset.tags.slice(0, 1)]" :key="chip">
                    {{ chip }}
                  </span>
                </div>
              </article>
            </div>
          </section>

          <section class="create-step">
            <div class="create-step__node">2</div>
            <h3>选择引流策略</h3>

            <div class="create-carousel">
              <article
                v-for="(strategy, index) in strategies"
                :key="strategy.id"
                class="strategy-card"
                :class="{ 'strategy-card--active': selectedStrategyId === strategy.id }"
                @click="selectedStrategyId = strategy.id"
              >
                <div class="strategy-card__glyph">
                  <span class="material-symbols-outlined">{{ resolveStrategyGlyph(strategy, index) }}</span>
                </div>
                <h4>
                  {{ strategy.name }}
                  <span v-if="selectedStrategyId === strategy.id" class="material-symbols-outlined strategy-card__verified">verified</span>
                </h4>
                <p>{{ strategy.summary }}</p>
                <div class="strategy-card__stats">
                  <div>
                    <small>最近更新</small>
                    <strong>{{ resolveStrategyUpdatedAt(strategy) }}</strong>
                  </div>
                  <div>
                    <small>主标签</small>
                    <strong class="strategy-card__risk strategy-card__risk--low">{{ resolveStrategyTag(strategy) }}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="create-step create-step--accounts">
            <div class="create-step__node">3</div>
            <div class="create-step__header">
              <h3>分配执行账号</h3>
              <button type="button">
                <span class="material-symbols-outlined">add_circle</span>
                <span>批量添加</span>
              </button>
            </div>

            <div class="create-carousel create-carousel--accounts">
              <article
                v-for="account in accounts"
                :key="account.id"
                class="account-card"
                :class="[
                    `account-card--${resolveAccountStatusClass(account)}`,
                  {
                    'account-card--active': selectedAccountIds.includes(account.id),
                    'account-card--disabled': !isSelectableAccount(account),
                  },
                ]"
                @click="toggleAccount(account.id)"
              >
                <div v-if="resolveAccountVisualState(account) === 'risk'" class="account-card__tag">待确认</div>

                <div class="account-card__top">
                  <div class="account-card__avatar">
                    <img
                      v-if="account.resolvedPlatformProfile.resolvedAvatarUrl"
                      :src="account.resolvedPlatformProfile.resolvedAvatarUrl"
                      :alt="account.internalDisplayName"
                      referrerpolicy="no-referrer"
                    />
                    <span v-else class="material-symbols-outlined">robot_2</span>
                  </div>
                  <div v-if="selectedAccountIds.includes(account.id)" class="create-card__check">
                    <span class="material-symbols-outlined">check</span>
                  </div>
                  <div v-else class="create-card__radio" />
                </div>

                <div>
                  <h5>{{ account.internalDisplayName }}</h5>
                  <div class="account-card__meta">
                    <p>{{ account.platform }}</p>
                    <div class="account-card__status" :class="`account-card__status--${resolveAccountStatusClass(account)}`">
                      <span class="account-card__dot" />
                      <span>{{ resolveAccountStatus(account) }}</span>
                    </div>
                  </div>
                </div>
              </article>
            </div>
          </section>
        </div>
      </div>

      <div class="create-bottom-bar">
        <button
          class="create-main__submit"
          type="button"
          :disabled="!hasActiveAgent || !selectedAccountIds.length || isSubmitting"
          @click="handleSubmit"
        >
          <span class="material-symbols-outlined fill">rocket_launch</span>
          <span>{{ isSubmitting ? '创建中…' : '确认并启动团队' }}</span>
        </button>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.create-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.create-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 16rem;
  padding: 2rem 1rem 1.5rem;
  background: #131313;
  box-shadow: 4px 0 24px rgb(0 0 0 / 0.5);
}

.create-sidebar__brand {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0 0.5rem;
}

.create-sidebar__avatar {
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
}

.create-sidebar__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.create-sidebar__brand-copy h1,
.create-sidebar__brand-copy p {
  margin: 0;
}

.create-sidebar__brand-copy h1 {
  color: #00f0ff;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.create-sidebar__brand-copy p {
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-sidebar__nav {
  display: grid;
  gap: 0.5rem;
  flex: 1;
  margin-top: 2rem;
}

.create-sidebar__link {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1rem;
  color: var(--cn-on-surface-muted);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.create-sidebar__link:hover {
  color: #00f0ff;
  background: #262626;
}

.create-sidebar__link--active {
  color: #00f0ff;
  font-weight: 700;
  background: linear-gradient(90deg, rgb(0 240 255 / 0.1), transparent);
  border-left: 2px solid #00f0ff;
}

.create-sidebar__footer {
  padding-top: 1.5rem;
}

.create-sidebar__initialize {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  margin-bottom: 1rem;
  color: var(--cn-on-primary);
  background: var(--cn-primary);
  border-radius: 0.65rem;
  box-shadow: 0 0 15px rgb(143 245 255 / 0.3);
  font-size: 0.9rem;
  font-weight: 700;
}

.create-sidebar__support {
  display: grid;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.create-main {
  position: relative;
  flex: 1;
  min-width: 0;
  margin-left: 0;
  overflow-y: auto;
}

.create-main__glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 50rem;
  height: 50rem;
  background: rgb(0 238 252 / 0.05);
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.create-main__content {
  position: relative;
  z-index: 1;
  max-width: 72rem;
  padding: 3rem 2rem 8rem;
  margin: 0 auto;
}

.create-context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.create-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 999px;
  background: rgb(19 19 19 / 0.82);
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.create-context__back:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.28);
  background: rgb(32 31 31 / 0.92);
}

.create-context__crumb {
  color: #767575;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
  letter-spacing: 0.04em;
}

.create-main__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.create-main__header h2,
.create-main__header p {
  margin: 0;
}

.create-main__header h2 {
  font-size: 3.5rem;
  line-height: 1;
  letter-spacing: -0.05em;
}

.create-main__header p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-main__submit {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  padding: 0 2rem;
  color: var(--cn-on-primary);
  background: var(--cn-primary);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 0 20px rgb(143 245 255 / 0.4);
  font-weight: 700;
}

.create-main__submit:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.create-warning {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  background: #131313;
  border: 1px solid rgb(255 113 108 / 0.2);
  border-radius: 0.75rem;
}

.create-warning strong,
.create-warning p {
  margin: 0;
}

.create-warning p {
  margin-top: 0.25rem;
  color: var(--cn-on-surface-muted);
}

.create-warning a {
  color: #00f0ff;
  font-weight: 700;
}

.create-timeline {
  position: relative;
  padding-left: 3rem;
}

.create-timeline__line {
  position: absolute;
  top: 1rem;
  bottom: 0;
  left: 1rem;
  width: 2px;
  background: rgb(72 72 71 / 0.3);
}

.create-timeline__line-glow {
  position: absolute;
  inset: 0;
  height: 90%;
  background: linear-gradient(180deg, var(--cn-primary), rgb(143 245 255 / 0.5), transparent);
  box-shadow: 0 0 10px rgb(143 245 255 / 0.5);
}

.create-step {
  position: relative;
  z-index: 1;
  margin-bottom: 4rem;
}

.create-step__node {
  position: absolute;
  top: 0.25rem;
  left: -2.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--cn-primary);
  background: #262626;
  border: 1px solid var(--cn-primary);
  border-radius: 999px;
  box-shadow: 0 0 15px rgb(143 245 255 / 0.3);
  font-weight: 700;
}

.create-step h3 {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
}

.create-step h3 span {
  padding: 0.1rem 0.5rem;
  color: var(--cn-on-surface-muted);
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.25rem;
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.create-step__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.create-step__header h3 {
  margin-bottom: 0;
}

.create-step__header button {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  color: var(--cn-tertiary);
  background: transparent;
  border: 0;
  font-size: 0.92rem;
}

.create-carousel {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding-bottom: 1.5rem;
  scrollbar-width: none;
}

.create-carousel::-webkit-scrollbar {
  display: none;
}

.create-card,
.strategy-card,
.account-card {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
}

.create-card {
  min-width: 20rem;
  padding: 1.5rem;
  overflow: hidden;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
}

.create-card--active {
  background: #1a1919;
  border-color: rgb(143 245 255 / 0.4);
  box-shadow: 0 8px 32px rgb(143 245 255 / 0.1);
}

.create-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(143 245 255 / 0.05), transparent);
  pointer-events: none;
}

.create-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.create-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
}

.create-card__icon span {
  font-size: 1.5rem;
}

.create-card__check,
.create-card__radio {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
}

.create-card__check {
  color: var(--cn-on-primary);
  background: var(--cn-primary);
}

.create-card__radio {
  border: 2px solid rgb(118 117 117 / 0.5);
}

.create-card h4,
.create-card p,
.strategy-card h4,
.strategy-card p,
.account-card h5,
.account-card p {
  position: relative;
  z-index: 1;
  margin: 0;
}

.create-card h4,
.strategy-card h4 {
  font-size: 1.125rem;
}

.create-card p,
.strategy-card p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-card__chips {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.create-card__chips span {
  padding: 0.25rem 0.5rem;
  color: var(--cn-on-surface-muted);
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.25rem;
  font-size: 0.72rem;
}

.strategy-card {
  min-width: 23.75rem;
  padding: 1.5rem;
  overflow: hidden;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
}

.strategy-card--active {
  background: #1a1919;
  border-color: rgb(143 245 255 / 0.4);
  box-shadow: 0 8px 32px rgb(143 245 255 / 0.05);
}

.strategy-card__glyph {
  position: absolute;
  top: 0;
  right: 0;
  padding: 1rem;
  opacity: 0.15;
}

.strategy-card__glyph span {
  font-size: 6rem;
}

.strategy-card__verified {
  font-size: 1rem;
  color: var(--cn-primary);
}

.strategy-card__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.strategy-card__stats div {
  padding: 0.75rem;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.5rem;
}

.strategy-card__stats small {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.72rem;
}

.strategy-card__stats strong {
  font-size: 0.9rem;
}

.strategy-card__risk--low {
  color: var(--cn-secondary);
}

.strategy-card__risk--warning {
  color: var(--cn-warning);
}

.strategy-card__risk--high {
  color: var(--cn-error);
}

.account-card {
  min-width: 17.5rem;
  padding: 1.25rem;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
}

.account-card--active {
  background: #1a1919;
  border-color: rgb(143 245 255 / 0.4);
  box-shadow: 0 8px 32px rgb(143 245 255 / 0.05);
}

.account-card--disabled {
  opacity: 0.5;
  cursor: not-allowed;
}

.account-card__tag {
  position: absolute;
  top: -0.5rem;
  right: -0.5rem;
  padding: 0.15rem 0.5rem;
  color: #000;
  background: #ff9800;
  border-radius: 0.25rem;
  font-size: 0.625rem;
  font-weight: 700;
}

.account-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.account-card__avatar {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  overflow: hidden;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
}

.account-card__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.account-card__meta,
.account-card__status {
  display: flex;
  align-items: center;
}

.account-card__meta {
  justify-content: space-between;
  gap: 0.75rem;
  margin-top: 0.25rem;
}

.account-card__meta p {
  color: var(--cn-on-surface-muted);
  font-size: 0.88rem;
}

.account-card__status {
  gap: 0.35rem;
  font-size: 0.75rem;
}

.account-card__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.account-card--healthy .account-card__dot {
  background: var(--cn-secondary);
  box-shadow: 0 0 8px rgb(195 244 0 / 0.5);
}

.account-card--risk .account-card__dot {
  background: #ff9800;
  box-shadow: 0 0 8px rgb(255 152 0 / 0.5);
}

.account-card--expired .account-card__dot {
  background: var(--cn-error);
  box-shadow: 0 0 8px rgb(255 113 108 / 0.5);
}

.account-card--standby .account-card__dot {
  background: #262626;
  border: 1px solid rgb(118 117 117 / 0.5);
}

.account-card__status--healthy,
.account-card__status--risk,
.account-card__status--standby {
  color: var(--cn-on-surface-muted);
}

.account-card__status--expired {
  color: var(--cn-error);
}

.create-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding: 1rem 2rem;
  background: rgb(14 14 14 / 0.8);
  border-top: 1px solid rgb(72 72 71 / 0.2);
  backdrop-filter: blur(18px);
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.5);
}

@media (max-width: 1200px) {
  .create-page {
    flex-direction: column;
  }

  .create-sidebar {
    position: static;
    width: 100%;
  }

  .create-main {
    margin-left: 0;
  }

  .create-bottom-bar {
    left: 0;
  }
}

@media (max-width: 900px) {
  .create-main__header,
  .create-warning,
  .create-step__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .create-main__header h2 {
    font-size: 2.6rem;
  }

  .create-timeline {
    padding-left: 2rem;
  }

  .create-step__node {
    left: -1.8rem;
  }
}
</style>
