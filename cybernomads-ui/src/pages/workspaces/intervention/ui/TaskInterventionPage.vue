<script setup lang="ts">
import { computed, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import {
  getInterventionContext,
  sendInterventionCommand,
  type InterventionContext,
} from '@/entities/intervention-record/api/intervention-service'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()

const context = ref<InterventionContext | null>(null)
const referenceDraft = `# 任务指令：Bilibili 视频数据抓取

目标：根据指定关键词，搜索并提取相关视频元数据。

执行步骤：
1. 访问 Bilibili 搜索页面。
2. 输入搜索词：\`"赛博朋克 边缘行者 分析"\`。
3. 按“最多播放”进行排序。
4. 提取前 20 个视频的以下信息：
   - 视频标题
   - 播放量
   - UP主名称
   - 发布日期
   - 视频链接

**注意：** 遇到反爬虫验证时，暂停执行并请求人工干预。`
const logs = [
  { time: '[10:42:01]', tone: 'info', message: 'INFO: Navigated to search URL.' },
  { time: '[10:42:03]', tone: 'info', message: 'INFO: Entered search query.' },
  { time: '[10:42:04]', tone: 'warning', message: 'WARN: DOM structure altered, retrying selector.' },
  { time: '[10:42:06]', tone: 'error', message: 'ERROR: CAPTCHA detected on element #verify-modal.' },
  {
    time: '[10:42:06]',
    tone: 'critical',
    message: 'CRITICAL: Suspending task execution. Requesting user intervention.',
  },
] as const
const draft = ref('')
const isSubmitting = ref(false)

const workspaceId = computed(() => String(route.params.workspaceId ?? ''))
const taskId = computed(() => String(route.params.taskId ?? ''))
const lineNumbers = computed(() => Math.max(draft.value.split('\n').length, 12))
const runtimePath = computed(() => `/workspaces/${workspaceId.value}/runtime`)

watch(
  [workspaceId, taskId, mockScenarioId],
  async () => {
    context.value = await getInterventionContext(workspaceId.value, taskId.value)
    draft.value = referenceDraft
  },
  { immediate: true },
)

async function handleSubmit() {
  if (!context.value || !draft.value.trim()) {
    return
  }

  isSubmitting.value = true

  try {
    await sendInterventionCommand(workspaceId.value, taskId.value, draft.value.trim())
    await router.push(runtimePath.value)
  } finally {
    isSubmitting.value = false
  }
}

function discardChanges() {
  draft.value = referenceDraft
}
</script>

<template>
  <section v-if="context" class="intervention-page">
    <header class="intervention-header">
      <div class="intervention-header__crumbs">
        <RouterLink :to="runtimePath" class="intervention-header__back" title="返回工作环境">
          <span class="material-symbols-outlined">arrow_back</span>
        </RouterLink>
        <RouterLink :to="runtimePath">{{ context.workspace.name }}</RouterLink>
        <span class="material-symbols-outlined">chevron_right</span>
        <span>任务：{{ context.task.code ?? context.task.name }}</span>
        <span class="material-symbols-outlined">chevron_right</span>
        <span class="intervention-header__crumbs-active">人工干预</span>
      </div>

      <div class="intervention-header__actions">
        <button type="button">
          <span class="material-symbols-outlined">history</span>
        </button>
        <button type="button">
          <span class="material-symbols-outlined">more_vert</span>
        </button>
      </div>
    </header>

    <main class="intervention-main">
      <section class="intervention-editor">
        <div class="intervention-editor__intro">
          <h1>任务干预与提示词编辑</h1>
          <p>直接修改代理执行指令以解决当前阻塞状态。</p>
        </div>

        <div class="intervention-editor__panel">
          <div class="intervention-toolbar">
            <button type="button">
              <span class="material-symbols-outlined">format_bold</span>
            </button>
            <button type="button">
              <span class="material-symbols-outlined">format_italic</span>
            </button>
            <div class="intervention-toolbar__separator" />
            <button type="button">
              <span class="material-symbols-outlined">code</span>
            </button>
            <button type="button">
              <span class="material-symbols-outlined">link</span>
            </button>
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
            <strong>
              <span class="material-symbols-outlined">pause_circle</span>
              <span>Paused for Intervention</span>
            </strong>
          </div>
          <p>代理遇到未知验证码，无法继续执行页面交互。</p>
        </section>

        <section class="intervention-sidebar__section">
          <div class="intervention-sidebar__label">分配代理</div>
          <div class="intervention-agent">
            <div class="intervention-agent__icon">
              <span class="material-symbols-outlined">smart_toy</span>
            </div>
            <div>
              <strong>Scraper_B_04</strong>
              <span>v2.4 - Data Node</span>
            </div>
          </div>
        </section>

        <section class="intervention-sidebar__section intervention-logs">
          <div class="intervention-logs__header">
            <span>执行日志片段</span>
            <button type="button">
              <span class="material-symbols-outlined">open_in_new</span>
              <span>全屏</span>
            </button>
          </div>

          <div class="intervention-logs__body">
            <div
              v-for="entry in logs"
              :key="`${entry.time}-${entry.message}`"
              class="intervention-logs__line"
              :class="`intervention-logs__line--${entry.tone}`"
            >
              <span>{{ entry.time }}</span>
              <span>{{ entry.message }}</span>
            </div>
          </div>
        </section>
      </aside>
    </main>

    <footer class="intervention-footer">
      <button type="button" class="intervention-footer__button" @click="router.push(runtimePath)">
        返回工作环境
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
        <span>{{ isSubmitting ? '保存中…' : '保存并恢复执行' }}</span>
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

.intervention-header {
  position: sticky;
  top: 0;
  z-index: 20;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  height: 4rem;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: rgb(14 14 14 / 0.8);
  backdrop-filter: blur(20px);
}

.intervention-header__crumbs,
.intervention-header__actions,
.intervention-footer {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.intervention-header__crumbs {
  flex-wrap: wrap;
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
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.intervention-header__back:hover {
  color: #8ff5ff;
  background: rgb(38 38 38 / 0.95);
}

.intervention-header__crumbs-active {
  color: #8ff5ff;
  font-weight: 500;
}

.intervention-header__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: #adaaaa;
  background: transparent;
}

.intervention-header__actions button:hover {
  color: #8ff5ff;
}

.intervention-main {
  display: flex;
  flex: 1;
  min-height: 0;
}

.intervention-editor {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.5rem;
  min-width: 0;
}

.intervention-editor__intro {
  margin-bottom: 1rem;
}

.intervention-editor__intro h1,
.intervention-sidebar h2 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(2rem, 4vw, 2.4rem);
  font-weight: 700;
  letter-spacing: -0.04em;
}

.intervention-editor__intro p {
  margin: 0.4rem 0 0;
  color: #adaaaa;
}

.intervention-editor__panel {
  position: relative;
  display: flex;
  flex: 1;
  flex-direction: column;
  min-height: 34rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: rgb(26 25 25 / 0.6);
  backdrop-filter: blur(20px);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.32);
}

.intervention-editor__panel::before {
  position: absolute;
  inset: 0;
  border-radius: inherit;
  content: '';
  pointer-events: none;
  box-shadow: inset 0 0 0 1px rgb(143 245 255 / 0.04);
}

.intervention-toolbar {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: #201f1f;
  color: #adaaaa;
}

.intervention-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.intervention-toolbar button:hover {
  color: #8ff5ff;
}

.intervention-toolbar__separator {
  width: 1px;
  height: 1rem;
  background: rgb(72 72 71 / 0.3);
}

.intervention-body {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  background: rgb(26 25 25 / 0.5);
}

.intervention-body__lines {
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

.intervention-body textarea {
  width: 100%;
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
  display: none;
  flex-direction: column;
  width: 24rem;
  padding: 1.5rem;
  border-left: 1px solid rgb(72 72 71 / 0.2);
  background: #131313;
}

.intervention-sidebar__section,
.intervention-card,
.intervention-agent,
.intervention-logs__body {
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #1a1919;
}

.intervention-card,
.intervention-sidebar__section {
  padding: 1rem;
  margin-top: 1rem;
}

.intervention-card--status {
  position: relative;
  overflow: hidden;
}

.intervention-card--status::before {
  position: absolute;
  top: 0;
  bottom: 0;
  left: 0;
  width: 0.25rem;
  content: '';
  background: #ff716c;
}

.intervention-card__status-row {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.5rem;
}

.intervention-card__status-row > span {
  color: #adaaaa;
}

.intervention-card__status-row strong {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  color: #ff716c;
  font-size: 0.84rem;
}

.intervention-card p,
.intervention-agent span {
  margin: 0;
  color: #fff;
  line-height: 1.7;
}

.intervention-sidebar__label,
.intervention-logs__header span {
  color: #adaaaa;
  font-size: 0.9rem;
}

.intervention-agent {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0.8rem;
  margin-top: 0.75rem;
}

.intervention-agent__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(143 245 255 / 0.3);
  border-radius: 999px;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.1);
}

.intervention-agent strong {
  display: block;
  margin-bottom: 0.15rem;
}

.intervention-agent span {
  color: #8ff5ff;
  font-size: 0.75rem;
}

.intervention-logs__header {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.75rem;
}

.intervention-logs__header button {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  border: 0;
  color: #8ff5ff;
  background: transparent;
  font-size: 0.76rem;
}

.intervention-logs__body {
  flex: 1;
  overflow-y: auto;
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

.intervention-logs__line--warning span:last-child {
  color: #c3f400;
}

.intervention-logs__line--error span:last-child {
  color: #ff716c;
}

.intervention-logs__line--critical span:last-child {
  color: #d7383b;
}

.intervention-footer {
  justify-content: flex-end;
  padding: 1rem 1.5rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
  background: #1a1919;
  box-shadow: 0 -12px 24px rgb(0 0 0 / 0.3);
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

.intervention-footer__button:hover {
  color: #fff;
  background: #201f1f;
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

@media (min-width: 1280px) {
  .intervention-sidebar {
    display: flex;
  }
}
</style>
