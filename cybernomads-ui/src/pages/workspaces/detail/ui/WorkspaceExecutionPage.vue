<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute } from 'vue-router'

import {
  getInterventionContext,
  sendInterventionCommand,
  type InterventionContext,
} from '@/entities/intervention-record/api/intervention-service'
import { getWorkspaceExecution, tickWorkspaceExecution } from '@/entities/workspace/api/workspace-service'
import type { TaskRunRecord } from '@/entities/task-run/model/types'
import type { WorkspaceExecutionView } from '@/entities/workspace/model/types'
import { env } from '@/shared/config/env'
import { usePolling } from '@/shared/hooks/usePolling'
import { formatTime } from '@/shared/lib/format'

const route = useRoute()

const execution = ref<WorkspaceExecutionView | null>(null)
const intervention = ref<InterventionContext | null>(null)
const selectedTaskId = ref('')
const zoom = ref(1)
const interventionCommand = ref('')
const isSubmitting = ref(false)
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
const workspaceStatusText = computed(() => {
  if (!execution.value) return ''

  const baseName =
    execution.value.workspace.id === 'workspace-nova-launch'
      ? '推广执行环境 (工作环境)'
      : execution.value.workspace.name

  return `${baseName} - ${execution.value.workspace.statusLabel ?? execution.value.workspace.status}`
})

async function loadView() {
  execution.value = await getWorkspaceExecution(workspaceId.value)

  if (!selectedTaskId.value && execution.value?.tasks.length) {
    selectedTaskId.value =
      execution.value.tasks.find((task) => task.status === 'running' || task.status === 'attention')?.id ??
      execution.value.tasks[0].id
  }

  if (selectedTaskId.value) {
    intervention.value = await getInterventionContext(workspaceId.value, selectedTaskId.value)
  }
}

const polling = usePolling(
  async () => {
    execution.value = await tickWorkspaceExecution(workspaceId.value)
    if (selectedTaskId.value) {
      intervention.value = await getInterventionContext(workspaceId.value, selectedTaskId.value)
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
  intervention.value = await getInterventionContext(workspaceId.value, next)
})

function resolveTaskColor(task: TaskRunRecord) {
  if (task.status === 'running') return 'primary'
  if (task.status === 'completed') return 'secondary'
  if (task.status === 'attention') return 'error'
  return 'outline'
}

function resolveLogClass(level: WorkspaceExecutionView['logs'][number]['level']) {
  if (level === 'warning') return 'execution-log__line--warning'
  if (level === 'agent') return 'execution-log__line--agent'
  return 'execution-log__line--system'
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

async function handleInterventionSubmit() {
  if (!interventionCommand.value.trim() || !selectedTask.value) {
    return
  }

  isSubmitting.value = true

  try {
    await sendInterventionCommand(workspaceId.value, selectedTask.value.id, interventionCommand.value.trim())
    interventionCommand.value = ''
    await loadView()
  } finally {
    isSubmitting.value = false
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
          <button type="button" title="继续执行">
            <span class="material-symbols-outlined">play_arrow</span>
          </button>
          <button type="button" title="暂停执行">
            <span class="material-symbols-outlined">pause</span>
          </button>
          <button type="button" title="重置视图" @click="resetView">
            <span class="material-symbols-outlined">restart_alt</span>
          </button>
        </div>
      </div>
    </header>

    <div class="execution-body">
      <main class="execution-canvas-shell">
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
              v-for="(task, index) in execution.tasks.slice(0, -1)"
              :key="`${task.id}-${execution.tasks[index + 1]?.id}`"
              :class="{ 'execution-wires__active': task.status === 'running' }"
              :d="buildPath(task.id, execution.tasks[index + 1].id)"
              fill="none"
              :stroke="task.status === 'running' ? 'url(#active-flow)' : '#484847'"
              stroke-width="2"
              filter="url(#glow)"
            />
          </svg>

          <div class="execution-floating">
            <section class="execution-panel">
              <header class="execution-panel__header">
                <div>
                  <span class="material-symbols-outlined">terminal</span>
                  <strong>实时执行日志</strong>
                </div>
                <span class="execution-panel__pulse" />
              </header>

              <div class="execution-log">
                <div
                  v-for="entry in execution.logs"
                  :key="entry.id"
                  class="execution-log__line"
                  :class="resolveLogClass(entry.level)"
                >
                  <span>[{{ formatTime(entry.createdAt) }}]</span>
                  <strong>[{{ entry.sourceLabel ?? '系统' }}]</strong>
                  <span>{{ entry.message }}</span>
                </div>
              </div>
            </section>

            <section class="execution-panel">
              <header class="execution-panel__header">
                <div>
                  <span class="material-symbols-outlined">forum</span>
                  <strong>Agent 干预指令</strong>
                </div>
              </header>

              <div class="execution-chat">
                <div
                  v-for="record in intervention?.records ?? []"
                  :key="record.id"
                  class="execution-chat__group"
                  :class="{ 'execution-chat__group--user': record.actor !== 'Agent 02 (NLU)' }"
                >
                  <span>{{ record.actor }}</span>
                  <div class="execution-chat__bubble">{{ record.command }}</div>
                </div>
              </div>

              <form class="execution-composer" @submit.prevent="handleInterventionSubmit">
                <span class="material-symbols-outlined">code</span>
                <input v-model="interventionCommand" type="text" placeholder="输入干预指令..." />
                <button type="submit" :disabled="!interventionCommand.trim() || isSubmitting">
                  <span class="material-symbols-outlined">send</span>
                </button>
              </form>
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
                  任务干预
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

.execution-log,
.execution-chat {
  flex: 1;
  overflow-y: auto;
  padding: 1rem;
}

.execution-log {
  display: grid;
  gap: 0.55rem;
  font-family: var(--cn-font-mono);
  font-size: 0.7rem;
  line-height: 1.55;
}

.execution-log__line {
  color: #767575;
}

.execution-log__line strong {
  margin: 0 0.3rem;
}

.execution-log__line--system strong,
.execution-log__line--system span:last-child {
  color: #8ff5ff;
}

.execution-log__line--agent strong {
  color: #c3f400;
}

.execution-log__line--warning strong,
.execution-log__line--warning span:last-child {
  color: #ffb800;
}

.execution-chat {
  display: grid;
  gap: 0.75rem;
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.execution-chat__group {
  display: flex;
  flex-direction: column;
  gap: 0.35rem;
}

.execution-chat__group > span {
  color: #8ff5ff;
  opacity: 0.8;
}

.execution-chat__group--user {
  align-items: flex-end;
}

.execution-chat__group--user > span {
  color: #767575;
}

.execution-chat__bubble {
  max-width: 100%;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 0.5rem;
  background: #201f1f;
}

.execution-chat__group--user .execution-chat__bubble {
  color: #8ff5ff;
  border-color: rgb(143 245 255 / 0.2);
  background: rgb(143 245 255 / 0.1);
}

.execution-composer {
  position: relative;
  display: flex;
  align-items: center;
  padding: 0.75rem;
  border-top: 1px solid rgb(143 245 255 / 0.2);
  background: #000;
}

.execution-composer > .material-symbols-outlined {
  position: absolute;
  left: 1.35rem;
  color: rgb(143 245 255 / 0.5);
  font-size: 1rem;
}

.execution-composer input {
  width: 100%;
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.65rem 2.5rem 0.65rem 2rem;
  border-radius: 0.5rem;
  color: #fff;
  background: transparent;
  font-size: 0.78rem;
  outline: 0;
}

.execution-composer button {
  position: absolute;
  right: 1.25rem;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #8ff5ff;
  background: transparent;
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
}
</style>
