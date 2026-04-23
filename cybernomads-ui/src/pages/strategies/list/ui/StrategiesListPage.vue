<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { deleteStrategy, isRealStrategyApiEnabled, listStrategies } from '@/entities/strategy/api/strategy-service'
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
const isDeleting = ref(false)
const errorMessage = ref('')
const viewMode = ref<'card' | 'list'>('card')
const deletingStrategy = ref<StrategyDisplayCard | null>(null)

const dataSourceLabel = computed(() => (isRealStrategyApiEnabled() ? '真实后端' : 'Mock'))

const strategyCards = computed(() => {
  const normalizedKeyword = keyword.value.trim().toLowerCase()
  const visibleStrategies = !normalizedKeyword
    ? strategies.value
    : strategies.value.filter((strategy) => {
        return [strategy.name, strategy.summary, strategy.tags.join(' '), strategy.id]
          .join(' ')
          .toLowerCase()
          .includes(normalizedKeyword)
      })

  return visibleStrategies
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
    return '没有匹配当前筛选条件的策略。'
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

function formatStrategyId(strategyId: string) {
  return strategyId.slice(0, 8)
}

function openDeleteDialog(strategy: StrategyDisplayCard, event?: Event) {
  event?.stopPropagation()
  deletingStrategy.value = strategy
}

function closeDeleteDialog() {
  if (isDeleting.value) {
    return
  }

  deletingStrategy.value = null
}

async function confirmDeleteStrategy() {
  if (!deletingStrategy.value) {
    return
  }

  isDeleting.value = true

  try {
    await deleteStrategy(deletingStrategy.value.id)
    deletingStrategy.value = null
    await loadStrategies()
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '策略删除失败，请稍后重试。'
  } finally {
    isDeleting.value = false
  }
}
</script>

<template>
  <section class="strategies-page">
    <div class="strategies-canvas">
      <header class="strategies-header">
        <div>
          <h1>策略库</h1>
          <p>部署预配置的神经流量矢量。选择一个架构来启动针对目标网络的自动化受众获取。</p>
        </div>

        <div class="strategies-header__actions">
          <div class="strategies-header__meta">
            <span>活动矢量:</span>
            <strong>{{ strategyCards.length }}</strong>
          </div>

          <button type="button" class="strategies-header__refresh" :disabled="isLoading" @click="loadStrategies">
            <span class="material-symbols-outlined">{{ isLoading ? 'sync' : 'refresh' }}</span>
          </button>

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

        <label class="strategies-toolbar__search">
          <span class="material-symbols-outlined">search</span>
          <input v-model="keyword" type="text" placeholder="搜索策略名称、摘要、标签或 ID" data-testid="strategy-search" />
        </label>

        <div class="strategies-toolbar__view">
          <button
            type="button"
            class="strategies-toolbar__view-button"
            :class="{ 'strategies-toolbar__view-button--active': viewMode === 'card' }"
            @click="viewMode = 'card'"
          >
            <span class="material-symbols-outlined">grid_view</span>
          </button>
          <button
            type="button"
            class="strategies-toolbar__view-button"
            :class="{ 'strategies-toolbar__view-button--active': viewMode === 'list' }"
            @click="viewMode = 'list'"
          >
            <span class="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      <section v-if="featured && viewMode === 'card'" class="strategies-grid" data-testid="strategy-list">
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
              <button
                type="button"
                class="strategy-card__delete"
                aria-label="删除策略"
                @click.stop="openDeleteDialog(featured, $event)"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
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
              <strong class="strategy-card__value strategy-card__value--secondary" :title="featured.id">
                {{ formatStrategyId(featured.id) }}
              </strong>
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
              <button
                type="button"
                class="strategy-card__delete"
                aria-label="删除策略"
                @click.stop="openDeleteDialog(strategy, $event)"
              >
                <span class="material-symbols-outlined">delete</span>
              </button>
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

      <section v-else-if="featured && viewMode === 'list'" class="strategies-list" data-testid="strategy-list">
        <article
          v-for="strategy in strategyCards"
          :key="strategy.id"
          class="strategies-list__item"
          role="link"
          tabindex="0"
          @click="openStrategyEditor(strategy.id)"
          @keydown.enter="openStrategyEditor(strategy.id)"
          @keydown.space.prevent="openStrategyEditor(strategy.id)"
        >
          <div class="strategies-list__main">
            <div class="strategy-card__icon" :class="`strategy-card__icon--${strategy.accent}`">
              <span class="material-symbols-outlined">{{ strategy.icon }}</span>
            </div>
            <div class="strategies-list__content">
              <div class="strategies-list__title-row">
                <h2>{{ strategy.name }}</h2>
                <span class="strategy-card__badge">{{ strategy.displayTag }}</span>
                <button
                  type="button"
                  class="strategy-card__delete"
                  aria-label="删除策略"
                  @click.stop="openDeleteDialog(strategy, $event)"
                >
                  <span class="material-symbols-outlined">delete</span>
                </button>
              </div>
              <p>{{ strategy.summary }}</p>
            </div>
          </div>

          <div class="strategies-list__meta">
            <div>
              <small>最近更新</small>
              <strong>{{ strategy.updatedAtLabel }}</strong>
            </div>
            <div>
              <small>策略 ID</small>
              <strong :title="strategy.id">{{ formatStrategyId(strategy.id) }}</strong>
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
              <strong class="strategy-card__value">全部</strong>
            </div>
            <div>
              <small>策略总数</small>
              <strong class="strategy-card__value strategy-card__value--secondary">{{ strategies.length }}</strong>
            </div>
          </div>
        </article>
      </section>

      <div v-if="deletingStrategy" class="strategy-dialog__backdrop" @click.self="closeDeleteDialog">
        <div class="strategy-dialog">
          <div class="strategy-dialog__header">
            <div>
              <h3>确认删除策略</h3>
              <p>{{ deletingStrategy.name }}</p>
            </div>
            <button type="button" class="strategy-dialog__close" :disabled="isDeleting" @click="closeDeleteDialog">
              <span class="material-symbols-outlined">close</span>
            </button>
          </div>

          <p class="strategy-dialog__message">
            删除后将同时移除该策略的元数据和 Markdown 正文，此操作不可撤销。
          </p>

          <div class="strategy-dialog__footer">
            <button type="button" class="strategy-dialog__button strategy-dialog__button--ghost" :disabled="isDeleting" @click="closeDeleteDialog">
              取消
            </button>
            <button type="button" class="strategy-dialog__button strategy-dialog__button--danger" :disabled="isDeleting" @click="confirmDeleteStrategy">
              {{ isDeleting ? '删除中…' : '确认删除' }}
            </button>
          </div>
        </div>
      </div>
    </div>
  </section>
</template>

<style scoped lang="scss">
.strategies-page {
  min-height: 100vh;
  color: #fff;
  background: transparent;
}

.strategies-header,
.strategies-header__actions,
.strategies-toolbar,
.strategies-toolbar__label,
.strategy-card__top,
.strategy-card__top-actions,
.strategy-card__title-wrap,
.strategy-card__button,
.strategy-card__stats,
.strategy-card__icon-button {
  display: flex;
  align-items: center;
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

.strategies-header__refresh {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.35rem;
  color: #adaaaa;
  background: #1a1919;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.strategies-header__refresh:hover {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.25);
  background: #262626;
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
  margin-bottom: 2rem;
  padding: 0.9rem 1rem;
  border-radius: 1rem;
  background: #131313;
}

.strategies-toolbar__label {
  gap: 0.5rem;
  color: #adaaaa;
  font-size: 0.85rem;
  font-weight: 500;
}

.strategies-toolbar__search {
  display: flex;
  flex: 1;
  gap: 0.55rem;
  align-items: center;
  min-width: 0;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.7rem;
  color: #767575;
  background: #1a1919;
}

.strategies-toolbar__search input {
  width: 100%;
  min-width: 0;
  border: 0;
  outline: 0;
  color: #fff;
  background: transparent;
}

.strategies-toolbar__search input::placeholder {
  color: #767575;
}

.strategies-toolbar__view {
  display: flex;
  gap: 0.25rem;
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
  align-items: center;
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
  margin-top: 1rem;
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

.strategy-card__delete {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  padding: 0;
  border: 1px solid rgb(255 113 108 / 0.15);
  border-radius: 0.35rem;
  color: #ff938f;
  background: rgb(255 113 108 / 0.04);
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.strategy-card__delete:hover {
  border-color: rgb(255 113 108 / 0.3);
  color: #ff716c;
  background: rgb(255 113 108 / 0.08);
}

.strategy-card__summary {
  flex: 1;
  margin: 1.15rem 0 1.5rem;
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

.strategies-list {
  display: grid;
  gap: 0.9rem;
}

.strategies-list__item {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 1.25rem;
  padding: 1rem 1.15rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: var(--cn-shadow-ambient);
  cursor: pointer;
  transition:
    border-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.strategies-list__item:hover {
  border-color: rgb(143 245 255 / 0.22);
}

.strategies-list__item:focus-visible {
  outline: 1px solid rgb(143 245 255 / 0.45);
  outline-offset: 2px;
}

.strategies-list__main {
  display: flex;
  align-items: center;
  gap: 0.9rem;
  min-width: 0;
}

.strategies-list__content {
  min-width: 0;
}

.strategies-list__title-row {
  display: flex;
  gap: 0.7rem;
  align-items: center;
}

.strategies-list__title-row h2 {
  margin: 0;
  font-size: 1.05rem;
}

.strategies-list__content p {
  margin: 0.35rem 0 0;
  color: #adaaaa;
  font-size: 0.86rem;
  line-height: 1.55;
}

.strategies-list__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(8rem, auto));
  gap: 0.65rem;
}

.strategies-list__meta > div {
  padding: 0.45rem 0.7rem;
  border-radius: 0.45rem;
  background: #131313;
  text-align: center;
}

.strategies-list__meta small {
  display: block;
  margin-bottom: 0.2rem;
  color: #adaaaa;
  font-size: 0.62rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.strategies-list__meta strong {
  color: #fff;
  font-size: 0.84rem;
  font-weight: 600;
}

.strategy-dialog__backdrop {
  position: fixed;
  inset: 0;
  z-index: 40;
  display: grid;
  place-items: center;
  padding: 1.5rem;
  background: rgb(0 0 0 / 0.58);
}

.strategy-dialog {
  width: min(100%, 28rem);
  padding: 1.2rem;
  border: 1px solid rgb(72 72 71 / 0.22);
  border-radius: 1rem;
  background: #161616;
  box-shadow: 0 20px 50px rgb(0 0 0 / 0.4);
}

.strategy-dialog__header,
.strategy-dialog__footer {
  display: flex;
  align-items: center;
}

.strategy-dialog__header {
  justify-content: space-between;
  gap: 1rem;
}

.strategy-dialog__header h3 {
  margin: 0;
  font-size: 1rem;
}

.strategy-dialog__header p {
  margin: 0.25rem 0 0;
  color: #adaaaa;
  font-size: 0.85rem;
}

.strategy-dialog__close {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 999px;
  color: #adaaaa;
  background: #262626;
}

.strategy-dialog__message {
  margin: 1rem 0 0;
  color: #d2d2d2;
  line-height: 1.6;
}

.strategy-dialog__footer {
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.1rem;
}

.strategy-dialog__button {
  min-width: 5.5rem;
  min-height: 2.4rem;
  padding: 0 1rem;
  border-radius: 0.45rem;
  font-weight: 600;
}

.strategy-dialog__button--ghost {
  border: 1px solid rgb(72 72 71 / 0.22);
  color: #d2d2d2;
  background: #202020;
}

.strategy-dialog__button--danger {
  border: 1px solid rgb(255 113 108 / 0.18);
  color: #fff;
  background: #c2413d;
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
  .strategies-header {
    flex-direction: column;
    align-items: stretch;
  }

  .strategies-toolbar {
    flex-wrap: wrap;
  }

  .strategies-toolbar__search {
    width: 100%;
  }

  .strategies-grid {
    grid-template-columns: 1fr;
  }

  .strategy-card--featured {
    grid-column: span 1;
  }

  .strategies-list__item {
    flex-direction: column;
    align-items: stretch;
  }

  .strategies-list__meta {
    grid-template-columns: 1fr 1fr;
  }
}
</style>
