<script setup lang="ts">
import { computed, onBeforeUnmount, onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { deleteAsset, listAssets } from '@/entities/asset/api/asset-service'
import type { AssetRecord } from '@/entities/asset/model/types'

interface AssetDisplayCard extends AssetRecord {
  accent: 'primary' | 'secondary' | 'error'
  icon: string
  displayName: string
  displaySummary: string
  displayDate: string
  primaryCategory: string
  displayTags: string[]
}

type AssetsActionTone = 'success' | 'info' | 'error'

const assets = ref<AssetRecord[]>([])
const activeFilter = ref('全部')
const isLoading = ref(false)
const loadError = ref('')
const activeMenuId = ref('')
const confirmDeleteId = ref('')
const deletingAssetId = ref('')
const actionMessage = ref<{ tone: AssetsActionTone; text: string } | null>(null)
const router = useRouter()

const filters = ['全部', 'SEO优化', '病毒传播', '社群增长', '长图文', '短视频'] as const

const assetDisplayMap: Partial<
  Record<
    string,
    {
      accent: AssetDisplayCard['accent']
      icon: string
      displayName: string
      displaySummary: string
      displayDate: string
      primaryCategory: string
      displayTags: string[]
    }
  >
> = {
  'asset-core-whitepaper': {
    accent: 'primary',
    icon: 'article',
    displayName: 'AIGC 高效工作流指南',
    displaySummary:
      '面向 AI 创作者的长文内容资产，适合用于 SEO 文章、小红书长图文和知识型内容分发。',
    displayDate: '2023-10-15',
    primaryCategory: 'SEO优化',
    displayTags: ['长图文', 'AI工具'],
  },
  'asset-telegram-community': {
    accent: 'error',
    icon: 'campaign',
    displayName: '双十一增长爆款文案包',
    displaySummary:
      '高情绪价值的短文案模版集合，适合短视频、朋友圈和活动宣发快速复用。',
    displayDate: '2023-11-01',
    primaryCategory: '病毒传播',
    displayTags: ['短视频', '文案'],
  },
  'asset-demo-video': {
    accent: 'secondary',
    icon: 'forum',
    displayName: '私域社群破冰话术库',
    displaySummary:
      '覆盖多个入群场景的开场脚本，帮助团队提高首轮互动率和社群活跃度。',
    displayDate: '2023-09-22',
    primaryCategory: '社群增长',
    displayTags: ['互动', '脚本'],
  },
} as const

function formatAssetDate(value: string) {
  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return value
  }

  return new Intl.DateTimeFormat('zh-CN', {
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
  })
    .format(date)
    .replace(/\//g, '-')
}

function resolveFallbackAccent(index: number): AssetDisplayCard['accent'] {
  if (index % 3 === 1) return 'secondary'
  if (index % 3 === 2) return 'error'
  return 'primary'
}

function dismissMenus() {
  activeMenuId.value = ''
  confirmDeleteId.value = ''
}

function clearActionMessage() {
  actionMessage.value = null
}

async function loadAssets() {
  isLoading.value = true
  loadError.value = ''

  try {
    assets.value = await listAssets()
  } catch {
    loadError.value =
      '产品资产加载失败，请确认后端产品服务已启动，或者切换为 Mock 模式后重试。'
  } finally {
    isLoading.value = false
  }
}

function handleDocumentClick() {
  dismissMenus()
}

onMounted(() => {
  document.addEventListener('click', handleDocumentClick)
  void loadAssets()
})

onBeforeUnmount(() => {
  document.removeEventListener('click', handleDocumentClick)
})

const displayAssets = computed(() => {
  return assets.value.map((asset, index): AssetDisplayCard => {
    const display = assetDisplayMap[asset.id] ?? {
      accent: resolveFallbackAccent(index),
      icon: 'inventory_2',
      displayName: asset.name,
      displaySummary: asset.summary,
      displayDate: formatAssetDate(asset.updatedAt),
      primaryCategory: asset.category,
      displayTags: asset.tags,
    }

    return {
      ...asset,
      ...display,
      displayTags: [...display.displayTags],
    }
  })
})

const filteredAssets = computed(() => {
  if (activeFilter.value === '全部') {
    return displayAssets.value
  }

  return displayAssets.value.filter((asset) =>
    [asset.primaryCategory, ...asset.displayTags].includes(activeFilter.value),
  )
})

function openAssetEditor(assetId: string) {
  void router.push(`/assets/${assetId}/edit`)
}

function toggleAssetMenu(assetId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  clearActionMessage()

  if (activeMenuId.value === assetId) {
    dismissMenus()
    return
  }

  activeMenuId.value = assetId
  confirmDeleteId.value = ''
}

function beginDeleteConfirmation(assetId: string, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  confirmDeleteId.value = assetId
}

function cancelDeleteConfirmation(event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()
  confirmDeleteId.value = ''
}

async function confirmDelete(asset: AssetDisplayCard, event: MouseEvent) {
  event.preventDefault()
  event.stopPropagation()

  if (deletingAssetId.value) {
    return
  }

  deletingAssetId.value = asset.id
  clearActionMessage()

  try {
    const result = await deleteAsset(asset.id)
    assets.value = assets.value.filter((item) => item.id !== asset.id)
    dismissMenus()

    actionMessage.value =
      result === 'missing'
        ? {
            tone: 'info',
            text: `“${asset.displayName}” 已不存在，列表已同步最新状态。`,
          }
        : {
            tone: 'success',
            text: `已删除 “${asset.displayName}”。`,
          }
  } catch {
    actionMessage.value = {
      tone: 'error',
      text: `删除 “${asset.displayName}” 失败，请稍后重试。`,
    }
  } finally {
    deletingAssetId.value = ''
  }
}
</script>

<template>
  <section class="assets-page">
    <div class="assets-canvas">
      <header class="assets-header">
        <div>
          <h1>引流资产列表</h1>
          <p>管理并维护可复用的产品资产，支持在当前列表中直接清理无效条目。</p>
        </div>

        <RouterLink class="assets-header__action" to="/assets/new">
          <span class="material-symbols-outlined">add</span>
          <span>新建资产</span>
        </RouterLink>
      </header>

      <section
        v-if="actionMessage"
        class="assets-feedback"
        :class="`assets-feedback--${actionMessage.tone}`"
        data-testid="assets-action-feedback"
      >
        <span class="material-symbols-outlined">
          {{
            actionMessage.tone === 'error'
              ? 'error'
              : actionMessage.tone === 'info'
                ? 'info'
                : 'check_circle'
          }}
        </span>
        <p>{{ actionMessage.text }}</p>
      </section>

      <div class="assets-filters">
        <button
          v-for="filter in filters"
          :key="filter"
          type="button"
          class="assets-filters__button"
          :class="{ 'assets-filters__button--active': activeFilter === filter }"
          @click="activeFilter = filter"
        >
          {{ filter }}
        </button>
      </div>

      <section v-if="isLoading" class="assets-state" data-testid="assets-loading-state">
        <span class="material-symbols-outlined">sync</span>
        <h2>正在加载产品资产</h2>
        <p>正在从产品模块同步最新摘要，请稍候。</p>
      </section>

      <section v-else-if="loadError" class="assets-state assets-state--error" data-testid="assets-error-state">
        <span class="material-symbols-outlined">error</span>
        <h2>加载失败</h2>
        <p>{{ loadError }}</p>
        <button type="button" @click="loadAssets">重新加载</button>
      </section>

      <section v-else-if="assets.length === 0" class="assets-state" data-testid="assets-empty-state">
        <span class="material-symbols-outlined">inventory_2</span>
        <h2>还没有产品资产</h2>
        <p>创建第一条资产后，它会出现在这里，供后续工作区和策略流转使用。</p>
        <RouterLink to="/assets/new">新建资产</RouterLink>
      </section>

      <section v-else-if="filteredAssets.length > 0" class="assets-grid" data-testid="assets-grid">
        <article
          v-for="asset in filteredAssets"
          :key="asset.id"
          class="asset-card"
          tabindex="0"
          role="link"
          :aria-label="`打开 ${asset.displayName}`"
          @click="openAssetEditor(asset.id)"
          @keydown.enter.prevent="openAssetEditor(asset.id)"
          @keydown.space.prevent="openAssetEditor(asset.id)"
        >
          <div class="asset-card__halo" />

          <div class="asset-card__top">
            <div class="asset-card__identity">
              <div class="asset-card__icon" :class="`asset-card__icon--${asset.accent}`">
                <span class="material-symbols-outlined">{{ asset.icon }}</span>
              </div>

              <div>
                <h2>{{ asset.displayName }}</h2>

                <div class="asset-card__chips">
                  <span class="asset-card__chip" :class="`asset-card__chip--${asset.accent}`">
                    {{ asset.primaryCategory }}
                  </span>
                  <span
                    v-for="tag in asset.displayTags"
                    :key="`${asset.id}-${tag}`"
                    class="asset-card__chip"
                  >
                    {{ tag }}
                  </span>
                </div>
              </div>
            </div>

            <div class="asset-card__actions" @click.stop>
              <button
                type="button"
                class="asset-card__more"
                :aria-expanded="activeMenuId === asset.id"
                aria-label="打开资产操作"
                :data-testid="`asset-menu-trigger-${asset.id}`"
                @click="toggleAssetMenu(asset.id, $event)"
              >
                <span class="material-symbols-outlined">more_vert</span>
              </button>

              <div
                v-if="activeMenuId === asset.id"
                class="asset-card__menu"
                :data-testid="`asset-menu-${asset.id}`"
                @click.stop
              >
                <template v-if="confirmDeleteId === asset.id">
                  <div class="asset-card__menu-head">
                    <span class="asset-card__menu-kicker">危险操作</span>
                    <p class="asset-card__menu-copy">删除后无法恢复，确认继续吗？</p>
                  </div>
                  <div class="asset-card__menu-actions">
                    <button type="button" class="asset-card__menu-button" @click="cancelDeleteConfirmation($event)">
                      取消
                    </button>
                    <button
                      type="button"
                      class="asset-card__menu-button asset-card__menu-button--danger"
                      :disabled="deletingAssetId === asset.id"
                      :data-testid="`asset-delete-confirm-${asset.id}`"
                      @click="confirmDelete(asset, $event)"
                    >
                      {{ deletingAssetId === asset.id ? '删除中...' : '确认删除' }}
                    </button>
                  </div>
                </template>

                <button
                  v-else
                  type="button"
                  class="asset-card__menu-item asset-card__menu-item--danger"
                  :data-testid="`asset-delete-action-${asset.id}`"
                  @click="beginDeleteConfirmation(asset.id, $event)"
                >
                  <span class="asset-card__menu-item-icon">
                    <span class="material-symbols-outlined">delete</span>
                  </span>
                  <span class="asset-card__menu-item-copy">
                    <strong>删除资产</strong>
                    <small>从当前列表中移除该产品内容</small>
                  </span>
                </button>
              </div>
            </div>
          </div>

          <p class="asset-card__summary">{{ asset.displaySummary }}</p>

          <div class="asset-card__footer">
            <div class="asset-card__meta">
              <span class="material-symbols-outlined">calendar_today</span>
              <span>最近更新 {{ asset.displayDate }}</span>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="assets-state" data-testid="assets-filter-empty-state">
        <span class="material-symbols-outlined">filter_alt_off</span>
        <h2>当前筛选下没有资产</h2>
        <p>切换筛选条件，或创建新的产品资产。</p>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.assets-page {
  min-height: 100vh;
  color: #fff;
  background: transparent;
}

.assets-canvas {
  width: min(100%, 100rem);
  margin: 0 auto;
  padding: 2.3rem 2rem 3.4rem;
}

.assets-header {
  display: flex;
  justify-content: space-between;
  gap: 1.5rem;
  align-items: flex-start;
  margin-bottom: 1.2rem;
}

.assets-header h1,
.asset-card h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.assets-header h1 {
  font-size: clamp(2.5rem, 3vw, 3.3rem);
  line-height: 1;
}

.assets-header p {
  max-width: 42rem;
  margin: 0.55rem 0 0;
  color: #adaaaa;
  font-size: 0.94rem;
  line-height: 1.6;
}

.assets-header__action {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 2.8rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  color: #8ff5ff;
  background: #1a1919;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
  font-weight: 600;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.assets-header__action:hover {
  border-color: rgb(72 72 71 / 0.22);
  background: #201f1f;
}

.assets-feedback {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 1rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.9rem;
  background: #161616;
  box-shadow: var(--cn-shadow-ambient);
}

.assets-feedback .material-symbols-outlined {
  font-size: 1.25rem;
}

.assets-feedback p {
  margin: 0;
  line-height: 1.6;
}

.assets-feedback--success {
  color: #d8f9fc;
  border-color: rgb(143 245 255 / 0.22);
  background: rgb(143 245 255 / 0.08);
}

.assets-feedback--success .material-symbols-outlined {
  color: #8ff5ff;
}

.assets-feedback--info {
  color: #f3f2d7;
  border-color: rgb(195 244 0 / 0.18);
  background: rgb(195 244 0 / 0.08);
}

.assets-feedback--info .material-symbols-outlined {
  color: #c3f400;
}

.assets-feedback--error {
  color: #ffb5b2;
  border-color: rgb(255 113 108 / 0.18);
  background: rgb(255 113 108 / 0.08);
}

.assets-feedback--error .material-symbols-outlined {
  color: #ff716c;
}

.assets-filters {
  display: inline-flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  padding: 0.45rem;
  margin-bottom: 2rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1rem;
  background: #131313;
}

.assets-filters__button {
  min-height: 2.35rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  color: #adaaaa;
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 500;
  background: transparent;
  border: 1px solid transparent;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.assets-filters__button:hover {
  color: #fff;
  background: #1a1919;
}

.assets-filters__button--active {
  color: #8ff5ff;
  border-color: rgb(72 72 71 / 0.18);
  background: #262626;
}

.assets-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.assets-state {
  display: grid;
  gap: 0.7rem;
  justify-items: center;
  min-height: 16rem;
  padding: 3rem 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
  text-align: center;
  box-shadow: var(--cn-shadow-ambient);
}

.assets-state .material-symbols-outlined {
  color: #8ff5ff;
  font-size: 2rem;
}

.assets-state h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: 1.35rem;
}

.assets-state p {
  max-width: 32rem;
  margin: 0;
  color: #adaaaa;
  line-height: 1.7;
}

.assets-state a,
.assets-state button {
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  margin-top: 0.35rem;
  padding: 0 1rem;
  border: 1px solid rgb(143 245 255 / 0.25);
  border-radius: 0.5rem;
  color: #041316;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-family: var(--cn-font-body);
  font-weight: 700;
}

.assets-state--error .material-symbols-outlined {
  color: #ff716c;
}

.asset-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 15rem;
  padding: 1.6rem;
  overflow: hidden;
  cursor: pointer;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: var(--cn-shadow-ambient);
  transition:
    border-color var(--cn-transition),
    box-shadow var(--cn-transition),
    background-color var(--cn-transition);
}

.asset-card:hover,
.asset-card:focus-visible {
  border-color: rgb(143 245 255 / 0.3);
  outline: 0;
}

.asset-card__halo {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(143 245 255 / 0.06), transparent 50%);
  opacity: 0;
  transition: opacity var(--cn-transition);
  pointer-events: none;
}

.asset-card:hover .asset-card__halo {
  opacity: 1;
}

.asset-card__top,
.asset-card__identity,
.asset-card__footer,
.asset-card__meta {
  display: flex;
  align-items: flex-start;
}

.asset-card__top,
.asset-card__footer {
  justify-content: space-between;
}

.asset-card__identity {
  gap: 0.9rem;
  min-width: 0;
}

.asset-card__icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  flex-shrink: 0;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.7rem;
  background: #262626;
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.015);
}

.asset-card__icon--primary {
  color: #65afff;
}

.asset-card__icon--secondary {
  color: #c3f400;
}

.asset-card__icon--error {
  color: #ff716c;
}

.asset-card h2 {
  font-size: 1.05rem;
  line-height: 1.2;
}

.asset-card__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
  margin-top: 0.45rem;
}

.asset-card__chip {
  display: inline-flex;
  align-items: center;
  min-height: 1.4rem;
  padding: 0 0.48rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.3rem;
  color: #adaaaa;
  background: #151515;
  font-family: var(--cn-font-body);
  font-size: 0.7rem;
  line-height: 1;
}

.asset-card__chip--primary {
  color: #65afff;
  border-color: rgb(101 175 255 / 0.2);
}

.asset-card__chip--secondary {
  color: #c3f400;
  border-color: rgb(195 244 0 / 0.2);
}

.asset-card__chip--error {
  color: #ff716c;
  border-color: rgb(255 113 108 / 0.2);
}

.asset-card__actions {
  position: relative;
  flex-shrink: 0;
}

.asset-card__more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 2rem;
  min-height: 2rem;
  padding: 0;
  color: #adaaaa;
  background: rgb(19 19 19 / 0.76);
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 0.55rem;
  backdrop-filter: blur(18px);
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.asset-card__more:hover,
.asset-card__more[aria-expanded='true'] {
  color: #d8f9fc;
  border-color: rgb(143 245 255 / 0.18);
  background: rgb(26 26 26 / 0.9);
}

.asset-card__more .material-symbols-outlined {
  font-size: 1.2rem;
  line-height: 1;
  font-variation-settings:
    'FILL' 0,
    'wght' 400,
    'GRAD' 0,
    'opsz' 20;
}

.asset-card__menu {
  position: absolute;
  top: calc(100% + 0.5rem);
  right: 0;
  z-index: 3;
  display: grid;
  gap: 0.9rem;
  width: 15.5rem;
  padding: 0.95rem;
  border: 1px solid rgb(72 72 71 / 0.16);
  border-radius: 0.75rem;
  background:
    linear-gradient(180deg, rgb(255 255 255 / 0.02), transparent 48%),
    rgb(19 19 19 / 0.84);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.5);
}

.asset-card__menu-head {
  display: grid;
  gap: 0.45rem;
}

.asset-card__menu-kicker {
  color: #ff8f89;
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.asset-card__menu-copy {
  margin: 0;
  color: #e2dfdf;
  font-size: 0.78rem;
  line-height: 1.6;
}

.asset-card__menu-actions {
  display: flex;
  gap: 0.55rem;
  justify-content: flex-end;
}

.asset-card__menu-button,
.asset-card__menu-item {
  display: inline-flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  min-height: 2.35rem;
  border-radius: 0.7rem;
  font-family: var(--cn-font-body);
  font-size: 0.78rem;
  font-weight: 600;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition),
    opacity var(--cn-transition);
}

.asset-card__menu-button {
  min-width: 4.9rem;
  padding: 0 0.85rem;
  border: 1px solid rgb(72 72 71 / 0.14);
  color: #d6d4d4;
  background: rgb(26 26 26 / 0.88);
}

.asset-card__menu-button:hover,
.asset-card__menu-item:hover {
  border-color: rgb(72 72 71 / 0.22);
}

.asset-card__menu-button:disabled {
  cursor: wait;
  opacity: 0.7;
}

.asset-card__menu-button--danger,
.asset-card__menu-item--danger {
  color: #fff4f3;
  border-color: rgb(255 113 108 / 0.12);
  background:
    linear-gradient(135deg, rgb(255 113 108 / 0.3), rgb(255 113 108 / 0.18)),
    rgb(255 113 108 / 0.08);
  box-shadow: 0 0 18px rgb(255 113 108 / 0.12);
}

.asset-card__menu-item {
  width: 100%;
  justify-content: flex-start;
  padding: 0.8rem 0.85rem;
  border: 1px solid rgb(255 113 108 / 0.1);
}

.asset-card__menu-item-icon {
  display: inline-grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border-radius: 0.55rem;
  background: rgb(255 255 255 / 0.08);
}

.asset-card__menu-item-copy {
  display: grid;
  gap: 0.15rem;
  justify-items: start;
  text-align: left;
}

.asset-card__menu-item-copy strong {
  font-size: 0.8rem;
}

.asset-card__menu-item-copy small {
  color: rgb(255 244 243 / 0.78);
  font-size: 0.68rem;
  font-weight: 500;
}

.asset-card__summary {
  flex: 1;
  margin: 1.35rem 0 1.6rem;
  color: #adaaaa;
  font-size: 0.88rem;
  line-height: 1.78;
}

.asset-card__footer {
  padding-top: 1rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.asset-card__meta {
  gap: 0.38rem;
  color: #adaaaa;
  align-items: center;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
}

@media (max-width: 1200px) {
  .assets-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 900px) {
  .assets-canvas {
    padding-inline: 1.35rem;
  }

  .assets-header {
    flex-direction: column;
    align-items: stretch;
  }

  .assets-grid {
    grid-template-columns: 1fr;
  }

  .asset-card__menu {
    width: min(100vw - 4.4rem, 15.5rem);
  }
}
</style>
