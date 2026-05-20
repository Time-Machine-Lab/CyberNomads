<script setup lang="ts">
import {
  ArrowLeft,
  CheckCircle2,
  ClipboardCheck,
  GitBranch,
  MessageSquareText,
  Play,
  RotateCcw,
  ShieldCheck,
  Sparkles,
} from 'lucide-vue-next'
import { computed, ref } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  taskDecompositionDemoSnapshots,
  type DemoDraftTask,
} from '@/shared/mocks/task-decomposition-center-demo'

const route = useRoute()
const router = useRouter()
const initialStage = typeof route.query.stage === 'string' ? route.query.stage : ''
const initialIndex = taskDecompositionDemoSnapshots.findIndex((item) => item.stage === initialStage)
const currentIndex = ref(initialIndex >= 0 ? initialIndex : 0)
const selectedTaskKey = ref('')
const feedbackText = ref('评论互动任务需要更克制一些，不要太像营销话术。')

const snapshot = computed(() => taskDecompositionDemoSnapshots[currentIndex.value])
const visibleTasks = computed(() => snapshot.value.tasks)
const selectedTask = computed(
  () =>
    visibleTasks.value.find((task) => task.taskKey === selectedTaskKey.value) ??
    visibleTasks.value[0] ??
    null,
)
const progressStyle = computed(() => ({ width: `${snapshot.value.run.progress.percent}%` }))
const canGoNext = computed(() => currentIndex.value < taskDecompositionDemoSnapshots.length - 1)
const canGoBack = computed(() => currentIndex.value > 0)
const draftEdges = computed(() =>
  visibleTasks.value.flatMap((task) =>
    task.dependsOn
      .filter((dependencyKey) =>
        visibleTasks.value.some((candidate) => candidate.taskKey === dependencyKey),
      )
      .map((dependencyKey) => ({
        from: dependencyKey,
        to: task.taskKey,
      })),
  ),
)
const centerStatusLabel = computed(() => {
  if (snapshot.value.stage === 'created') return '创建后进入拆分中心'
  if (snapshot.value.stage === 'waiting') return 'Agent 正在生成与审查'
  if (snapshot.value.stage === 'draft') return '草案通过门禁'
  return '确认后进入执行准备'
})

function goToStep(index: number) {
  currentIndex.value = index
  selectedTaskKey.value = ''
  void router.replace({
    query: {
      ...route.query,
      stage: taskDecompositionDemoSnapshots[index].stage,
    },
  })
}

function nextStep() {
  if (!canGoNext.value) return
  goToStep(currentIndex.value + 1)
}

function previousStep() {
  if (!canGoBack.value) return
  goToStep(currentIndex.value - 1)
}

function resetDemo() {
  goToStep(0)
}

function selectTask(task: DemoDraftTask) {
  selectedTaskKey.value = task.taskKey
}

function buildEdgePath(fromKey: string, toKey: string) {
  const from = visibleTasks.value.find((task) => task.taskKey === fromKey)
  const to = visibleTasks.value.find((task) => task.taskKey === toKey)

  if (!from || !to) return ''

  const startX = from.x + 276
  const startY = from.y + 88
  const endX = to.x
  const endY = to.y + 88

  return `M ${startX} ${startY} C ${startX + 88} ${startY}, ${endX - 88} ${endY}, ${endX} ${endY}`
}
</script>

<template>
  <section class="demo-shell">
    <header class="demo-topbar">
      <div class="demo-topbar__left">
        <RouterLink to="/workspaces" class="demo-icon-link" title="返回工作区列表">
          <ArrowLeft :size="18" />
        </RouterLink>
        <div>
          <span>可删除 Demo</span>
          <strong>Cybernomads Agent 任务拆分中心</strong>
        </div>
      </div>

      <div class="demo-topbar__right">
        <button type="button" :disabled="!canGoBack" title="上一步" @click="previousStep">
          <ArrowLeft :size="17" />
        </button>
        <button type="button" title="重置 Demo" @click="resetDemo">
          <RotateCcw :size="17" />
        </button>
        <button type="button" :disabled="!canGoNext" title="推进到下一阶段" @click="nextStep">
          <Play :size="17" />
        </button>
      </div>
    </header>

    <main class="demo-main">
      <section class="demo-hero">
        <div class="demo-hero__copy">
          <span>{{ centerStatusLabel }}</span>
          <h1>{{ snapshot.trafficWork.name }}</h1>
          <p>
            引流工作状态保持原业务语义，拆分过程只通过独立进度字段展示。用户先看草案和
            Review，再决定确认落库或反馈重拆。
          </p>
        </div>

        <div class="demo-work-status">
          <div>
            <span>生命周期状态</span>
            <strong>{{ snapshot.trafficWork.lifecycleLabel }}</strong>
            <small>{{ snapshot.trafficWork.lifecycleStatus }}</small>
          </div>
          <div>
            <span>上下文准备</span>
            <strong>{{ snapshot.trafficWork.contextPreparationLabel }}</strong>
            <small>{{ snapshot.trafficWork.contextPreparationStatus }}</small>
          </div>
          <div>
            <span>拆分进度</span>
            <strong>{{ snapshot.run.progress.percent }}%</strong>
            <small>{{ snapshot.run.progress.label }}</small>
          </div>
        </div>
      </section>

      <section class="demo-progress-band">
        <div class="demo-progress-band__header">
          <div>
            <Sparkles :size="18" />
            <strong>{{ snapshot.run.progress.label }}</strong>
          </div>
          <span>{{ snapshot.run.progress.updatedAt }}</span>
        </div>
        <p>{{ snapshot.run.progress.description }}</p>
        <div class="demo-progress-track">
          <span :style="progressStyle" />
        </div>
        <div class="demo-steps">
          <button
            v-for="(item, index) in taskDecompositionDemoSnapshots"
            :key="item.stage"
            type="button"
            :class="{ 'demo-steps__item--active': currentIndex === index }"
            @click="goToStep(index)"
          >
            <span>{{ index + 1 }}</span>
            {{ item.stageLabel }}
          </button>
        </div>
      </section>

      <section class="demo-board">
        <div class="demo-board__canvas">
          <header class="demo-section-header">
            <div>
              <GitBranch :size="18" />
              <strong>任务草案图</strong>
            </div>
            <span>{{ visibleTasks.length ? `${visibleTasks.length} 个草案任务` : '等待 Agent 输出' }}</span>
          </header>

          <div class="demo-canvas">
            <div v-if="!visibleTasks.length" class="demo-empty-state">
              <ClipboardCheck :size="32" />
              <strong>还没有正式任务，也还没有草案节点</strong>
              <p>这里会先展示 Cybernomads Agent 的结构化草案，而不是直接读取正式任务表。</p>
            </div>

            <svg class="demo-wires" viewBox="0 0 1420 430" aria-hidden="true">
              <path
                v-for="edge in draftEdges"
                :key="`${edge.from}-${edge.to}`"
                :d="buildEdgePath(edge.from, edge.to)"
                fill="none"
                stroke="#4aa2f9"
                stroke-width="2"
                stroke-dasharray="8 8"
              />
            </svg>

            <button
              v-for="task in visibleTasks"
              :key="task.taskKey"
              type="button"
              class="demo-task-node"
              :class="{ 'demo-task-node--selected': selectedTask?.taskKey === task.taskKey }"
              :style="{ left: `${task.x}px`, top: `${task.y}px` }"
              @click="selectTask(task)"
            >
              <span>{{ task.taskKey }}</span>
              <strong>{{ task.name }}</strong>
              <small>{{ task.goal }}</small>
              <em>{{ task.expectedOutputs.length }} 个产出</em>
            </button>
          </div>
        </div>

        <aside class="demo-inspector">
          <section class="demo-panel">
            <header class="demo-section-header">
              <div>
                <ShieldCheck :size="18" />
                <strong>Agent Review</strong>
              </div>
              <span>{{ snapshot.run.reviewConclusion }}</span>
            </header>

            <div class="demo-review-list">
              <article
                v-for="issue in snapshot.reviewIssues"
                :key="`${issue.category}-${issue.message}`"
                class="demo-review-item"
                :class="`demo-review-item--${issue.severity}`"
              >
                <span>{{ issue.category }}</span>
                <strong>{{ issue.message }}</strong>
                <p>{{ issue.suggestion }}</p>
              </article>
              <p v-if="!snapshot.reviewIssues.length" class="demo-muted">
                Review 尚未开始，当前没有质量门禁结论。
              </p>
            </div>
          </section>

          <section class="demo-panel">
            <header class="demo-section-header">
              <div>
                <ClipboardCheck :size="18" />
                <strong>拆分报告</strong>
              </div>
              <span>{{ snapshot.run.stage }}</span>
            </header>
            <p class="demo-report-summary">{{ snapshot.report.summary }}</p>
            <div class="demo-pill-list">
              <span v-for="coverage in snapshot.report.strategyCoverage" :key="coverage">
                {{ coverage }}
              </span>
              <span v-if="!snapshot.report.strategyCoverage.length">等待策略覆盖结果</span>
            </div>
          </section>
        </aside>
      </section>

      <section class="demo-bottom">
        <article class="demo-panel demo-task-detail">
          <header class="demo-section-header">
            <div>
              <ClipboardCheck :size="18" />
              <strong>选中任务详情</strong>
            </div>
            <span>{{ selectedTask?.taskKey ?? 'none' }}</span>
          </header>

          <template v-if="selectedTask">
            <h2>{{ selectedTask.name }}</h2>
            <p>{{ selectedTask.goal }}</p>
            <div class="demo-detail-grid">
              <div>
                <span>输入来源</span>
                <ul>
                  <li v-for="source in selectedTask.inputSources" :key="source.label">
                    {{ source.type }} / {{ source.label }} / {{ source.missingBehavior }}
                  </li>
                </ul>
              </div>
              <div>
                <span>资源与 Skills</span>
                <ul>
                  <li v-for="resource in selectedTask.resourceNeeds" :key="resource">
                    {{ resource }}
                  </li>
                  <li v-for="skill in selectedTask.skillRefs" :key="skill">{{ skill }}</li>
                </ul>
              </div>
            </div>
          </template>
          <p v-else class="demo-muted">草案出现后，点击任务节点可以查看输入、输出、资源和 Skill。</p>
        </article>

        <article class="demo-panel demo-actions">
          <header class="demo-section-header">
            <div>
              <MessageSquareText :size="18" />
              <strong>用户动作</strong>
            </div>
            <span>{{ snapshot.primaryAction }}</span>
          </header>

          <textarea v-model="feedbackText" :disabled="snapshot.stage === 'confirmation'" />
          <div class="demo-action-row">
            <button type="button" class="demo-secondary-button" :disabled="snapshot.stage === 'confirmation'">
              反馈后重拆
            </button>
            <button
              type="button"
              class="demo-primary-button"
              :disabled="!canGoNext"
              @click="nextStep"
            >
              <CheckCircle2 :size="18" />
              {{ snapshot.primaryAction }}
            </button>
          </div>
          <p>
            Demo 中按钮只推进本地 mock 状态。真实实现中，确认会调用系统编排提交正式任务集；
            反馈会带着草案、Review 和用户意见启动下一轮拆分。
          </p>
        </article>
      </section>
    </main>
  </section>
</template>

<style scoped lang="scss">
.demo-shell {
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    linear-gradient(to right, rgb(72 72 71 / 0.08) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(72 72 71 / 0.08) 1px, transparent 1px),
    #0e0e0e;
  background-size: var(--cn-grid-size) var(--cn-grid-size);
}

.demo-topbar {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  gap: var(--cn-space-4);
  align-items: center;
  height: 4rem;
  padding: 0 var(--cn-space-5);
  border-bottom: 1px solid var(--cn-outline-ghost);
  background: rgb(14 14 14 / 0.84);
  backdrop-filter: blur(18px);
}

.demo-topbar__left,
.demo-topbar__right,
.demo-section-header > div,
.demo-action-row,
.demo-progress-band__header,
.demo-steps {
  display: flex;
  align-items: center;
}

.demo-topbar__left {
  gap: var(--cn-space-3);

  span {
    display: block;
    color: var(--cn-primary);
    font-size: 0.72rem;
  }

  strong {
    display: block;
    margin-top: 0.12rem;
    font-family: var(--cn-font-display);
    font-size: 1rem;
  }
}

.demo-topbar__right {
  gap: var(--cn-space-2);

  button {
    display: inline-flex;
    align-items: center;
    justify-content: center;
    width: 2.25rem;
    height: 2.25rem;
    border: 1px solid var(--cn-outline-soft);
    border-radius: var(--cn-radius-md);
    color: var(--cn-on-surface-muted);
    background: var(--cn-surface-container);
  }
}

.demo-topbar__right button:disabled,
.demo-primary-button:disabled,
.demo-secondary-button:disabled {
  opacity: 0.45;
  cursor: not-allowed;
}

.demo-icon-link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border-radius: var(--cn-radius-md);
  color: var(--cn-on-surface-muted);
  background: var(--cn-surface-container);
}

.demo-main {
  display: grid;
  gap: var(--cn-space-4);
  width: min(94rem, calc(100% - 2rem));
  margin: 0 auto;
  padding: var(--cn-space-4) 0 var(--cn-space-6);
}

.demo-hero,
.demo-progress-band,
.demo-board__canvas,
.demo-panel {
  border: 1px solid var(--cn-outline-ghost);
  border-radius: var(--cn-radius-lg);
  background: rgb(14 14 14 / 0.84);
  box-shadow: var(--cn-shadow-soft);
  backdrop-filter: blur(16px);
}

.demo-hero {
  display: grid;
  grid-template-columns: minmax(0, 1fr) minmax(28rem, 0.65fr);
  gap: var(--cn-space-4);
  padding: var(--cn-space-4);
}

.demo-hero__copy {
  span {
    color: var(--cn-primary);
    font-size: 0.78rem;
  }

  h1 {
    margin: 0.35rem 0 0;
    font-family: var(--cn-font-display);
    font-size: 2rem;
    letter-spacing: 0;
  }

  p {
    max-width: 52rem;
    margin: 0.55rem 0 0;
    color: var(--cn-on-surface-muted);
    line-height: 1.65;
  }
}

.demo-work-status {
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: var(--cn-space-3);

  div {
    padding: var(--cn-space-3);
    border: 1px solid var(--cn-outline-ghost);
    border-radius: var(--cn-radius-md);
    background: var(--cn-surface-container-low);
  }

  span,
  small {
    display: block;
    color: var(--cn-on-surface-faint);
    font-size: 0.74rem;
  }

  strong {
    display: block;
    margin: 0.35rem 0;
    color: var(--cn-on-surface);
    font-size: 1.15rem;
  }
}

.demo-progress-band {
  padding: var(--cn-space-4);

  p {
    margin: 0.5rem 0 0;
    color: var(--cn-on-surface-muted);
  }
}

.demo-progress-band__header {
  justify-content: space-between;

  div {
    display: inline-flex;
    gap: var(--cn-space-2);
    align-items: center;
    color: var(--cn-primary);
  }

  span {
    color: var(--cn-on-surface-faint);
    font-family: var(--cn-font-mono);
    font-size: 0.78rem;
  }
}

.demo-progress-track {
  height: 0.5rem;
  margin-top: var(--cn-space-3);
  overflow: hidden;
  border-radius: var(--cn-radius-pill);
  background: var(--cn-surface-container-high);

  span {
    display: block;
    height: 100%;
    border-radius: inherit;
    background: linear-gradient(90deg, var(--cn-primary), var(--cn-secondary));
    transition: width var(--cn-transition);
  }
}

.demo-steps {
  flex-wrap: wrap;
  gap: var(--cn-space-2);
  margin-top: var(--cn-space-3);

  button {
    display: inline-flex;
    gap: var(--cn-space-2);
    align-items: center;
    min-height: 2.25rem;
    padding: 0 var(--cn-space-3);
    border: 1px solid var(--cn-outline-ghost);
    border-radius: var(--cn-radius-md);
    color: var(--cn-on-surface-muted);
    background: var(--cn-surface-container-low);
  }

  span {
    display: inline-grid;
    place-items: center;
    width: 1.2rem;
    height: 1.2rem;
    border-radius: var(--cn-radius-sm);
    color: #071012;
    background: var(--cn-on-surface-faint);
    font-size: 0.72rem;
    font-weight: 700;
  }
}

.demo-steps__item--active {
  color: var(--cn-on-surface) !important;
  border-color: var(--cn-outline-strong) !important;

  span {
    background: var(--cn-primary);
  }
}

.demo-board {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 25rem;
  gap: var(--cn-space-4);
}

.demo-board__canvas,
.demo-panel {
  overflow: hidden;
}

.demo-section-header {
  display: flex;
  justify-content: space-between;
  gap: var(--cn-space-3);
  align-items: center;
  min-height: 3.25rem;
  padding: 0 var(--cn-space-4);
  border-bottom: 1px solid var(--cn-outline-ghost);

  > div {
    gap: var(--cn-space-2);
    color: var(--cn-primary);
  }

  span {
    color: var(--cn-on-surface-faint);
    font-size: 0.78rem;
  }
}

.demo-canvas {
  position: relative;
  min-height: 31rem;
  overflow: auto;
  background:
    radial-gradient(circle at 24rem 7rem, rgb(143 245 255 / 0.08), transparent 20rem),
    var(--cn-surface);
}

.demo-empty-state {
  position: absolute;
  inset: 0;
  display: grid;
  place-content: center;
  justify-items: center;
  padding: var(--cn-space-6);
  color: var(--cn-on-surface-muted);
  text-align: center;

  strong {
    margin-top: var(--cn-space-3);
    color: var(--cn-on-surface);
  }

  p {
    max-width: 28rem;
    margin: var(--cn-space-2) 0 0;
    line-height: 1.6;
  }
}

.demo-wires {
  position: absolute;
  inset: 0;
  width: 1420px;
  height: 430px;
  pointer-events: none;
}

.demo-task-node {
  position: absolute;
  width: 17.25rem;
  height: 11rem;
  padding: var(--cn-space-3);
  border: 1px solid var(--cn-outline-soft);
  border-radius: var(--cn-radius-lg);
  color: var(--cn-on-surface);
  text-align: left;
  background: var(--cn-surface-container-highest);
  box-shadow: var(--cn-shadow-ambient);
  transition:
    border-color var(--cn-transition),
    transform var(--cn-transition),
    box-shadow var(--cn-transition);

  span,
  small,
  em {
    display: block;
  }

  span {
    color: var(--cn-primary);
    font-family: var(--cn-font-mono);
    font-size: 0.68rem;
  }

  strong {
    display: block;
    margin-top: var(--cn-space-2);
    font-size: 1rem;
  }

  small {
    height: 3.2rem;
    margin-top: var(--cn-space-2);
    overflow: hidden;
    color: var(--cn-on-surface-muted);
    line-height: 1.55;
  }

  em {
    margin-top: var(--cn-space-3);
    color: var(--cn-secondary);
    font-style: normal;
    font-size: 0.78rem;
  }
}

.demo-task-node:hover,
.demo-task-node--selected {
  border-color: var(--cn-primary);
  transform: translateY(-2px);
  box-shadow: var(--cn-shadow-glow), var(--cn-shadow-ambient);
}

.demo-inspector {
  display: grid;
  gap: var(--cn-space-4);
  align-content: start;
}

.demo-review-list {
  display: grid;
  gap: var(--cn-space-3);
  padding: var(--cn-space-3);
}

.demo-review-item {
  padding: var(--cn-space-3);
  border: 1px solid var(--cn-outline-ghost);
  border-radius: var(--cn-radius-md);
  background: var(--cn-surface-container-low);

  span {
    color: var(--cn-primary);
    font-size: 0.74rem;
  }

  strong {
    display: block;
    margin-top: var(--cn-space-2);
    line-height: 1.45;
  }

  p {
    margin: var(--cn-space-2) 0 0;
    color: var(--cn-on-surface-muted);
    line-height: 1.55;
  }
}

.demo-review-item--warning {
  border-color: rgb(255 184 0 / 0.45);
}

.demo-review-item--error {
  border-color: rgb(255 113 108 / 0.45);
}

.demo-muted,
.demo-report-summary,
.demo-actions p,
.demo-task-detail p {
  margin: 0;
  color: var(--cn-on-surface-muted);
  line-height: 1.6;
}

.demo-report-summary {
  padding: var(--cn-space-3) var(--cn-space-3) 0;
}

.demo-pill-list {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cn-space-2);
  padding: var(--cn-space-3);

  span {
    padding: 0.45rem 0.6rem;
    border: 1px solid var(--cn-outline-ghost);
    border-radius: var(--cn-radius-md);
    color: var(--cn-on-surface-muted);
    background: var(--cn-surface-container-low);
    font-size: 0.78rem;
  }
}

.demo-bottom {
  display: grid;
  grid-template-columns: minmax(0, 1fr) 27rem;
  gap: var(--cn-space-4);
}

.demo-task-detail {
  h2 {
    margin: var(--cn-space-3) var(--cn-space-3) var(--cn-space-2);
    font-size: 1.2rem;
  }

  > p {
    padding: 0 var(--cn-space-3);
  }
}

.demo-detail-grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cn-space-3);
  padding: var(--cn-space-3);

  div {
    padding: var(--cn-space-3);
    border: 1px solid var(--cn-outline-ghost);
    border-radius: var(--cn-radius-md);
    background: var(--cn-surface-container-low);
  }

  span {
    display: block;
    margin-bottom: var(--cn-space-2);
    color: var(--cn-primary);
    font-size: 0.78rem;
  }

  ul {
    display: grid;
    gap: var(--cn-space-2);
    padding-left: 1rem;
    margin: 0;
    color: var(--cn-on-surface-muted);
    line-height: 1.5;
  }
}

.demo-actions {
  textarea {
    display: block;
    width: calc(100% - 1.5rem);
    min-height: 7.5rem;
    margin: var(--cn-space-3);
    padding: var(--cn-space-3);
    resize: vertical;
    border: 1px solid var(--cn-outline-soft);
    border-radius: var(--cn-radius-md);
    color: var(--cn-on-surface);
    background: var(--cn-surface-container-low);
    line-height: 1.55;
  }

  p {
    padding: 0 var(--cn-space-3) var(--cn-space-3);
    font-size: 0.84rem;
  }
}

.demo-action-row {
  gap: var(--cn-space-2);
  justify-content: flex-end;
  padding: 0 var(--cn-space-3) var(--cn-space-3);
}

.demo-primary-button,
.demo-secondary-button {
  display: inline-flex;
  gap: var(--cn-space-2);
  align-items: center;
  justify-content: center;
  min-height: 2.5rem;
  padding: 0 var(--cn-space-3);
  border-radius: var(--cn-radius-md);
}

.demo-primary-button {
  border: 0;
  color: #061314;
  background: var(--cn-primary);
  font-weight: 700;
}

.demo-secondary-button {
  border: 1px solid var(--cn-outline-soft);
  color: var(--cn-on-surface-muted);
  background: var(--cn-surface-container);
}

button,
a,
textarea {
  font: inherit;
}

button,
a {
  cursor: pointer;
}

@media (max-width: 1180px) {
  .demo-hero,
  .demo-board,
  .demo-bottom {
    grid-template-columns: 1fr;
  }

  .demo-work-status {
    grid-template-columns: repeat(3, minmax(0, 1fr));
  }
}

@media (max-width: 760px) {
  .demo-topbar {
    padding: 0 var(--cn-space-3);
  }

  .demo-topbar__left strong {
    font-size: 0.88rem;
  }

  .demo-work-status,
  .demo-detail-grid {
    grid-template-columns: 1fr;
  }
}
</style>
