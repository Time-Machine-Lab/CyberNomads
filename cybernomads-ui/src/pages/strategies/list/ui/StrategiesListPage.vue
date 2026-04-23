<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { isRealStrategyApiEnabled, listStrategies } from '@/entities/strategy/api/strategy-service'
import type { StrategyRecord } from '@/entities/strategy/model/types'

interface StrategyDisplayCard extends StrategyRecord {
  icon: string
  accent: 'primary' | 'tertiary' | 'error' | 'secondary'
  displayTag: string
}

const route = useRoute()
const router = useRouter()

const strategies = ref<StrategyRecord[]>([])
const keyword = ref('')
const isLoading = ref(false)
const errorMessage = ref('')

const dataSourceLabel = computed(() => (isRealStrategyApiEnabled() ? '真实后端' : 'Mock'))

const filteredStrategies = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()

  if (!normalizedKeyword) {
    return strategies.value
  }

  return strategies.value.filter((strategy) => {
    return [strategy.name, strategy.summary, strategy.tags.join(' '), strategy.id]
      .join(' ')
      .toLowerCase()
      .includes(normalizedKeyword)
  })
})

const strategyCards = computed(() => {
  return filteredStrategies.value
    .slice()
    .sort((left, right) => right.updatedAt.localeCompare(left.updatedAt))
    .map((strategy, index) => {
      const primaryTag = strategy.tags[0] ?? '未分类'

      return {
        ...strategy,
        icon: resolveStrategyIcon(strategy, index),
        accent: resolveStrategyAccent(strategy, index),
        displayTag: primaryTag,
      } satisfies StrategyDisplayCard
    })
})

const featured = computed(() => strategyCards.value[0] ?? null)
const secondaryStrategies = computed(() => strategyCards.value.slice(1))
const stateMessage = computed(() => {
  if (isLoading.value) {
    return '正在同步策略列表...'
  }

  if (errorMessage.value) {
    return errorMessage.value
  }

  if (keyword.value.trim()) {
    return '没有匹配当前检索条件的策略。'
  }

  return '当前还没有策略，可以直接创建第一条。'
})

watch(() => route.query.refresh, () => {
  void loadStrategies()
}, { immediate: true })

async function loadStrategies() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    strategies.value = await listStrategies()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '策略列表加载失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

function resolveStrategyIcon(strategy: StrategyRecord, index: number) {
  if (strategy.tags.some((tag) => tag.includes('私信'))) return 'forum'
  if (strategy.tags.some((tag) => tag.includes('活动'))) return 'bolt'
  if (strategy.tags.some((tag) => tag.includes('滴灌'))) return 'water_drop'
  return index % 2 === 0 ? 'radar' : 'route'
}

function resolveStrategyAccent(
  strategy: StrategyRecord,
  index: number,
): StrategyDisplayCard['accent'] {
  if (strategy.tags.some((tag) => tag.includes('活动'))) return 'error'
  if (strategy.tags.some((tag) => tag.includes('私信'))) return 'tertiary'
  return index % 3 === 0 ? 'primary' : 'secondary'
}

function openStrategyEditor(strategyId: string) {
  void router.push(`/strategies/${strategyId}/edit`)
}

function openCreatePage() {
  void router.push('/strategies/new')
}
</script>

<template>
  <section class="strategies-page">
    <div class="strategies-topbar">
      <label class="strategies-topbar__search">
        <span class="material-symbols-outlined">search</span>
        <input v-model="keyword" type="text" placeholder="搜索策略名称、摘要、标签或 ID" data-testid="strategy-search" />
      </label>

      <div class="strategies-topbar__actions">
        <span class="strategies-topbar__brand">CN</span>
        <button type="button" aria-label="刷新策略列表" data-testid="strategy-refresh" @click="loadStrategies">
          <span class="material-symbols-outlined">refresh</span>
        </button>
      </div>
    </div>

    <div class="strategies-canvas">
      <header class="strategies-header">
        <div>
          <h1>策略库</h1>
          <p>部署预配置的神经流量矢量。选择一个架构来启动针对目标网络的自动化受众获取。</p>
        </div>

        <div class="strategies-header__actions">
          <div class="strategies-header__meta">
            <span>活动矢量:</span>
            <strong>{{ filteredStrategies.length }}</strong>
          </div>

          <RouterLink class="strategies-header__button" to="/strategies/new">
            <span class="material-symbols-outlined">add</span>
            <span>新建策略</span>
          </RouterLink>
        </div>
      </header>

      <div class="strategies-toolbar">
        <div class="strategies-toolbar__label">
          <span class="material-symbols-outlined">database</span>
          <span>{{ dataSourceLabel }}</span>
        </div>

        <button type="button" class="strategies-toolbar__filter" @click="keyword = ''">
          <span>检索</span>
          <strong>{{ keyword.trim() || '全部' }}</strong>
          <span class="material-symbols-outlined">close_small</span>
        </button>

        <button type="button" class="strategies-toolbar__filter" @click="loadStrategies">
          <span>数据</span>
          <strong>{{ strategies.length }} 条</strong>
          <span class="material-symbols-outlined">sync</span>
        </button>

        <div class="strategies-toolbar__view">
          <button type="button" class="strategies-toolbar__view-button strategies-toolbar__view-button--active" @click="loadStrategies">
            <span class="material-symbols-outlined">refresh</span>
          </button>
          <button type="button" class="strategies-toolbar__view-button" @click="openCreatePage">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
      </div>

      <section v-if="featured" class="strategies-grid" data-testid="strategy-list">
        <article
          class="strategy-card strategy-card--featured"
          role="link"
          tabindex="0"
          @click="openStrategyEditor(featured.id)"
          @keydown.enter="openStrategyEditor(featured.id)"
          @keydown.space.prevent="openStrategyEditor(featured.id)"
        >
          <div class="strategy-card__feature-glow" />

          <div class="strategy-card__top">
            <div class="strategy-card__title-wrap">
              <div class="strategy-card__icon strategy-card__icon--primary">
                <span class="material-symbols-outlined">{{ featured.icon }}</span>
              </div>
              <h2>{{ featured.name }}</h2>
            </div>

            <div class="strategy-card__top-actions">
              <span class="strategy-card__badge strategy-card__badge--featured">{{ featured.displayTag }}</span>
            </div>
          </div>

          <p class="strategy-card__summary">{{ featured.summary }}</p>

          <div class="strategy-card__stats strategy-card__stats--featured">
            <div>
              <small>最近更新</small>
              <strong class="strategy-card__value strategy-card__value--primary">{{ featured.updatedAtLabel }}</strong>
            </div>
            <div>
              <small>标签数</small>
              <strong class="strategy-card__value">{{ featured.tags.length }}</strong>
            </div>
            <div>
              <small>策略 ID</small>
              <strong class="strategy-card__value strategy-card__value--secondary">{{ featured.id }}</strong>
            </div>
          </div>
        </article>

        <article
          v-for="strategy in secondaryStrategies"
          :key="strategy.id"
          class="strategy-card"
          role="link"
          tabindex="0"
          @click="openStrategyEditor(strategy.id)"
          @keydown.enter="openStrategyEditor(strategy.id)"
          @keydown.space.prevent="openStrategyEditor(strategy.id)"
        >
          <div class="strategy-card__top">
            <div class="strategy-card__icon" :class="`strategy-card__icon--${strategy.accent}`">
              <span class="material-symbols-outlined">{{ strategy.icon }}</span>
            </div>

            <div class="strategy-card__top-actions">
              <span class="strategy-card__badge">{{ strategy.displayTag }}</span>
            </div>
          </div>

          <h2>{{ strategy.name }}</h2>
          <p class="strategy-card__summary">{{ strategy.summary }}</p>

          <div class="strategy-card__stats">
            <div>
              <small>最近更新</small>
              <strong class="strategy-card__value" :class="strategy.accent === 'primary' ? 'strategy-card__value--primary' : undefined">
                {{ strategy.updatedAtLabel }}
              </strong>
            </div>
            <div>
              <small>主标签</small>
              <strong class="strategy-card__value">{{ strategy.displayTag }}</strong>
            </div>
            <div>
              <small>标签数</small>
              <strong class="strategy-card__value" :class="`strategy-card__value--${strategy.accent}`">
                {{ strategy.tags.length }}
              </strong>
            </div>
          </div>
        </article>
      </section>

      <section v-else class="strategies-grid">
        <article class="strategy-card strategy-card--featured strategy-card--state">
          <div class="strategy-card__top">
            <div class="strategy-card__title-wrap">
              <div class="strategy-card__icon strategy-card__icon--tertiary">
                <span class="material-symbols-outlined">{{ errorMessage ? 'error' : isLoading ? 'progress_activity' : 'inventory_2' }}</span>
              </div>
              <h2>{{ errorMessage ? '策略列表加载失败' : isLoading ? '正在加载策略' : '暂无策略' }}</h2>
            </div>
          </div>

          <p class="strategy-card__summary">{{ stateMessage }}</p>

          <div class="strategy-card__stats strategy-card__stats--featured">
            <div>
              <small>数据源</small>
              <strong class="strategy-card__value strategy-card__value--primary">{{ dataSourceLabel }}</strong>
            </div>
            <div>
              <small>当前检索</small>
              <strong class="strategy-card__value">{{ keyword.trim() || '全部' }}</strong>
            </div>
            <div>
              <small>策略总数</small>
              <strong class="strategy-card__value strategy-card__value--secondary">{{ strategies.length }}</strong>
            </div>
          </div>
        </article>
      </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.strategies-page {
  min-height: 100vh;
  color: #fff;
  background: transparent;
}

.strategies-topbar,
.strategies-topbar__actions,
.strategies-header,
.strategies-header__actions,
.strategies-toolbar,
.strategies-toolbar__label,
.strategies-toolbar__filter,
.strategies-toolbar__view,
.strategy-card__top,
.strategy-card__top-actions,
.strategy-card__title-wrap,
.strategy-card__button,
.strategy-card__stats,
.strategy-card__icon-button {
  display: flex;
  align-items: center;
}

.strategies-topbar {
  justify-content: space-between;
  gap: 1rem;
  min-height: 4.4rem;
  padding: 0 1.9rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.15);
}

.strategies-topbar__search {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  width: min(19rem, 100%);
  height: 2.7rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.7rem;
  color: #767575;
  background: #131313;
}

.strategies-topbar__search input {
  width: 100%;
  border: 0;
  outline: 0;
  color: #fff;
  background: transparent;
}

.strategies-topbar__search input::placeholder {
  color: #767575;
}

.strategies-topbar__brand {
  color: #00eefc;
  font-family: var(--cn-font-display);
  font-size: 1.35rem;
  font-weight: 700;
  letter-spacing: 0.18em;
}

.strategies-topbar__actions {
  gap: 1rem;
  color: #adaaaa;
}

.strategies-topbar__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.strategies-topbar__actions img {
  width: 1.85rem;
  height: 1.85rem;
  border-radius: 999px;
  object-fit: cover;
}

.strategies-canvas {
  width: min(100%, 100rem);
  margin: 0 auto;
  padding: 2.3rem 2rem 3.4rem;
}

.strategies-header {
  justify-content: space-between;
  gap: 1.25rem;
  margin-bottom: 1.35rem;
}

.strategies-header h1,
.strategy-card h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.strategies-header h1 {
  font-size: clamp(2.6rem, 3vw, 3.4rem);
}

.strategies-header p {
  max-width: 40rem;
  margin: 0.5rem 0 0;
  color: #adaaaa;
  font-size: 0.93rem;
  line-height: 1.6;
}

.strategies-header__actions {
  gap: 1rem;
}

.strategies-header__meta {
  color: #adaaaa;
  font-size: 0.85rem;
}

.strategies-header__meta strong {
  margin-left: 0.35rem;
  color: #c3f400;
  font-size: 1.45rem;
  font-family: var(--cn-font-display);
}

.strategies-header__button {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  min-height: 2.5rem;
  padding: 0 1.2rem;
  border: 1px solid rgb(143 245 255 / 0.18);
  border-radius: 0.25rem;
  color: #005d63;
  background: #8ff5ff;
  font-family: var(--cn-font-body);
  font-size: 0.84rem;
  font-weight: 700;
  box-shadow: 0 0 15px rgb(143 245 255 / 0.3);
  transition:
    background-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.strategies-header__button:hover {
  color: #005d63;
  background: #00eefc;
}

.strategies-toolbar {
  gap: 1rem;
  padding: 1rem;
  margin-bottom: 2rem;
  border: 0;
  border-radius: 1rem;
  background: #131313;
}

.strategies-toolbar__label {
  gap: 0.5rem;
  margin-right: 0.25rem;
  color: #adaaaa;
  font-size: 0.85rem;
  font-weight: 500;
}

.strategies-toolbar__filter {
  gap: 0.45rem;
  min-height: 2.4rem;
  padding: 0 0.95rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.5rem;
  color: #fff;
  background: #1a1919;
  font-family: var(--cn-font-body);
  font-size: 0.84rem;
  transition:
    background-color var(--cn-transition),
    border-color var(--cn-transition);
}

.strategies-toolbar__filter:hover {
  border-color: rgb(72 72 71 / 0.25);
  background: #262626;
}

.strategies-toolbar__filter strong {
  color: #8ff5ff;
  font-weight: 600;
}

.strategies-toolbar__view {
  gap: 0.25rem;
  margin-left: auto;
  padding: 0.2rem;
  border-radius: 0.5rem;
  background: #1a1919;
}

.strategies-toolbar__view-button {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 0;
  border-radius: 0.25rem;
  outline: 0;
  color: #adaaaa;
  background: transparent;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.strategies-toolbar__view-button--active {
  color: #8ff5ff;
  background: #262626;
  box-shadow: 0 1px 2px rgb(0 0 0 / 0.18);
}

.strategies-toolbar__view-button:hover:not(.strategies-toolbar__view-button--active) {
  color: #fff;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.strategy-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 18rem;
  padding: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: var(--cn-shadow-ambient);
  cursor: pointer;
  transition:
    border-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.strategy-card:focus-visible {
  outline: 1px solid rgb(143 245 255 / 0.45);
  outline-offset: 2px;
}

.strategy-card:hover {
  border-color: rgb(143 245 255 / 0.22);
}

.strategy-card--featured {
  grid-column: span 2;
  min-height: 17.5rem;
  overflow: hidden;
  border-color: transparent;
}

.strategy-card--state {
  cursor: default;
}

.strategy-card__feature-glow {
  position: absolute;
  top: -3rem;
  right: -3rem;
  width: 18rem;
  height: 18rem;
  background: rgb(143 245 255 / 0.05);
  border-radius: 999px;
  filter: blur(80px);
  pointer-events: none;
}

.strategy-card__top {
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
}

.strategy-card__title-wrap {
  gap: 0.8rem;
}

.strategy-card__icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  flex-shrink: 0;
  border-radius: 0.5rem;
  background: #262626;
}

.strategy-card__icon--primary {
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.1);
}

.strategy-card__icon--secondary {
  color: #c3f400;
  background: rgb(195 244 0 / 0.1);
}

.strategy-card__icon--tertiary {
  color: #65afff;
  background: rgb(101 175 255 / 0.1);
}

.strategy-card__icon--error {
  color: #ff716c;
  background: rgb(255 113 108 / 0.1);
}

.strategy-card h2 {
  font-size: 1.3rem;
  line-height: 1.2;
}

.strategy-card__top-actions {
  gap: 0.45rem;
}

.strategy-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0 0.55rem;
  border: 0;
  border-radius: 0.25rem;
  color: #adaaaa;
  background: #262626;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
}

.strategy-card__badge--featured {
  color: #c3f400;
  background: rgb(195 244 0 / 0.08);
  border: 1px solid rgb(195 244 0 / 0.2);
  font-family: var(--cn-font-display);
  font-weight: 700;
}

.strategy-card__summary {
  flex: 1;
  margin: 1rem 0 1.5rem;
  color: #adaaaa;
  font-size: 0.87rem;
  line-height: 1.65;
}

.strategy-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.5rem;
  margin-bottom: 1rem;
}

.strategy-card__stats--featured {
  max-width: 32rem;
}

.strategy-card__stats > div {
  padding: 0.55rem;
  border-radius: 0.25rem;
  background: #131313;
  text-align: center;
}

.strategy-card__stats small {
  display: block;
  margin-bottom: 0.24rem;
  color: #adaaaa;
  font-size: 0.6rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.strategy-card__value {
  color: #fff;
  font-size: 0.88rem;
  font-weight: 600;
}

.strategy-card__value--primary {
  color: #8ff5ff;
}

.strategy-card__value--secondary {
  color: #c3f400;
}

.strategy-card__value--tertiary {
  color: #65afff;
}

.strategy-card__value--error {
  color: #ff716c;
}

@media (max-width: 1200px) {
  .strategies-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }

  .strategy-card--featured {
    grid-column: span 2;
  }
}

@media (max-width: 900px) {
  .strategies-topbar,
  .strategies-header {
    flex-direction: column;
    align-items: stretch;
  }

  .strategies-topbar__search {
    width: 100%;
  }

  .strategies-toolbar {
    flex-wrap: wrap;
  }

  .strategies-toolbar__view {
    margin-left: 0;
  }

  .strategies-grid {
    grid-template-columns: 1fr;
  }

  .strategy-card--featured {
    grid-column: span 1;
  }
}
</style>
