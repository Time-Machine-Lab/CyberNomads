<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  createTaskOutputNote,
  getInterventionContext,
  type InterventionContext,
} from '@/entities/intervention-record/api/intervention-service'

const route = useRoute()
const router = useRouter()

const context = ref<InterventionContext | null>(null)
const draft = ref('')
const isLoading = ref(false)
const isSubmitting = ref(false)
const errorMessage = ref('')

const workspaceId = computed(() => String(route.params.workspaceId ?? ''))
const taskId = computed(() => String(route.params.taskId ?? ''))
const runtimePath = computed(() => `/workspaces/${workspaceId.value}/runtime`)
const lineNumbers = computed(() => Math.max(draft.value.split('\n').length, 12))
const referenceDraft = computed(() => {
  if (!context.value) return ''

  const task = context.value.task
  const inputNeeds = task.inputNeeds?.length
    ? task.inputNeeds.map((need) => `- ${need.name}: ${need.description}（来源：${need.source}）`).join('\n')
    : '- 当前没有声明额外输入需求。'

  return [
    `# 任务输出记录：${task.name}`,
    '',
    `任务 ID：${task.id}`,
    `当前状态：${task.statusLabel ?? task.status}`,
    '',
    '## 后端指令',
    task.instruction ?? task.summary,
    '',
    '## 输入需求',
    inputNeeds,
    '',
    '## 人工备注',
    '- 在这里记录人工观察、补充说明或产物地址。',
  ].join('\n')
})

const outputRecords = computed(() => context.value?.records ?? [])

async function loadContext() {
  isLoading.value = true
  errorMessage.value = ''

  try {
    context.value = await getInterventionContext(workspaceId.value, taskId.value)
    draft.value = referenceDraft.value
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '任务上下文加载失败，请稍后重试。'
  } finally {
    isLoading.value = false
  }
}

watch([workspaceId, taskId], () => void loadContext(), { immediate: true })

async function handleSubmit() {
  if (!context.value || !draft.value.trim()) {
    return
  }

  isSubmitting.value = true
  errorMessage.value = ''

  try {
    await createTaskOutputNote(workspaceId.value, taskId.value, draft.value.trim())
    await router.push(runtimePath.value)
  } catch (error) {
    errorMessage.value = error instanceof Error ? error.message : '任务输出记录提交失败，请稍后重试。'
  } finally {
    isSubmitting.value = false
  }
}

function discardChanges() {
  draft.value = referenceDraft.value
}
</script>

<template>
  <section class="intervention-page">
    <header class="intervention-header">
      <div class="intervention-header__crumbs">
        <RouterLink :to="runtimePath" class="intervention-header__back" title="返回工作环境">
          <span class="material-symbols-outlined">arrow_back</span>
        </RouterLink>
        <RouterLink :to="runtimePath">{{ context?.workspace.name ?? 'TrafficWork' }}</RouterLink>
        <span class="material-symbols-outlined">chevron_right</span>
        <span>{{ context?.task.name ?? taskId }}</span>
        <span class="material-symbols-outlined">chevron_right</span>
        <span class="intervention-header__crumbs-active">任务详情与输出记录</span>
      </div>
    </header>

    <main class="intervention-main">
      <section v-if="isLoading" class="intervention-state">
        <span class="material-symbols-outlined">sync</span>
        <h1>正在加载任务详情</h1>
        <p>正在读取任务详情与输出记录。</p>
      </section>

      <section v-else-if="errorMessage" class="intervention-state intervention-state--error">
        <span class="material-symbols-outlined">error</span>
        <h1>加载失败</h1>
        <p>{{ errorMessage }}</p>
        <button type="button" @click="loadContext">重试</button>
      </section>

      <section v-else-if="!context" class="intervention-state">
        <span class="material-symbols-outlined">search_off</span>
        <h1>未找到任务</h1>
        <p>请确认路由中的工作区 ID 与任务 ID 是否仍然有效。</p>
      </section>

      <template v-else>
        <section class="intervention-editor">
          <div class="intervention-editor__intro">
            <h1>任务详情与输出记录</h1>
            <p>这里仅写入 Tasks API 支持的 output record，用于补充执行观察、产物位置或人工备注。</p>
          </div>

          <div class="intervention-editor__panel">
            <div class="intervention-toolbar">
              <span class="material-symbols-outlined">edit_note</span>
              <span>输出说明</span>
            </div>

            <div class="intervention-body">
              <div class="intervention-body__lines">
                <span v-for="line in lineNumbers" :key="line">{{ line }}</span>
              </div>

              <textarea v-model="draft" spellcheck="false" />
            </div>
          </div>
        </section>

        <aside class="intervention-sidebar">
          <h2>任务上下文</h2>

          <section class="intervention-card intervention-card--status">
            <div class="intervention-card__status-row">
              <span>当前状态</span>
              <strong>{{ context.task.statusLabel ?? context.task.status }}</strong>
            </div>
            <p>{{ context.task.instruction ?? context.task.summary }}</p>
          </section>

          <section class="intervention-sidebar__section">
            <div class="intervention-sidebar__label">输入需求</div>
            <div v-if="context.task.inputNeeds?.length" class="intervention-logs__body">
              <div
                v-for="need in context.task.inputNeeds"
                :key="`${context.task.id}-${need.name}`"
                class="intervention-logs__line intervention-logs__line--info"
              >
                <span>{{ need.name }}</span>
                <span>{{ need.description }} ({{ need.source }})</span>
              </div>
            </div>
            <div v-else class="intervention-logs__empty">当前任务没有声明额外输入需求。</div>
          </section>

          <section class="intervention-sidebar__section">
            <div class="intervention-sidebar__label">上下文引用</div>
            <div class="intervention-agent">
              <div class="intervention-agent__icon">
                <span class="material-symbols-outlined">data_object</span>
              </div>
              <div>
                <strong>{{ context.task.contextRef ?? '未声明' }}</strong>
                <span>{{ context.workspace.name }}</span>
              </div>
            </div>
          </section>

          <section class="intervention-sidebar__section intervention-logs">
            <div class="intervention-logs__header">
              <span>后端输出记录</span>
            </div>

            <div class="intervention-logs__body">
              <div v-if="outputRecords.length === 0" class="intervention-logs__empty">
                暂无输出记录。
              </div>
              <div
                v-for="record in outputRecords"
                :key="record.id"
                class="intervention-logs__line intervention-logs__line--info"
              >
                <span>{{ new Date(record.createdAt).toLocaleTimeString('zh-CN', { hour12: false }) }}</span>
                <span>{{ record.command }} -> {{ record.response }}</span>
              </div>
            </div>
          </section>
        </aside>
      </template>
    </main>

    <footer v-if="context" class="intervention-footer">
      <button type="button" class="intervention-footer__button" @click="router.push(runtimePath)">
        返回运行概览
      </button>
      <button type="button" class="intervention-footer__button intervention-footer__button--danger" @click="discardChanges">
        放弃修改
      </button>
      <button
        type="button"
        class="intervention-footer__button intervention-footer__button--primary"
        :disabled="isSubmitting || !draft.trim()"
        @click="handleSubmit"
      >
        <span class="material-symbols-outlined fill">save</span>
        <span>{{ isSubmitting ? '保存中' : '保存输出记录' }}</span>
      </button>
    </footer>
  </section>
</template>

<style scoped lang="scss">
.intervention-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.intervention-header,
.intervention-footer {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.5rem;
  border-color: rgb(72 72 71 / 0.2);
  background: rgb(14 14 14 / 0.88);
  backdrop-filter: blur(20px);
}

.intervention-header {
  position: sticky;
  top: 0;
  z-index: 20;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.intervention-header__crumbs {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  align-items: center;
  color: #adaaaa;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
}

.intervention-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: #fff;
  background: rgb(38 38 38 / 0.72);
}

.intervention-header__crumbs-active,
.intervention-sidebar__label,
.intervention-toolbar {
  color: #8ff5ff;
}

.intervention-main {
  display: grid;
  flex: 1;
  gap: 1.5rem;
  width: min(calc(100% - 2rem), 1400px);
  margin: 0 auto;
  padding: 1.5rem 0;
  align-items: start;
  grid-template-columns: minmax(0, 1fr);
}

.intervention-state {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  width: min(100%, 44rem);
  margin: 4rem auto;
  padding: 3rem 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
  text-align: center;
}

.intervention-state .material-symbols-outlined {
  color: #8ff5ff;
  font-size: 2rem;
}

.intervention-state--error .material-symbols-outlined {
  color: #ff716c;
}

.intervention-state h1,
.intervention-editor__intro h1,
.intervention-sidebar h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  letter-spacing: -0.04em;
}

.intervention-state p,
.intervention-editor__intro p,
.intervention-card p,
.intervention-agent span {
  margin: 0;
  color: #adaaaa;
  line-height: 1.7;
}

.intervention-state button {
  min-height: 2.5rem;
  padding: 0 1rem;
  border: 1px solid rgb(143 245 255 / 0.25);
  border-radius: 0.5rem;
  color: #041316;
  background: #8ff5ff;
  font-weight: 700;
}

.intervention-editor {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.intervention-editor__intro {
  margin-bottom: 1rem;
}

.intervention-editor__intro h1 {
  font-size: clamp(2rem, 4vw, 2.4rem);
}

.intervention-editor__panel,
.intervention-sidebar__section,
.intervention-card,
.intervention-logs__body {
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
}

.intervention-editor__panel {
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 34rem;
  overflow: hidden;
}

.intervention-toolbar {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: #201f1f;
  font-family: var(--cn-font-mono);
}

.intervention-body {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  flex: 1;
  min-height: 0;
}

.intervention-body__lines {
  display: grid;
  grid-auto-rows: 1.85em;
  align-content: start;
  justify-items: end;
  padding: 1rem 0.75rem 1rem 0;
  border-right: 1px solid rgb(72 72 71 / 0.2);
  background: #131313;
  color: rgb(118 117 117 / 0.7);
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
  line-height: 1.85;
  text-align: right;
  user-select: none;
}

.intervention-body__lines span {
  display: block;
  min-width: 1ch;
}

.intervention-body textarea {
  display: block;
  width: 100%;
  min-height: 34rem;
  border: 0;
  padding: 1rem;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.96rem;
  line-height: 1.85;
  outline: 0;
  resize: none;
}

.intervention-sidebar {
  display: flex;
  flex-direction: column;
  min-width: 0;
}

.intervention-sidebar__section,
.intervention-card {
  padding: 1rem;
  margin-top: 1rem;
}

.intervention-card--status {
  border-color: rgb(143 245 255 / 0.24);
}

.intervention-card__status-row,
.intervention-agent,
.intervention-logs__header {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  justify-content: space-between;
}

.intervention-card__status-row {
  margin-bottom: 0.5rem;
}

.intervention-agent {
  justify-content: flex-start;
  padding: 0.8rem;
  margin-top: 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #1a1919;
}

.intervention-agent__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.1);
}

.intervention-agent strong {
  display: block;
  margin-bottom: 0.15rem;
}

.intervention-logs__header {
  margin-bottom: 0.75rem;
}

.intervention-logs__body {
  display: grid;
  gap: 0.5rem;
  min-height: 12rem;
  padding: 0.9rem;
  background: #000;
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.78rem;
  line-height: 1.7;
}

.intervention-logs__line {
  display: flex;
  gap: 0.6rem;
  align-items: flex-start;
}

.intervention-logs__line span:first-child {
  width: 4.4rem;
  flex-shrink: 0;
  color: #767575;
}

.intervention-logs__line--info span:last-child {
  color: #65afff;
}

.intervention-logs__empty {
  color: #767575;
}

.intervention-footer {
  justify-content: flex-end;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.intervention-footer__button {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid transparent;
  padding: 0.75rem 1rem;
  border-radius: 0.75rem;
  color: #adaaaa;
  background: transparent;
}

.intervention-footer__button--danger {
  color: #ff716c;
  border-color: rgb(255 113 108 / 0.3);
}

.intervention-footer__button--primary {
  color: #005d63;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-weight: 600;
}

@media (min-width: 1100px) {
  .intervention-main {
    grid-template-columns: minmax(0, 1fr) 24rem;
  }

  .intervention-sidebar {
    position: sticky;
    top: 5.5rem;
  }
}

@media (max-width: 767px) {
  .intervention-main {
    width: min(calc(100% - 1rem), 1400px);
    gap: 1rem;
    padding: 1rem 0;
  }

  .intervention-header,
  .intervention-footer {
    padding: 1rem;
  }

  .intervention-body {
    grid-template-columns: 2.6rem minmax(0, 1fr);
  }

  .intervention-body__lines {
    padding-right: 0.45rem;
    font-size: 0.72rem;
  }
}
</style>
