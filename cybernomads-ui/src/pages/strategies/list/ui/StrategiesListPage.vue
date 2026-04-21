<script setup lang="ts">
import { computed, ref, watch } from 'vue'

import { listStrategies } from '@/entities/strategy/api/strategy-service'
import type { StrategyRecord } from '@/entities/strategy/model/types'
import { referenceAgentDashboardAvatarUrl } from '@/shared/config/reference-ui'
import { mockScenarioId } from '@/shared/mocks/runtime'

interface StrategyDisplayCard extends StrategyRecord {
  icon: string
  accent: 'primary' | 'tertiary' | 'error' | 'secondary'
  displayName: string
  displaySummary: string
  displayTag: string
  displayRate: number
  displayPlatform: string
  displayLevel: string
  rateTone?: 'primary' | 'secondary' | 'tertiary' | 'error'
  levelTone: 'secondary' | 'tertiary' | 'error'
}

const strategies = ref<StrategyRecord[]>([])

const strategyDisplayMap = {
  'strategy-high-frequency-comments': {
    icon: 'radar',
    accent: 'primary',
    displayName: '大范围扫射策略',
    displaySummary: '针对漏斗顶部品牌认知设计的大规模数据收集方法。同时跨多个节点部署非定向互动探测。',
    displayTag: '热门',
    displayRate: 85,
    displayPlatform: 'Bilibili',
    displayLevel: '低',
    rateTone: 'primary',
    levelTone: 'secondary',
  },
  'strategy-deep-dm': {
    icon: 'forum',
    accent: 'tertiary',
    displayName: '私信转化策略',
    displaySummary: '利用个性化私信从特定竞品集群中提取高意向线索的精准定向协议。',
    displayTag: '线索',
    displayRate: 62,
    displayPlatform: 'QQ',
    displayLevel: '高',
    rateTone: 'secondary',
    levelTone: 'error',
  },
  'strategy-natural-growth': {
    icon: 'group_work',
    accent: 'primary',
    displayName: '垂直社区互动',
    displaySummary: '在部署软推销提示之前，旨在特定技术子论坛内建立权威的隐蔽渗透策略。',
    displayTag: '社区',
    displayRate: 91,
    displayPlatform: '知乎',
    displayLevel: '中',
    rateTone: 'primary',
    levelTone: 'tertiary',
  },
  'strategy-flash-t1': {
    icon: 'bolt',
    accent: 'error',
    displayName: '趋势植入',
    displaySummary: '高风险，高回报。借助快速加速的微趋势，将核心信息注入主流算法信息流。',
    displayTag: '病毒传播',
    displayRate: 45,
    displayPlatform: '抖音',
    displayLevel: '专家',
    levelTone: 'error',
  },
  'strategy-precision-private-message': {
    icon: 'route',
    accent: 'tertiary',
    displayName: '算法劫持',
    displaySummary: '操纵 SEO 元数据和用户交互序列，在孤立的平台生态系统内人为提升帖子可见度。',
    displayTag: '曝光',
    displayRate: 78,
    displayPlatform: '小红书',
    displayLevel: '中',
    rateTone: 'primary',
    levelTone: 'tertiary',
  },
} as const

watch(
  mockScenarioId,
  async () => {
    strategies.value = await listStrategies()
  },
  { immediate: true },
)

const strategyCards = computed(() => {
  const cards: StrategyDisplayCard[] = []

  for (const id of Object.keys(strategyDisplayMap) as Array<keyof typeof strategyDisplayMap>) {
    const strategy = strategies.value.find((item) => item.id === id)
    const display = strategyDisplayMap[id]

    if (!strategy) {
      continue
    }

    cards.push({
      ...strategy,
      ...display,
    })
  }

  return cards
})

const featured = computed(() => strategyCards.value[0] ?? null)
const secondaryStrategies = computed(() => strategyCards.value.slice(1))
</script>

<template>
  <section class="strategies-page">
    <header class="strategies-topbar">
      <label class="strategies-topbar__search">
        <span class="material-symbols-outlined">search</span>
        <input type="text" placeholder="搜索参数..." />
      </label>

      <div class="strategies-topbar__brand">CYBERNOMADS</div>

      <div class="strategies-topbar__actions">
        <button type="button"><span class="material-symbols-outlined">notifications</span></button>
        <button type="button"><span class="material-symbols-outlined">grid_view</span></button>
        <button type="button"><span class="material-symbols-outlined">history</span></button>
        <img :src="referenceAgentDashboardAvatarUrl" alt="Operator avatar" />
      </div>
    </header>

    <div class="strategies-canvas">
      <header class="strategies-header">
        <div>
          <h1>策略库</h1>
          <p>部署预配置的神经流量矢量。选择一个架构来启动针对目标网络的自动化受众获取。</p>
        </div>

        <div class="strategies-header__actions">
          <div class="strategies-header__meta">
            <span>活动矢量:</span>
            <strong>12</strong>
          </div>

          <RouterLink class="strategies-header__button" to="/strategies/new">
            <span class="material-symbols-outlined">add</span>
            <span>新建策略</span>
          </RouterLink>
        </div>
      </header>

      <div class="strategies-toolbar">
        <div class="strategies-toolbar__label">
          <span class="material-symbols-outlined">filter_list</span>
          <span>筛选</span>
        </div>

        <button type="button" class="strategies-toolbar__filter">
          <span>平台</span>
          <strong>全部</strong>
          <span class="material-symbols-outlined">arrow_drop_down</span>
        </button>

        <button type="button" class="strategies-toolbar__filter">
          <span>目标</span>
          <strong>线索</strong>
          <span class="material-symbols-outlined">arrow_drop_down</span>
        </button>

        <div class="strategies-toolbar__view">
          <button type="button" class="strategies-toolbar__view-button strategies-toolbar__view-button--active">
            <span class="material-symbols-outlined">grid_view</span>
          </button>
          <button type="button" class="strategies-toolbar__view-button">
            <span class="material-symbols-outlined">view_list</span>
          </button>
        </div>
      </div>

      <section v-if="featured" class="strategies-grid">
        <article class="strategy-card strategy-card--featured">
          <div class="strategy-card__feature-glow" />

          <div class="strategy-card__top">
            <div class="strategy-card__title-wrap">
              <div class="strategy-card__icon strategy-card__icon--primary">
                <span class="material-symbols-outlined">{{ featured.icon }}</span>
              </div>
              <h2>{{ featured.displayName }}</h2>
            </div>

            <div class="strategy-card__top-actions">
              <RouterLink :to="`/strategies/${featured.id}/edit`" class="strategy-card__icon-button">
                <span class="material-symbols-outlined">edit</span>
              </RouterLink>
              <span class="strategy-card__badge strategy-card__badge--featured">{{ featured.displayTag }}</span>
            </div>
          </div>

          <p class="strategy-card__summary">{{ featured.displaySummary }}</p>

          <div class="strategy-card__stats strategy-card__stats--featured">
            <div>
              <small>成功率</small>
              <strong class="strategy-card__value strategy-card__value--primary">{{ featured.displayRate }}%</strong>
            </div>
            <div>
              <small>平台</small>
              <strong class="strategy-card__value">{{ featured.displayPlatform }}</strong>
            </div>
            <div>
              <small>难度</small>
              <strong class="strategy-card__value strategy-card__value--secondary">{{ featured.displayLevel }}</strong>
            </div>
          </div>

          <RouterLink :to="`/strategies/${featured.id}/edit`" class="strategy-card__button strategy-card__button--featured">
            <span class="material-symbols-outlined">edit_note</span>
            <span>编辑策略</span>
          </RouterLink>
        </article>

        <article
          v-for="strategy in secondaryStrategies"
          :key="strategy.id"
          class="strategy-card"
        >
          <div class="strategy-card__top">
            <div class="strategy-card__icon" :class="`strategy-card__icon--${strategy.accent}`">
              <span class="material-symbols-outlined">{{ strategy.icon }}</span>
            </div>

            <div class="strategy-card__top-actions">
              <RouterLink :to="`/strategies/${strategy.id}/edit`" class="strategy-card__icon-button">
                <span class="material-symbols-outlined">edit</span>
              </RouterLink>
              <span class="strategy-card__badge">{{ strategy.displayTag }}</span>
            </div>
          </div>

          <h2>{{ strategy.displayName }}</h2>
          <p class="strategy-card__summary">{{ strategy.displaySummary }}</p>

          <div class="strategy-card__stats">
            <div>
              <small>成功率</small>
              <strong class="strategy-card__value" :class="strategy.rateTone ? `strategy-card__value--${strategy.rateTone}` : undefined">
                {{ strategy.displayRate }}%
              </strong>
            </div>
            <div>
              <small>目标平台</small>
              <strong class="strategy-card__value">{{ strategy.displayPlatform }}</strong>
            </div>
            <div>
              <small>等级</small>
              <strong class="strategy-card__value" :class="`strategy-card__value--${strategy.levelTone}`">
                {{ strategy.displayLevel }}
              </strong>
            </div>
          </div>

          <RouterLink :to="`/strategies/${strategy.id}/edit`" class="strategy-card__button">
            <span class="material-symbols-outlined">edit_note</span>
            <span>编辑策略</span>
          </RouterLink>
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
  padding: 2rem 2rem 4rem;
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
  gap: 0.55rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1.15rem;
  border-radius: 0.7rem;
  color: #005d63;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  font-weight: 700;
  box-shadow: 0 0 16px rgb(143 245 255 / 0.18);
}

.strategies-toolbar {
  gap: 0.85rem;
  padding: 0.8rem 1rem;
  margin-bottom: 1.25rem;
  border: 1px solid rgb(72 72 71 / 0.15);
  border-radius: 0.9rem;
  background: #131313;
}

.strategies-toolbar__label {
  gap: 0.45rem;
  color: #767575;
  font-size: 0.8rem;
}

.strategies-toolbar__filter {
  gap: 0.35rem;
  min-height: 2.5rem;
  padding: 0 0.95rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.6rem;
  color: #fff;
  background: #1a1919;
  font-size: 0.82rem;
}

.strategies-toolbar__filter strong {
  color: #8ff5ff;
  font-weight: 600;
}

.strategies-toolbar__view {
  gap: 0.25rem;
  margin-left: auto;
  padding: 0.2rem;
  border-radius: 0.65rem;
  background: #1a1919;
}

.strategies-toolbar__view-button {
  display: grid;
  place-items: center;
  width: 2.2rem;
  height: 2.2rem;
  border-radius: 0.5rem;
  color: #adaaaa;
}

.strategies-toolbar__view-button--active {
  color: #8ff5ff;
  background: #262626;
}

.strategies-grid {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1rem;
}

.strategy-card {
  position: relative;
  display: flex;
  flex-direction: column;
  min-height: 18rem;
  padding: 1.45rem;
  border: 1px solid rgb(72 72 71 / 0.14);
  border-radius: 1rem;
  background: #1a1919;
  transition:
    transform var(--cn-transition),
    border-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.strategy-card:hover {
  transform: translateY(-2px);
  border-color: rgb(143 245 255 / 0.3);
  box-shadow: 0 0 18px rgb(143 245 255 / 0.08);
}

.strategy-card--featured {
  grid-column: span 2;
  min-height: 17.5rem;
  overflow: hidden;
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
  width: 2.55rem;
  height: 2.55rem;
  flex-shrink: 0;
  border-radius: 0.6rem;
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

.strategy-card__icon-button {
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: #adaaaa;
  background: #262626;
}

.strategy-card__badge {
  display: inline-flex;
  align-items: center;
  min-height: 1.7rem;
  padding: 0 0.55rem;
  border-radius: 0.4rem;
  color: #adaaaa;
  background: #262626;
  font-size: 0.7rem;
}

.strategy-card__badge--featured {
  color: #c3f400;
  background: rgb(195 244 0 / 0.1);
}

.strategy-card__summary {
  flex: 1;
  margin: 1.15rem 0 1.5rem;
  color: #adaaaa;
  font-size: 0.89rem;
  line-height: 1.72;
}

.strategy-card__stats {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 0.45rem;
  margin-bottom: 0.95rem;
}

.strategy-card__stats--featured {
  max-width: 28rem;
}

.strategy-card__stats > div {
  padding: 0.68rem;
  border-radius: 0.55rem;
  background: #131313;
  text-align: center;
}

.strategy-card__stats small {
  display: block;
  margin-bottom: 0.24rem;
  color: #767575;
  font-size: 0.63rem;
  text-transform: uppercase;
}

.strategy-card__value {
  color: #fff;
  font-size: 0.9rem;
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

.strategy-card__button {
  justify-content: center;
  gap: 0.4rem;
  min-height: 2.55rem;
  border-radius: 0.6rem;
  color: #fff;
  background: #262626;
  font-size: 0.82rem;
  font-weight: 600;
}

.strategy-card__button--featured {
  width: fit-content;
  padding: 0 1rem;
  color: #8ff5ff;
  background: transparent;
  border: 1px solid rgb(143 245 255 / 0.28);
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
