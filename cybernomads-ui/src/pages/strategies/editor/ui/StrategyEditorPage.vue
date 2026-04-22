<script setup lang="ts">
import { computed, nextTick, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getStrategyById, listStrategies, saveStrategy } from '@/entities/strategy/api/strategy-service'
import {
  buildPlaceholderDeclaration,
  mapStrategyPlaceholderDtoToRecord,
  parseStrategyPlaceholdersFromMarkdown,
} from '@/entities/strategy/model/mappers'
import type {
  StrategyDetailRecord,
  StrategyPlaceholderRecord,
  StrategyRecord,
} from '@/entities/strategy/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()

const editorRef = ref<HTMLTextAreaElement | null>(null)
const strategyId = computed(() => String(route.params.strategyId ?? ''))
const isEditMode = computed(() => Boolean(strategyId.value))
const isSaving = ref(false)
const isLoading = ref(false)
const isCatalogLoading = ref(false)
const pageErrorMessage = ref('')
const catalogErrorMessage = ref('')
const insertingStrategyId = ref('')
const moduleKeyword = ref('')
const currentStrategy = ref<StrategyDetailRecord | null>(null)
const strategyCatalog = ref<StrategyRecord[]>([])

const snapshotMarkerPreview = [
  '<!-- cn-strategy-import:start source-id="strategy-demo" -->',
  '# 来源策略正文',
  '<!-- cn-strategy-import:end -->',
].join('\n')

const form = reactive({
  name: '',
  summary: '',
  markdown: '',
  tagsText: '',
})

const parsedTags = computed(() => {
  const tokens = form.tagsText
    .split(/[\n,，]/)
    .map((item) => item.trim())
    .filter(Boolean)

  return [...new Set(tokens)]
})

const filteredCatalog = computed(() => {
  const normalizedKeyword = moduleKeyword.value.trim().toLowerCase()

  return strategyCatalog.value.filter((strategy) => {
    if (strategy.id === strategyId.value) {
      return false
    }

    if (!normalizedKeyword) {
      return true
    }

    return [strategy.name, strategy.summary, strategy.tags.join(' ')]
      .join(' ')
      .toLowerCase()
      .includes(normalizedKeyword)
  })
})

const placeholderPreview = computed<StrategyPlaceholderRecord[]>(() => {
  if (currentStrategy.value && form.markdown === currentStrategy.value.contentMarkdown) {
    return currentStrategy.value.placeholders
  }

  const deduplicated = new Map<string, StrategyPlaceholderRecord>()

  for (const placeholder of parseStrategyPlaceholdersFromMarkdown(form.markdown)) {
    deduplicated.set(placeholder.key, mapStrategyPlaceholderDtoToRecord(placeholder))
  }

  return [...deduplicated.values()]
})

function createDefaultMarkdown() {
  return [
    '# 新策略',
    '',
    '## 使用说明',
    '- 在这里编写 Markdown 提示词正文。',
    '- 需要参数时，使用 {{string:title="默认标题"}} 或 {{int:max_retry=3}}。',
  ].join('\n')
}

function applyStrategy(detail: StrategyDetailRecord | null) {
  currentStrategy.value = detail
  form.name = detail?.name ?? ''
  form.summary = detail?.summary ?? ''
  form.markdown = detail?.contentMarkdown ?? createDefaultMarkdown()
  form.tagsText = detail?.tags.join(', ') ?? ''
}

async function loadCatalog() {
  isCatalogLoading.value = true
  catalogErrorMessage.value = ''

  try {
    strategyCatalog.value = await listStrategies()
  } catch (error) {
    catalogErrorMessage.value = error instanceof Error ? error.message : '策略侧栏加载失败。'
  } finally {
    isCatalogLoading.value = false
  }
}

async function loadStrategy() {
  isLoading.value = true
  pageErrorMessage.value = ''

  try {
    if (!isEditMode.value) {
      applyStrategy(null)
      return
    }

    const strategy = await getStrategyById(strategyId.value)

    if (!strategy) {
      pageErrorMessage.value = '未找到该策略，已切换为空白编辑状态。'
      applyStrategy(null)
      return
    }

    applyStrategy(strategy)
  } catch (error) {
    pageErrorMessage.value = error instanceof Error ? error.message : '策略详情加载失败。'
  } finally {
    isLoading.value = false
  }
}

watch([strategyId, mockScenarioId], () => {
  void loadCatalog()
  void loadStrategy()
}, { immediate: true })

function resolveModuleTone(index: number) {
  if (index % 4 === 0) return 'tertiary'
  if (index % 4 === 1) return 'secondary'
  if (index % 4 === 2) return 'primary'
  return 'error'
}

function resolveModuleIcon(strategy: StrategyRecord) {
  if (strategy.tags.some((tag) => tag.includes('私信'))) return 'forum'
  if (strategy.tags.some((tag) => tag.includes('活动'))) return 'bolt'
  if (strategy.tags.some((tag) => tag.includes('滴灌'))) return 'water_drop'
  return 'description'
}

async function insertTextAtCursor(text: string) {
  const editor = editorRef.value

  if (!editor) {
    form.markdown = [form.markdown.trimEnd(), text].filter(Boolean).join('\n\n')
    return
  }

  const selectionStart = editor.selectionStart ?? form.markdown.length
  const selectionEnd = editor.selectionEnd ?? selectionStart
  const before = form.markdown.slice(0, selectionStart)
  const after = form.markdown.slice(selectionEnd)
  const prefix = before && !before.endsWith('\n') ? '\n\n' : ''
  const suffix = after && !after.startsWith('\n') ? '\n\n' : ''
  const insertion = `${prefix}${text}${suffix}`

  form.markdown = `${before}${insertion}${after}`

  await nextTick()
  const cursor = before.length + insertion.length
  editor.focus()
  editor.setSelectionRange(cursor, cursor)
}

function composeSnapshotBlock(strategy: StrategyDetailRecord) {
  return [
    `<!-- cn-strategy-import:start source-id="${strategy.id}" -->`,
    strategy.contentMarkdown.trim(),
    '<!-- cn-strategy-import:end -->',
  ].join('\n')
}

async function handleInsertStrategy(strategySummary: StrategyRecord) {
  insertingStrategyId.value = strategySummary.id
  catalogErrorMessage.value = ''

  try {
    const detail = await getStrategyById(strategySummary.id)

    if (!detail) {
      catalogErrorMessage.value = `策略「${strategySummary.name}」不存在或不可读取。`
      return
    }

    await insertTextAtCursor(composeSnapshotBlock(detail))
  } catch (error) {
    catalogErrorMessage.value = error instanceof Error ? error.message : '策略插入失败。'
  } finally {
    insertingStrategyId.value = ''
  }
}

async function handleSave() {
  if (!form.name.trim() || !form.markdown.trim()) {
    return
  }

  isSaving.value = true
  pageErrorMessage.value = ''

  try {
    await saveStrategy({
      id: isEditMode.value ? strategyId.value : undefined,
      name: form.name.trim(),
      summary: form.summary.trim() || undefined,
      tags: parsedTags.value,
      contentMarkdown: form.markdown,
    })

    await router.push({
      path: '/strategies',
      query: {
        refresh: String(Date.now()),
      },
    })
  } catch (error) {
    pageErrorMessage.value = error instanceof Error ? error.message : '策略保存失败。'
  } finally {
    isSaving.value = false
  }
}

function handleReload() {
  void loadStrategy()
  void loadCatalog()
}

async function handleInsertHeading() {
  await insertTextAtCursor('## 新章节')
}

async function handleInsertStringPlaceholder() {
  await insertTextAtCursor(buildPlaceholderDeclaration({
    type: 'string',
    key: 'title',
    defaultValue: '默认标题',
  }))
}

async function handleInsertIntPlaceholder() {
  await insertTextAtCursor(buildPlaceholderDeclaration({
    type: 'int',
    key: 'max_retry',
    defaultValue: 3,
  }))
}
</script>

<template>
  <section class="strategy-editor-page">
    <header class="strategy-editor-header">
      <div class="strategy-editor-header__left">
        <RouterLink to="/strategies" class="strategy-editor-header__back">
          <span class="material-symbols-outlined">arrow_back</span>
        </RouterLink>
        <div class="strategy-editor-header__divider" />
        <input v-model="form.name" type="text" placeholder="策略名称" data-testid="strategy-editor-name" />
      </div>

      <div class="strategy-editor-header__right">
        <div class="strategy-editor-header__tags">
          <span v-for="tag in parsedTags" :key="tag">{{ tag }}</span>
          <span v-if="parsedTags.length === 0">未分类</span>
          <input
            v-model="form.tagsText"
            class="strategy-editor-header__tag-input"
            type="text"
            placeholder="标签，逗号分隔"
            data-testid="strategy-editor-tags"
          />
        </div>
        <div class="strategy-editor-header__divider" />
        <div class="strategy-editor-header__actions">
          <button type="button" class="strategy-editor-header__action" :disabled="isSaving" @click="handleReload">
            {{ isLoading ? '加载中…' : '重新加载' }}
          </button>
          <button
            type="button"
            class="strategy-editor-header__action strategy-editor-header__action--primary"
            data-testid="strategy-editor-save"
            :disabled="isSaving || !form.name.trim() || !form.markdown.trim()"
            @click="handleSave"
          >
            <span class="material-symbols-outlined">save</span>
            <span>{{ isSaving ? '保存中…' : '保存策略' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="strategy-editor-body">
      <aside class="strategy-modules">
        <div class="strategy-modules__header">
          <h2>
            <span class="material-symbols-outlined">library_books</span>
            <span>策略池</span>
          </h2>
          <p>从左侧选择已有策略并整篇插入到当前正文，插入后仅保留快照内容。</p>
          <label class="strategy-modules__search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="moduleKeyword" type="text" placeholder="搜索策略..." />
          </label>
          <p v-if="catalogErrorMessage" class="strategy-modules__alert">{{ catalogErrorMessage }}</p>
        </div>

        <div class="strategy-modules__list">
          <article v-if="isCatalogLoading" class="strategy-module strategy-module--secondary">
            <div class="strategy-module__top">
              <div class="strategy-module__identity">
                <div class="strategy-module__icon">
                  <span class="material-symbols-outlined">progress_activity</span>
                </div>
                <div>
                  <h3>正在加载策略</h3>
                  <span>Catalog</span>
                </div>
              </div>
            </div>
            <p>正在同步可插入的策略列表。</p>
          </article>

          <article
            v-for="(strategy, index) in filteredCatalog"
            :key="strategy.id"
            class="strategy-module"
            :class="[
              `strategy-module--${resolveModuleTone(index)}`,
              { 'strategy-module--active': insertingStrategyId === strategy.id },
            ]"
          >
            <div class="strategy-module__top">
              <div class="strategy-module__identity">
                <div class="strategy-module__icon">
                  <span class="material-symbols-outlined">{{ resolveModuleIcon(strategy) }}</span>
                </div>
                <div>
                  <h3>{{ strategy.name }}</h3>
                  <span>{{ strategy.updatedAtLabel }}</span>
                </div>
              </div>

              <button type="button" class="strategy-module__action" :disabled="insertingStrategyId === strategy.id" @click="handleInsertStrategy(strategy)">
                <span class="material-symbols-outlined">{{ insertingStrategyId === strategy.id ? 'sync' : 'add' }}</span>
              </button>
            </div>
            <p>{{ strategy.summary }}</p>
          </article>

          <article v-if="!isCatalogLoading && filteredCatalog.length === 0" class="strategy-module strategy-module--primary">
            <div class="strategy-module__top">
              <div class="strategy-module__identity">
                <div class="strategy-module__icon">
                  <span class="material-symbols-outlined">inventory_2</span>
                </div>
                <div>
                  <h3>没有可插入策略</h3>
                  <span>Catalog</span>
                </div>
              </div>
            </div>
            <p>调整检索条件后重试，或者先创建新的策略。</p>
          </article>
        </div>
      </aside>

      <section class="strategy-canvas">
        <div class="strategy-canvas__toolbar">
          <div class="strategy-canvas__toolbar-left">
            <button type="button" @click="handleInsertHeading">
              <span class="material-symbols-outlined">format_h1</span>
            </button>
            <button type="button" @click="handleInsertStringPlaceholder">
              <span class="material-symbols-outlined">format_bold</span>
            </button>
            <button type="button" @click="handleInsertIntPlaceholder">
              <span class="material-symbols-outlined">code</span>
            </button>
            <div class="strategy-canvas__toolbar-divider" />
            <button type="button" @click="handleReload">
              <span class="material-symbols-outlined">data_object</span>
            </button>
          </div>
          <span>{{ placeholderPreview.length }} placeholders | Markdown</span>
        </div>

        <div class="strategy-canvas__content">
          <div class="strategy-canvas__frontmatter">
            <div class="strategy-canvas__meta-row">
              <span class="strategy-canvas__key">name:</span>
              <span class="strategy-canvas__value">"{{ form.name || '未命名策略' }}"</span>
            </div>
            <div class="strategy-canvas__meta-row">
              <span class="strategy-canvas__key">tags:</span>
              <span class="strategy-canvas__value">[{{ parsedTags.join(', ') || '未分类' }}]</span>
            </div>
            <div class="strategy-canvas__meta-row">
              <span class="strategy-canvas__key">summary:</span>
            </div>
            <textarea
              v-model="form.summary"
              class="strategy-canvas__meta-textarea"
              rows="3"
              placeholder="摘要说明"
              data-testid="strategy-editor-summary"
            />
          </div>

          <textarea ref="editorRef" v-model="form.markdown" data-testid="strategy-editor-markdown" />

          <div class="strategy-snippet">
            <div class="strategy-snippet__rail" />
            <div class="strategy-snippet__header">
              <span class="material-symbols-outlined">library_add</span>
              <span>整篇插入约定</span>
            </div>
            <div class="strategy-snippet__body">
              <p>从左侧插入策略时，会把完整正文包裹在导入块标记中，后续仍然可以继续手工修改。</p>
              <div class="strategy-snippet__code">{{ snapshotMarkerPreview }}</div>
              <p class="strategy-snippet__hint">* 插入后的内容是静态快照，不会和来源策略保持实时引用关系。</p>
            </div>
          </div>

          <div class="strategy-canvas__cursor">
            <span />
            <p>{{ pageErrorMessage || '继续输入正文，或从左侧插入整篇策略...' }}</p>
          </div>
        </div>
      </section>

      <aside class="strategy-objects">
        <div class="strategy-objects__header">
          <h2>
            <span class="material-symbols-outlined">data_object</span>
            <span>参数占位符</span>
          </h2>
          <p>自动识别当前策略中的 `type / key / defaultValue` 声明。</p>
        </div>

        <div class="strategy-objects__list">
          <div v-for="placeholder in placeholderPreview" :key="placeholder.key" class="strategy-object">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">tune</span>
            </div>
            <div class="strategy-object__content">
              <h3>{{ placeholder.key }}</h3>
              <span>{{ placeholder.type }} / {{ placeholder.displayDefaultValue || '空字符串' }}</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check">check_circle</span>
          </div>

          <div v-if="placeholderPreview.length === 0" class="strategy-object strategy-object--asset">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">data_object</span>
            </div>
            <div class="strategy-object__content">
              <h3>暂无占位符</h3>
              <span>可使用 {{ buildPlaceholderDeclaration({ type: 'string', key: 'title', defaultValue: '默认标题' }) }}</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check strategy-object__check--muted">remove</span>
          </div>
        </div>
      </aside>
    </main>
  </section>
</template>

<style scoped lang="scss">
.strategy-editor-page {
  display: flex;
  flex-direction: column;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.strategy-editor-header {
  display: flex;
  flex-wrap: wrap;
  gap: 1rem;
  align-items: center;
  justify-content: space-between;
  min-height: 4rem;
  padding: 0 1.5rem;
  background: #131313;
  box-shadow: 0 4px 24px rgb(0 0 0 / 0.5);
}

.strategy-editor-header__left,
.strategy-editor-header__right,
.strategy-editor-header__tags,
.strategy-editor-header__actions {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.strategy-editor-header__left {
  min-width: min(34rem, 100%);
  flex: 1;
}

.strategy-editor-header__back {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border-radius: 999px;
  color: #adaaaa;
}

.strategy-editor-header__back:hover {
  color: #8ff5ff;
  background: #1a1919;
}

.strategy-editor-header__divider {
  width: 1px;
  height: 1.5rem;
  background: rgb(72 72 71 / 0.3);
}

.strategy-editor-header input {
  flex: 1;
  border: 0;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-display);
  font-size: clamp(1.2rem, 2vw, 1.6rem);
  font-weight: 700;
  outline: 0;
}

.strategy-editor-header__tags span,
.strategy-editor-header__tag-add {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  min-height: 1.9rem;
  padding: 0 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #262626;
  font-size: 0.74rem;
}

.strategy-editor-header__tags span:first-of-type {
  color: #4aa2f9;
}

.strategy-editor-header__tags span:nth-of-type(2) {
  color: #b7e500;
}

.strategy-editor-header__tag-add {
  width: 1.9rem;
  padding: 0;
  justify-content: center;
  color: #adaaaa;
}

.strategy-editor-header__tag-input {
  min-width: 7rem;
  max-width: 10rem;
  border: 0;
  color: #fff;
  background: transparent;
  font-size: 0.75rem;
  outline: 0;
}

.strategy-editor-header__tag-input::placeholder {
  color: #767575;
}

.strategy-editor-header__action {
  border: 0;
  padding: 0.7rem 1rem;
  border-radius: 0.6rem;
  color: #adaaaa;
  background: transparent;
}

.strategy-editor-header__action:hover {
  background: #201f1f;
}

.strategy-editor-header__action--primary {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  color: #005d63;
  background: #8ff5ff;
  font-weight: 600;
}

.strategy-editor-header__action--primary:hover {
  background: #00eefc;
}

.strategy-editor-body {
  display: grid;
  grid-template-columns: 20rem minmax(0, 1fr);
  min-height: 0;
  flex: 1;
}

.strategy-modules,
.strategy-objects {
  background: #131313;
}

.strategy-modules {
  display: flex;
  flex-direction: column;
}

.strategy-modules__header,
.strategy-objects__header {
  padding: 1.5rem 1.5rem 0.5rem;
}

.strategy-modules__header h2,
.strategy-objects__header h2 {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin: 0;
  color: #8ff5ff;
  font-family: var(--cn-font-display);
  font-size: 1.15rem;
  font-weight: 700;
}

.strategy-modules__header p,
.strategy-objects__header p {
  margin: 0.4rem 0 0;
  color: #adaaaa;
  font-size: 0.78rem;
}

.strategy-modules__alert {
  color: #ff716c !important;
}

.strategy-modules__search {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  padding: 0.75rem 0.85rem;
  margin-top: 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #1a1919;
  color: #adaaaa;
}

.strategy-modules__search input {
  width: 100%;
  border: 0;
  color: #fff;
  background: transparent;
  outline: 0;
}

.strategy-modules__list,
.strategy-objects__list {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.5rem 1.5rem;
  overflow-y: auto;
}

.strategy-module,
.strategy-object {
  position: relative;
  display: grid;
  gap: 0.75rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #1a1919;
}

.strategy-module--active {
  border-color: rgb(143 245 255 / 0.3);
  box-shadow: 0 0 12px rgb(143 245 255 / 0.2);
}

.strategy-module--active::before {
  position: absolute;
  top: 1rem;
  bottom: 1rem;
  left: -1px;
  width: 2px;
  content: '';
  background: linear-gradient(180deg, #8ff5ff, #00eefc);
}

.strategy-module__top,
.strategy-module__identity,
.strategy-object {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
}

.strategy-module__top {
  justify-content: space-between;
}

.strategy-module__icon,
.strategy-object__icon {
  display: grid;
  place-items: center;
  width: 2rem;
  height: 2rem;
  border-radius: 0.5rem;
  background: rgb(74 162 249 / 0.12);
  flex-shrink: 0;
}

.strategy-module--secondary .strategy-module__icon {
  color: #c3f400;
  background: rgb(195 244 0 / 0.12);
}

.strategy-module--primary .strategy-module__icon,
.strategy-object__icon {
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.12);
}

.strategy-module--error .strategy-module__icon {
  color: #ff716c;
  background: rgb(255 113 108 / 0.12);
}

.strategy-module__identity h3,
.strategy-object__content h3 {
  margin: 0;
  font-size: 0.9rem;
  font-weight: 500;
}

.strategy-module__identity span,
.strategy-object__content span {
  color: #adaaaa;
  font-size: 0.65rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.strategy-module__action {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.75rem;
  height: 1.75rem;
  border: 0;
  border-radius: 999px;
  color: #adaaaa;
  background: #262626;
}

.strategy-module--active .strategy-module__action {
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.15);
}

.strategy-module p {
  margin: 0;
  color: #adaaaa;
  font-size: 0.76rem;
  line-height: 1.6;
}

.strategy-canvas {
  display: flex;
  flex-direction: column;
  min-width: 0;
  background: #0e0e0e;
}

.strategy-canvas__toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  min-height: 3rem;
  padding: 0 1.5rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.1);
  background: rgb(19 19 19 / 0.5);
}

.strategy-canvas__toolbar-left {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  color: #adaaaa;
}

.strategy-canvas__toolbar-left button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 0.5rem;
  color: inherit;
  background: transparent;
}

.strategy-canvas__toolbar-left button:hover {
  color: #fff;
  background: #1a1919;
}

.strategy-canvas__toolbar-divider {
  width: 1px;
  height: 1rem;
  margin: 0 0.5rem;
  background: rgb(72 72 71 / 0.3);
}

.strategy-canvas__toolbar span:last-child {
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.strategy-canvas__content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 2.5rem;
}

.strategy-canvas__frontmatter {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #0a0a0a;
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
}

.strategy-canvas__meta-row {
  margin-bottom: 0.5rem;
}

.strategy-canvas__meta-textarea {
  width: 100%;
  min-height: 4.5rem;
  border: 0;
  color: #c5c9cb;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
  line-height: 1.65;
  outline: 0;
  resize: vertical;
}

.strategy-canvas__key {
  color: #65afff;
}

.strategy-canvas__value {
  color: #c3f400;
}

.strategy-canvas textarea {
  width: 100%;
  min-height: 18rem;
  border: 0;
  color: #c5c9cb;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.95rem;
  line-height: 1.85;
  outline: 0;
  resize: vertical;
}

.strategy-snippet {
  position: relative;
  padding: 1.25rem 1.5rem 1.25rem 1.75rem;
  margin-top: 1.5rem;
  border: 1px solid rgb(143 245 255 / 0.2);
  border-radius: 1rem;
  background: rgb(38 38 38 / 0.4);
}

.strategy-snippet__rail {
  position: absolute;
  top: 1.5rem;
  bottom: 1.5rem;
  left: -1px;
  width: 2px;
  background: linear-gradient(180deg, #8ff5ff, #00eefc);
}

.strategy-snippet__header {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  margin-bottom: 1rem;
  color: #8ff5ff;
  font-size: 0.76rem;
  font-weight: 700;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.strategy-snippet__body p {
  margin: 0 0 0.9rem;
  color: #fff;
}

.strategy-snippet__code {
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #0a0a0a;
  font-family: var(--cn-font-mono);
  font-size: 0.8rem;
  white-space: pre-wrap;
}

.strategy-snippet__hint {
  margin-top: 0.75rem !important;
  color: #d7383b !important;
  font-size: 0.75rem;
  font-style: italic;
}

.strategy-canvas__cursor {
  display: flex;
  gap: 0.5rem;
  align-items: flex-start;
  margin-top: 1.75rem;
}

.strategy-canvas__cursor span {
  width: 0.25rem;
  height: 1.25rem;
  background: #8ff5ff;
  box-shadow: 0 0 8px rgb(143 245 255 / 0.5);
}

.strategy-canvas__cursor p {
  margin: 0;
  color: rgb(255 255 255 / 0.5);
  font-style: italic;
}

.strategy-objects {
  display: none;
  border-left: 1px solid rgb(72 72 71 / 0.1);
}

.strategy-object {
  gap: 0.75rem;
  align-items: center;
}

.strategy-object--asset .strategy-object__icon {
  color: #c3f400;
  background: rgb(195 244 0 / 0.12);
}

.strategy-object__content {
  flex: 1;
  min-width: 0;
}

.strategy-object__content h3 {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-object__check {
  color: #8ff5ff;
}

.strategy-object__check--muted {
  color: #adaaaa;
}

@media (min-width: 1280px) {
  .strategy-editor-body {
    grid-template-columns: 20rem minmax(0, 1fr) 18rem;
  }

  .strategy-objects {
    display: flex;
    flex-direction: column;
  }
}
</style>
