<script setup lang="ts">
import { computed } from 'vue'

import type { TaskRunRecord } from '@/entities/task-run/model/types'
import { formatTime } from '@/shared/lib/format'

interface Props {
  task: TaskRunRecord
  selected?: boolean
  workspaceId: string
}

const props = withDefaults(defineProps<Props>(), {
  selected: false,
})

const emit = defineEmits<{
  (event: 'select', taskId: string): void
}>()

const tone = computed(() => {
  if (props.task.status === 'running') return 'primary'
  if (props.task.status === 'completed') return 'secondary'
  if (props.task.status === 'attention') return 'error'
  return 'outline'
})

const taskLink = computed(
  () => `/workspaces/${props.workspaceId}/tasks/${props.task.id}/intervention`,
)

function handleSelect() {
  emit('select', props.task.id)
}
</script>

<template>
  <article
    class="task-node"
    :class="[
      `task-node--${tone}`,
      {
        'task-node--selected': selected,
        'task-node--running': task.status === 'running',
      },
    ]"
    :style="{ left: `${task.x ?? 0}px`, top: `${task.y ?? 0}px` }"
    @click="handleSelect"
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
      <RouterLink :to="taskLink" class="task-node__link">任务详情</RouterLink>
    </div>

    <div class="task-node__progress">
      <span :style="{ width: `${task.progress}%` }" />
    </div>
  </article>
</template>

<style scoped lang="scss">
.task-node {
  position: absolute;
  display: flex;
  flex-direction: column;
  width: 18.75rem;
  min-height: 16rem;
  height: 16rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #262626;
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.5);
  transition:
    box-shadow var(--cn-transition),
    border-color var(--cn-transition),
    transform var(--cn-transition);
}

.task-node--selected {
  border-color: rgb(143 245 255 / 0.4);
}

.task-node--primary {
  box-shadow:
    0 0 12px rgb(143 245 255 / 0.3),
    0 24px 48px rgb(0 0 0 / 0.5);
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
  min-height: 0;
  overflow: hidden;
  display: -webkit-box;
  -webkit-box-orient: vertical;
  -webkit-line-clamp: 3;
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
</style>
