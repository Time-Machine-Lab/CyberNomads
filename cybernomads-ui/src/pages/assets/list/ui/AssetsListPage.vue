<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRouter } from 'vue-router'

import { listAssets } from '@/entities/asset/api/asset-service'
import type { AssetRecord } from '@/entities/asset/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

interface AssetDisplayCard extends AssetRecord {
  accent: 'primary' | 'secondary' | 'error'
  icon: string
  displayName: string
  displaySummary: string
  displayDate: string
  primaryCategory: string
  displayTags: string[]
}

const assets = ref<AssetRecord[]>([])
const activeFilter = ref('全部')
const router = useRouter()

const filters = ['全部', 'SEO优化', '病毒传播', '社群增长', '长图文', '短视频'] as const

const assetDisplayMap = {
  'asset-core-whitepaper': {
    accent: 'primary',
    icon: 'article',
    displayName: 'AIGC 高效工作流指南',
    displaySummary:
      '针对初级 AI 用户的全面指南，包含核心提示词框架和常用工具对比，适合知乎、小红书长图文分发。',
    displayDate: '2023-10-15',
    primaryCategory: 'SEO优化',
    displayTags: ['长图文', 'AI工具'],
  },
  'asset-telegram-community': {
    accent: 'error',
    icon: 'campaign',
    displayName: '双十一增长爆款文案集',
    displaySummary:
      '高情绪价值短文案库，内置 10 个裂变 Prompt 模板，专为短视频平台及朋友圈设计。',
    displayDate: '2023-11-01',
    primaryCategory: '病毒传播',
    displayTags: ['短视频', '文案'],
  },
  'asset-demo-video': {
    accent: 'secondary',
    icon: 'forum',
    displayName: '私域社群破冰话术库',
    displaySummary:
      '包含 30 种不同场景的新用户入群互动脚本，旨在提高首周留存率和群聊互动活跃度。',
    displayDate: '2023-09-22',
    primaryCategory: '社群增长',
    displayTags: ['互动', '脚本'],
  },
} as const

watch(
  mockScenarioId,
  async () => {
    assets.value = await listAssets()
  },
  { immediate: true },
)

const displayAssets = computed(() => {
  const cards: AssetDisplayCard[] = []

  for (const id of Object.keys(assetDisplayMap) as Array<keyof typeof assetDisplayMap>) {
    const asset = assets.value.find((item) => item.id === id)
    const display = assetDisplayMap[id]

    if (!asset) {
      continue
    }

    cards.push({
      ...asset,
      ...display,
      displayTags: [...display.displayTags],
    })
  }

  return cards
})

const filteredAssets = computed(() => {
  if (activeFilter.value === '全部') {
    return displayAssets.value
  }

  return displayAssets.value.filter((asset) =>
    [asset.primaryCategory, ...asset.displayTags].includes(activeFilter.value),
  )
})

const openAssetEditor = (assetId: string) => {
  void router.push(`/assets/${assetId}/edit`)
}
</script>

<template>
  <section class="assets-page">
    <div class="assets-canvas">
      <header class="assets-header">
        <div>
          <h1>引流资产列表</h1>
          <p>管理和监控全局可复用内容资产及策略部署情况。</p>
        </div>

        <RouterLink class="assets-header__action" to="/assets/new">
          <span class="material-symbols-outlined">add</span>
          <span>新建资产</span>
        </RouterLink>
      </header>

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

      <section class="assets-grid">
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

            <span class="asset-card__more" aria-hidden="true">
              <span class="material-symbols-outlined">more_vert</span>
            </span>
          </div>

          <p class="asset-card__summary">{{ asset.displaySummary }}</p>

          <div class="asset-card__footer">
            <div class="asset-card__meta">
              <span class="material-symbols-outlined">calendar_today</span>
              <span>创建于: {{ asset.displayDate }}</span>
            </div>
          </div>
        </article>
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
  margin-bottom: 1.9rem;
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
  margin: 0.55rem 0 0;
  color: #adaaaa;
  font-size: 0.94rem;
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

.asset-card__more {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-width: 1.5rem;
  min-height: 1.5rem;
  flex-shrink: 0;
  padding-top: 0.1rem;
  color: #adaaaa;
  background: transparent;
  border-radius: 0;
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
}
</style>
