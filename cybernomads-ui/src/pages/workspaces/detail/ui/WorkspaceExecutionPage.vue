<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getInterventionContext,
  type InterventionContext,
} from '@/entities/intervention-record/api/intervention-service'
import {
  archiveTrafficWork,
  endTrafficWork,
  getWorkspaceExecution,
  pauseTrafficWork,
  startTrafficWork,
  tickWorkspaceExecution,
} from '@/entities/workspace/api/workspace-service'
import type { TaskRunRecord } from '@/entities/task-run/model/types'
import type { WorkspaceExecutionView } from '@/entities/workspace/model/types'
import { env } from '@/shared/config/env'
import { usePolling } from '@/shared/hooks/usePolling'
import { formatTime } from '@/shared/lib/format'

const route = useRoute()

const execution = ref<WorkspaceExecutionView | null>(null)
const taskContext = ref<InterventionContext | null>(null)
const selectedTaskId = ref('')
const zoom = ref(1)
const isActing = ref(false)
const actionError = ref('')
const canvasViewport = ref<HTMLElement | null>(null)
const dragState = reactive({
  active: false,
  startX: 0,
  startY: 0,
  left: 0,
  top: 0,
})

const workspaceId = computed(() => String(route.params.workspaceId ?? ''))
const backTo = computed(() => '/workspaces')
const selectedTask = computed(() =>
  execution.value?.tasks.find((task) => task.id === selectedTaskId.value) ?? execution.value?.tasks[0] ?? null,
)
const workspaceRecord = computed(() => execution.value?.workspace ?? null)
const createdFromFlow = computed(() => route.query.created === '1')
const workspaceStatusText = computed(() => {
  if (!workspaceRecord.value) return ''

  return `${workspaceRecord.value.name} - ${workspaceRecord.value.statusLabel ?? workspaceRecord.value.status}`
})
const preparationHint = computed(() => {
  if (!workspaceRecord.value) return ''

  if (workspaceRecord.value.contextPreparationStatus === 'prepared') {
    return '上下文已准备完成，可以根据当前生命周期状态决定是否启动工作。'
  }

  if (workspaceRecord.value.contextPreparationStatus === 'failed') {
    return workspaceRecord.value.contextPreparationStatusReason ?? '上下文准备失败，请检查后端准备结果。'
  }

  return workspaceRecord.value.contextPreparationStatusReason ?? '上下文仍在准备中，当前不建议启动工作。'
})
const canStart = computed(
  () =>
    workspaceRecord.value?.lifecycleStatus === 'ready' &&
    workspaceRecord.value?.contextPreparationStatus === 'prepared' &&
    !isActing.value,
)
const canPause = computed(() => workspaceRecord.value?.lifecycleStatus === 'running' && !isActing.value)
const canEnd = computed(
  () =>
    (workspaceRecord.value?.lifecycleStatus === 'ready' || workspaceRecord.value?.lifecycleStatus === 'running') &&
    !isActing.value,
)
const canArchive = computed(
  () =>
    (workspaceRecord.value?.lifecycleStatus === 'ready' || workspaceRecord.value?.lifecycleStatus === 'ended') &&
    !isActing.value,
)
const taskEdges = computed(() => {
  if (!execution.value) return []

  return execution.value.tasks.flatMap((task) =>
    (task.condition?.relyOnTaskIds ?? []).map((dependencyId) => ({
      fromId: dependencyId,
      toId: task.id,
      isActive: task.status === 'running',
    })),
  )
})
const taskOutputRecords = computed(() => taskContext.value?.records ?? [])

async function loadView() {
  execution.value = await getWorkspaceExecution(workspaceId.value)
  actionError.value = ''

  if (!selectedTaskId.value && execution.value?.tasks.length) {
    selectedTaskId.value =
      execution.value.tasks.find((task) => task.status === 'running' || task.status === 'attention')?.id ??
      execution.value.tasks[0].id
  }

  if (selectedTaskId.value) {
    taskContext.value = await getInterventionContext(workspaceId.value, selectedTaskId.value)
  }
}

const polling = usePolling(
  async () => {
    execution.value = await tickWorkspaceExecution(workspaceId.value)
    if (selectedTaskId.value) {
      taskContext.value = await getInterventionContext(workspaceId.value, selectedTaskId.value)
    }
  },
  { intervalMs: env.pollingIntervalMs, immediate: false },
)

watch(
  workspaceId,
  async () => {
    await loadView()

    polling.stop()
    if (execution.value?.workspace.status === 'running') {
      await polling.start()
    }
  },
  { immediate: true },
)

watch(selectedTaskId, async (next) => {
  if (!next) return
  taskContext.value = await getInterventionContext(workspaceId.value, next)
})

function resolveTaskColor(task: TaskRunRecord) {
  if (task.status === 'running') return 'primary'
  if (task.status === 'completed') return 'secondary'
  if (task.status === 'attention') return 'error'
  return 'outline'
}

function startPan(event: PointerEvent) {
  if (!canvasViewport.value) return

  dragState.active = true
  dragState.startX = event.clientX
  dragState.startY = event.clientY
  dragState.left = canvasViewport.value.scrollLeft
  dragState.top = canvasViewport.value.scrollTop
}

function movePan(event: PointerEvent) {
  if (!dragState.active || !canvasViewport.value) return

  const dx = event.clientX - dragState.startX
  const dy = event.clientY - dragState.startY
  canvasViewport.value.scrollLeft = dragState.left - dx
  canvasViewport.value.scrollTop = dragState.top - dy
}

function stopPan() {
  dragState.active = false
}

function handleZoom(delta: number) {
  zoom.value = Math.max(0.75, Math.min(1.35, Number((zoom.value + delta).toFixed(2))))
}

function resetView() {
  zoom.value = 1
  if (canvasViewport.value) {
    canvasViewport.value.scrollTo({ left: 240, top: 90, behavior: 'smooth' })
  }
}

function buildPath(fromId: string, toId: string) {
  const from = execution.value?.tasks.find((task) => task.id === fromId)
  const to = execution.value?.tasks.find((task) => task.id === toId)
  if (!from || !to) return ''

  const startX = (from.x ?? 0) + 300
  const startY = (from.y ?? 0) + 104
  const endX = to.x ?? 0
  const endY = (to.y ?? 0) + 104

  return `M ${startX} ${startY} C ${startX + 90} ${startY}, ${endX - 90} ${endY}, ${endX} ${endY}`
}

async function runLifecycleAction(action: 'start' | 'pause' | 'end' | 'archive') {
  if (!workspaceRecord.value) {
    return
  }

  isActing.value = true
  actionError.value = ''

  try {
    switch (action) {
      case 'start':
        await startTrafficWork(workspaceRecord.value.id)
        break
      case 'pause':
        await pauseTrafficWork(workspaceRecord.value.id)
        break
      case 'end':
        await endTrafficWork(workspaceRecord.value.id)
        break
      case 'archive':
        await archiveTrafficWork(workspaceRecord.value.id)
        break
    }

    await loadView()
  } catch (error) {
    actionError.value = error instanceof Error ? error.message : '工作状态更新失败，请稍后重试。'
  } finally {
    isActing.value = false
  }
}
</script>

<template>
  <section v-if="execution" class="execution-shell">
    <header class="execution-topbar">
      <div class="execution-topbar__left">
        <RouterLink :to="backTo" class="execution-topbar__back" title="返回工作区列表">
          <span class="material-symbols-outlined">arrow_back</span>
        </RouterLink>
        <span class="execution-topbar__brand">CyberNomads</span>
      </div>

      <div class="execution-topbar__right">
        <span class="execution-topbar__context">{{ workspaceStatusText }}</span>

        <div class="execution-topbar__actions">
          <button type="button" title="启动工作" :disabled="!canStart" @click="runLifecycleAction('start')">
            <span class="material-symbols-outlined">play_arrow</span>
          </button>
          <button type="button" title="暂停工作" :disabled="!canPause" @click="runLifecycleAction('pause')">
            <span class="material-symbols-outlined">pause</span>
          </button>
          <button type="button" title="结束工作" :disabled="!canEnd" @click="runLifecycleAction('end')">
            <span class="material-symbols-outlined">stop</span>
          </button>
          <button type="button" title="归档工作" :disabled="!canArchive" @click="runLifecycleAction('archive')">
            <span class="material-symbols-outlined">inventory_2</span>
          </button>
          <button type="button" title="重置视图" @click="resetView">
            <span class="material-symbols-outlined">restart_alt</span>
          </button>
        </div>
      </div>
    </header>

    <div class="execution-body">
      <main class="execution-canvas-shell">
        <section class="execution-summary">
          <div class="execution-summary__intro">
            <span class="execution-summary__eyebrow">TrafficWork Runtime</span>
            <h1>{{ execution.workspace.name }}</h1>
            <p>{{ execution.workspace.summary }}</p>
          </div>

          <div class="execution-summary__metrics">
            <div class="execution-summary__metric">
              <span>生命周期</span>
              <strong>{{ execution.workspace.lifecycleStatus ?? execution.workspace.status }}</strong>
            </div>
            <div class="execution-summary__metric">
              <span>准备状态</span>
              <strong>{{ execution.workspace.contextPreparationStatus ?? 'unknown' }}</strong>
            </div>
            <div class="execution-summary__metric">
              <span>产品 / 策略</span>
              <strong>{{ execution.workspace.assetName }} / {{ execution.workspace.strategyName }}</strong>
            </div>
            <div class="execution-summary__metric">
              <span>任务数</span>
              <strong>{{ execution.tasks.length }}</strong>
            </div>
          </div>
        </section>

        <section
          v-if="createdFromFlow || execution.workspace.highlightBanner || execution.workspace.contextPreparationStatus !== 'prepared' || actionError"
          class="execution-alerts"
        >
          <div v-if="createdFromFlow" class="execution-alert execution-alert--info">
            <strong>工作区已创建</strong>
            <p>当前只是完成了工作区创建与上下文准备，不代表已经开始运行。请先确认准备状态，再决定是否启动。</p>
          </div>
          <div
            v-if="execution.workspace.contextPreparationStatus !== 'prepared' || execution.workspace.highlightBanner"
            class="execution-alert"
            :class="execution.workspace.contextPreparationStatus === 'failed' ? 'execution-alert--danger' : 'execution-alert--warning'"
          >
            <strong>准备状态提示</strong>
            <p>{{ preparationHint }}</p>
          </div>
          <div v-if="actionError" class="execution-alert execution-alert--danger">
            <strong>操作失败</strong>
            <p>{{ actionError }}</p>
          </div>
        </section>

        <div
          ref="canvasViewport"
          class="execution-canvas"
          @pointerdown="startPan"
          @pointermove="movePan"
          @pointerup="stopPan"
          @pointerleave="stopPan"
        >
          <svg class="execution-wires" viewBox="0 0 1500 980" preserveAspectRatio="none">
            <defs>
              <linearGradient id="active-flow" x1="0%" y1="0%" x2="100%" y2="0%">
                <stop offset="0%" stop-color="#8ff5ff" />
                <stop offset="100%" stop-color="#65afff" />
              </linearGradient>
              <filter id="glow">
                <feGaussianBlur result="coloredBlur" stdDeviation="3" />
                <feMerge>
                  <feMergeNode in="coloredBlur" />
                  <feMergeNode in="SourceGraphic" />
                </feMerge>
              </filter>
            </defs>

            <path
              v-for="edge in taskEdges"
              :key="`${edge.fromId}-${edge.toId}`"
              :class="{ 'execution-wires__active': edge.isActive }"
              :d="buildPath(edge.fromId, edge.toId)"
              fill="none"
              :stroke="edge.isActive ? 'url(#active-flow)' : '#484847'"
              stroke-width="2"
              filter="url(#glow)"
            />
          </svg>

          <div class="execution-floating">
            <section class="execution-panel">
              <header class="execution-panel__header">
                <div>
                  <span class="material-symbols-outlined">deployed_code</span>
                  <strong>工作状态概览</strong>
                </div>
                <span class="execution-panel__pulse" />
              </header>

              <div class="execution-inspector">
                <div class="execution-inspector__row">
                  <span>工作标识</span>
                  <strong>{{ execution.workspace.id }}</strong>
                </div>
                <div class="execution-inspector__row">
                  <span>状态标签</span>
                  <strong>{{ execution.workspace.statusLabel ?? execution.workspace.status }}</strong>
                </div>
                <div class="execution-inspector__row">
                  <span>上次启动</span>
                  <strong>{{ formatTime(execution.workspace.lastRunAt) }}</strong>
                </div>
                <div class="execution-inspector__row">
                  <span>准备完成</span>
                  <strong>{{ formatTime(execution.workspace.nextRunAt) }}</strong>
                </div>
                <div class="execution-inspector__row">
                  <span>状态说明</span>
                  <strong>{{ execution.workspace.lifecycleStatusReason ?? '无' }}</strong>
                </div>
                <p class="execution-inspector__note">{{ preparationHint }}</p>
              </div>
            </section>

            <section class="execution-panel">
              <header class="execution-panel__header">
                <div>
                  <span class="material-symbols-outlined">assignment</span>
                  <strong>当前任务详情</strong>
                </div>
              </header>

              <div v-if="selectedTask" class="execution-task-detail">
                <div class="execution-task-detail__row">
                  <span>任务</span>
                  <strong>{{ selectedTask.name }}</strong>
                </div>
                <div class="execution-task-detail__row">
                  <span>状态</span>
                  <strong>{{ selectedTask.statusLabel ?? selectedTask.status }}</strong>
                </div>
                <p class="execution-task-detail__instruction">{{ selectedTask.instruction ?? selectedTask.summary }}</p>

                <div class="execution-task-detail__section">
                  <small>输入需求</small>
                  <ul>
                    <li v-for="need in selectedTask.inputNeeds ?? []" :key="`${selectedTask.id}-${need.name}`">
                      {{ need.name }}: {{ need.description }}
                    </li>
                  </ul>
                  <p v-if="!(selectedTask.inputNeeds ?? []).length">当前任务没有声明额外输入需求。</p>
                </div>

                <div class="execution-task-detail__section">
                  <small>状态说明</small>
                  <p>{{ selectedTask.statusReason ?? '当前任务没有额外状态说明。' }}</p>
                </div>

                <div class="execution-task-detail__section">
                  <small>输出记录</small>
                  <ul>
                    <li v-for="record in taskOutputRecords" :key="record.id">
                      {{ record.command }} -> {{ record.response }}
                    </li>
                  </ul>
                  <p v-if="!taskOutputRecords.length">当前任务还没有 output records。</p>
                </div>

                <RouterLink :to="`/workspaces/${execution.workspace.id}/tasks/${selectedTask.id}/intervention`" class="task-node__link">
                  打开任务详情页
                </RouterLink>
              </div>
            </section>
          </div>

          <div class="execution-zoom">
            <button type="button" @click="handleZoom(0.1)">
              <span class="material-symbols-outlined">add</span>
            </button>
            <button type="button" @click="handleZoom(-0.1)">
              <span class="material-symbols-outlined">remove</span>
            </button>
            <button type="button" @click="resetView">
              <span class="material-symbols-outlined">fit_screen</span>
            </button>
          </div>

          <div class="execution-nodes" :style="{ transform: `scale(${zoom})` }">
            <article
              v-for="task in execution.tasks"
              :key="task.id"
              class="task-node"
              :class="[
                `task-node--${resolveTaskColor(task)}`,
                {
                  'task-node--selected': selectedTaskId === task.id,
                  'task-node--running': task.status === 'running',
                },
              ]"
              :style="{ left: `${task.x ?? 0}px`, top: `${task.y ?? 0}px` }"
              @click="selectedTaskId = task.id"
            >
              <div class="task-node__port task-node__port--left" />
              <div class="task-node__port task-node__port--right" />

              <div class="task-node__header">
                <div>
                  <h3>{{ task.name }}</h3>
                  <span class="task-node__state">{{ task.statusLabel ?? task.status }}</span>
                </div>
                <span class="task-node__code">{{ task.code }}</span>
              </div>

              <p>{{ task.summary }}</p>

              <div class="task-node__meta">
                <div>
                  <small>上次运行</small>
                  <strong>{{ formatTime(task.lastRunAt) }}</strong>
                </div>
                <div>
                  <small>下次调度</small>
                  <strong>{{ task.note ?? formatTime(task.nextRunAt) }}</strong>
                </div>
              </div>

              <div class="task-node__footer">
                <span>进度 {{ task.progress }}%</span>
                <RouterLink :to="`/workspaces/${execution.workspace.id}/tasks/${task.id}/intervention`" class="task-node__link">
                  任务详情
                </RouterLink>
              </div>

              <div class="task-node__progress">
                <span :style="{ width: `${task.progress}%` }" />
              </div>
            </article>
          </div>
        </div>
      </main>
    </div>
  </section>
</template>

<style scoped lang="scss">
.execution-shell {
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
  overflow: hidden;
}

.execution-summary,
.execution-alerts {
  width: min(100%, 1400px);
  margin: 1rem auto 0;
}

.execution-summary {
  display: grid;
  gap: 1.25rem;
  grid-template-columns: minmax(0, 1.7fr) minmax(0, 1fr);
  padding: 1.25rem 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 1rem;
  background: rgb(19 19 19 / 0.88);
}

.execution-summary__eyebrow {
  display: inline-block;
  margin-bottom: 0.75rem;
  color: #8ff5ff;
  font-size: 0.78rem;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.execution-summary__intro h1,
.execution-summary__intro p {
  margin: 0;
}

.execution-summary__intro h1 {
  font-family: var(--cn-font-display);
  font-size: clamp(1.5rem, 2vw, 2.2rem);
}

.execution-summary__intro p {
  margin-top: 0.55rem;
  color: #adaaaa;
  line-height: 1.65;
}

.execution-summary__metrics {
  display: grid;
  gap: 0.85rem;
  grid-template-columns: repeat(2, minmax(0, 1fr));
}

.execution-summary__metric,
.execution-alert {
  padding: 0.95rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.85rem;
  background: rgb(14 14 14 / 0.9);
}

.execution-summary__metric span,
.execution-task-detail__section small {
  display: block;
  margin-bottom: 0.4rem;
  color: #8b8a8a;
  font-size: 0.8rem;
}

.execution-summary__metric strong {
  color: #fff;
  line-height: 1.4;
}

.execution-alerts {
  display: grid;
  gap: 0.75rem;
}

.execution-alert strong,
.execution-alert p {
  margin: 0;
}

.execution-alert p {
  margin-top: 0.45rem;
  color: #d0cece;
  line-height: 1.6;
}

.execution-alert--info {
  border-color: rgb(143 245 255 / 0.3);
}

.execution-alert--warning {
  border-color: rgb(255 203 92 / 0.3);
}

.execution-alert--danger {
  border-color: rgb(255 113 108 / 0.35);
}

.execution-topbar {
  position: sticky;
  top: 0;
  z-index: 24;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  height: 4rem;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.18);
  background: rgb(14 14 14 / 0.82);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.45);
}

.execution-topbar__left,
.execution-topbar__right,
.execution-topbar__actions {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.execution-topbar__left {
  gap: 1.25rem;
}

.execution-topbar__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.25rem;
  height: 2.25rem;
  border: 0;
  border-radius: 999px;
  color: #767575;
  background: transparent;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.execution-topbar__back:hover {
  color: #8ff5ff;
  background: rgb(38 38 38 / 0.72);
}

.execution-topbar__brand {
  color: #00f0ff;
  font-family: var(--cn-font-display);
  font-weight: 700;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.execution-topbar__context {
  color: #adaaaa;
  padding-right: 1rem;
  border-right: 1px solid rgb(72 72 71 / 0.18);
  font-size: 0.88rem;
}

.execution-topbar__actions {
  gap: 0.2rem;
  padding: 0.25rem 0.45rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: rgb(32 31 31 / 0.72);
}

.execution-topbar__actions button,
.execution-zoom button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #adaaaa;
  background: transparent;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition),
    box-shadow var(--cn-transition);
}

.execution-topbar__actions button {
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
}

.execution-topbar__actions button:hover,
.execution-zoom button:hover {
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.08);
}

.execution-body {
  display: flex;
  min-height: calc(100vh - 4rem);
}

.execution-canvas-shell {
  flex: 1;
  min-width: 0;
}

.execution-canvas {
  position: relative;
  overflow: auto;
  min-height: 100%;
  background:
    linear-gradient(to right, rgb(72 72 71 / 0.1) 1px, transparent 1px),
    linear-gradient(to bottom, rgb(72 72 71 / 0.1) 1px, transparent 1px),
    #0e0e0e;
  background-size: 40px 40px;
  background-position: center center;
  cursor: grab;
}

.execution-canvas:active {
  cursor: grabbing;
}

.execution-wires {
  position: absolute;
  inset: 0;
  width: 100%;
  height: 100%;
  pointer-events: none;
}

.execution-wires__active {
  stroke-dasharray: 8;
  animation: dash 1s linear infinite;
}

.execution-floating {
  position: absolute;
  top: 2rem;
  right: 2rem;
  bottom: 2rem;
  z-index: 10;
  display: none;
  flex-direction: column;
  gap: 1rem;
  width: 20rem;
  pointer-events: none;
}

.execution-panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  overflow: hidden;
  border: 1px solid rgb(143 245 255 / 0.3);
  border-radius: 1rem;
  background: rgb(14 14 14 / 0.84);
  box-shadow: 0 0 20px rgb(0 255 255 / 0.05);
  backdrop-filter: blur(16px);
  pointer-events: auto;
}

.execution-panel__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-bottom: 1px solid rgb(143 245 255 / 0.2);
  background: rgb(143 245 255 / 0.05);
}

.execution-panel__header > div {
  display: flex;
  gap: 0.5rem;
  align-items: center;
}

.execution-panel__header span.material-symbols-outlined {
  color: #8ff5ff;
  font-size: 1rem;
}

.execution-panel__header strong {
  font-size: 0.88rem;
}

.execution-panel__pulse {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
  background: #8ff5ff;
  box-shadow: 0 0 8px #8ff5ff;
}

.execution-inspector,
.execution-task-detail {
  display: grid;
  gap: 0.8rem;
  padding: 1rem;
}

.execution-inspector__row,
.execution-task-detail__row {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: baseline;
}

.execution-inspector__row span,
.execution-task-detail__row span {
  color: #8b8a8a;
  font-size: 0.84rem;
}

.execution-inspector__row strong,
.execution-task-detail__row strong {
  color: #fff;
  text-align: right;
}

.execution-inspector__note,
.execution-task-detail__instruction,
.execution-task-detail__section p,
.execution-task-detail__section li {
  margin: 0;
  color: #d0cece;
  line-height: 1.65;
}

.execution-task-detail__section ul {
  padding-left: 1rem;
  margin: 0;
}

.execution-zoom {
  position: absolute;
  right: 22.5rem;
  bottom: 2rem;
  z-index: 12;
  display: none;
  flex-direction: column;
  gap: 0.25rem;
  padding: 0.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: rgb(26 25 25 / 0.6);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.45);
}

.execution-zoom button {
  width: 2.5rem;
  height: 2.5rem;
}

.execution-nodes {
  position: relative;
  width: 1500px;
  height: 980px;
  transform-origin: top left;
}

.task-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 18.75rem;
  min-height: 13rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #262626;
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.5);
}

.task-node--primary {
  box-shadow: 0 0 12px rgb(143 245 255 / 0.3), 0 24px 48px rgb(0 0 0 / 0.5);
}

.task-node__port {
  position: absolute;
  top: 50%;
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  transform: translateY(-50%);
}

.task-node__port--left {
  left: -0.375rem;
  background: #484847;
}

.task-node__port--right {
  right: -0.375rem;
  background: #00deec;
  box-shadow: 0 0 8px rgb(0 222 236 / 0.8);
}

.task-node__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  padding: 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.task-node__header h3 {
  margin: 0 0 0.35rem;
  font-family: var(--cn-font-display);
  font-size: 1.05rem;
  font-weight: 700;
}

.task-node__state,
.task-node__code {
  display: inline-flex;
  align-items: center;
  min-height: 1.4rem;
  padding: 0 0.45rem;
  border-radius: 0.35rem;
  font-family: var(--cn-font-mono);
  font-size: 0.65rem;
}

.task-node__state {
  color: #adaaaa;
  background: #131313;
}

.task-node__code {
  align-self: flex-start;
  color: #767575;
  background: #000;
}

.task-node p {
  flex: 1;
  padding: 1rem 1rem 0;
  margin: 0;
  color: #adaaaa;
  font-size: 0.82rem;
  line-height: 1.65;
}

.task-node__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 0.75rem;
  padding: 1rem;
}

.task-node__meta div {
  padding: 0.75rem;
  border-radius: 0.75rem;
  background: #131313;
}

.task-node__meta small {
  display: block;
  margin-bottom: 0.35rem;
  color: #767575;
  font-size: 0.68rem;
}

.task-node__meta strong {
  font-size: 0.8rem;
}

.task-node__footer {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  padding: 0 1rem 1rem;
  color: #adaaaa;
  font-size: 0.78rem;
}

.task-node__link {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  min-height: 2rem;
  padding: 0 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 0.5rem;
  color: #adaaaa;
  background: transparent;
}

.task-node__link:hover {
  color: #8ff5ff;
}

.task-node__progress {
  height: 0.25rem;
  margin-top: auto;
  background: rgb(72 72 71 / 0.2);
}

.task-node__progress span {
  display: block;
  height: 100%;
  background: linear-gradient(90deg, #8ff5ff, #65afff);
}

@keyframes dash {
  to {
    stroke-dashoffset: -16;
  }
}

@media (min-width: 1024px) {
  .execution-floating,
  .execution-zoom {
    display: flex;
  }
}

@media (max-width: 767px) {
  .execution-topbar {
    padding: 0 1rem;
  }

  .execution-topbar__brand,
  .execution-topbar__context {
    display: none;
  }

  .execution-summary {
    grid-template-columns: 1fr;
  }
}
</style>
