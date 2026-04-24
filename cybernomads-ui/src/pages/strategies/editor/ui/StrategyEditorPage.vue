<script setup lang="ts">
import { EditorState, RangeSetBuilder, StateField } from '@codemirror/state'
import { defaultKeymap, history, historyKeymap, indentWithTab } from '@codemirror/commands'
import { Decoration, EditorView, WidgetType, keymap } from '@codemirror/view'
import { computed, nextTick, onBeforeUnmount, onMounted, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getStrategyById, listStrategies, saveStrategy } from '@/entities/strategy/api/strategy-service'
import { buildPlaceholderDeclaration } from '@/entities/strategy/model/mappers'
import type {
  StrategyDetailRecord,
  StrategyPlaceholderRecord,
  StrategyRecord,
} from '@/entities/strategy/model/types'

interface MarkdownPlaceholderMatch {
  type: StrategyPlaceholderRecord['type']
  key: string
  defaultValue: string
  displayDefaultValue: string
  declaration: string
  start: number
  end: number
}

interface StrategyPlaceholderPreviewItem extends StrategyPlaceholderRecord {
  instanceId: string
  start: number
  end: number
}

interface StrategyImportBlockMatch {
  sourceId: string
  title: string
  content: string
  start: number
  end: number
  startMarkerStart: number
  startMarkerEnd: number
  endMarkerStart: number
  endMarkerEnd: number
  contentStart: number
  contentEnd: number
}

const route = useRoute()
const router = useRouter()

const editorHostRef = ref<HTMLDivElement | null>(null)
const tagInputRef = ref<HTMLInputElement | null>(null)
const summaryRef = ref<HTMLTextAreaElement | null>(null)
const strategyId = computed(() => String(route.params.strategyId ?? ''))
const isEditMode = computed(() => Boolean(strategyId.value))
const isSaving = ref(false)
const isLoading = ref(false)
const isCatalogLoading = ref(false)
const pageErrorMessage = ref('')
const catalogErrorMessage = ref('')
const insertingStrategyId = ref('')
const moduleKeyword = ref('')
const tagDraft = ref('')
const isTagInputVisible = ref(false)
const activePlaceholderKey = ref('')
const isPlaceholderDialogOpen = ref(false)
const placeholderDraftType = ref('')
const placeholderDraftKey = ref('')
const placeholderDraftValue = ref('')
const currentStrategy = ref<StrategyDetailRecord | null>(null)
const strategyCatalog = ref<StrategyRecord[]>([])

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

const placeholderMatches = computed<MarkdownPlaceholderMatch[]>(() => scanMarkdownPlaceholderMatches(form.markdown))

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

const placeholderPreview = computed<StrategyPlaceholderPreviewItem[]>(() =>
  placeholderMatches.value.map((placeholder) => ({
    instanceId: buildPlaceholderInstanceId(placeholder),
    type: placeholder.type,
    key: placeholder.key,
    defaultValue: placeholder.defaultValue,
    displayDefaultValue: placeholder.displayDefaultValue,
    declaration: placeholder.declaration,
    start: placeholder.start,
    end: placeholder.end,
  })),
)

const activePlaceholderRecord = computed(() =>
  placeholderPreview.value.find((placeholder) => placeholder.instanceId === activePlaceholderKey.value) ?? null,
)

let editorView: EditorView | null = null
let isSyncingFromEditor = false

function createDefaultMarkdown() {
  return '\n\n\n\n\n\n'
}

function scanMarkdownPlaceholderMatches(contentMarkdown: string): MarkdownPlaceholderMatch[] {
  const matches = contentMarkdown.matchAll(/\{\{\s*([^:=\s{}"'][^:=\s{}"']*)\s*:\s*([^:=\s{}"'][^:=\s{}"']*)\s*=\s*("(?:[^"\\]|\\.)*"|-?\d+)\s*\}\}/g)
  const placeholders: MarkdownPlaceholderMatch[] = []

  for (const match of matches) {
    const [declaration, rawType, key, rawDefaultValue] = match
    const start = match.index ?? 0
    const end = start + declaration.length

    try {
      const defaultValue = JSON.parse(rawDefaultValue)

      if (typeof defaultValue !== 'string') {
        throw new Error('not string')
      }

      placeholders.push({
        type: rawType,
        key,
        defaultValue,
        displayDefaultValue: String(defaultValue),
        declaration,
        start,
        end,
      })
    } catch {
      if (!/^-?\d+$/.test(rawDefaultValue)) {
        continue
      }

      placeholders.push({
        type: rawType,
        key,
        defaultValue: rawDefaultValue,
        displayDefaultValue: rawDefaultValue,
        declaration,
        start,
        end,
      })
    }
  }

  return placeholders
}

function scanStrategyImportBlocks(contentMarkdown: string): StrategyImportBlockMatch[] {
  const matches = contentMarkdown.matchAll(
    /(<!--\s*cn-strategy-import:start source-id="([^"]+)"\s*-->|<!--\s*s:([a-zA-Z0-9_-]+)\s*-->)([\s\S]*?)(<!--\s*cn-strategy-import:end(?:\s+source-id="[^"]+")?\s*-->|<!--\s*\/s\s*-->)/g,
  )
  const blocks: StrategyImportBlockMatch[] = []

  for (const match of matches) {
    const [rawBlock, rawStartMarker, legacySourceId, compactSourceId, rawContent, rawEndMarker] = match
    const sourceId = legacySourceId || compactSourceId
    const start = match.index ?? 0
    const startMarkerEnd = start + rawStartMarker.length
    const endMarkerStart = start + rawBlock.lastIndexOf(rawEndMarker)
    const endMarkerEnd = endMarkerStart + rawEndMarker.length
    const contentStart = contentMarkdown[startMarkerEnd] === '\n' ? startMarkerEnd + 1 : startMarkerEnd
    const contentEnd = contentMarkdown[endMarkerStart - 1] === '\n' ? endMarkerStart - 1 : endMarkerStart
    const title = strategyCatalog.value.find((strategy) => strategy.id === sourceId)?.name ?? '整篇插入模块'

    blocks.push({
      sourceId,
      title,
      content: rawContent.trim(),
      start,
      end: start + rawBlock.length,
      startMarkerStart: start,
      startMarkerEnd,
      endMarkerStart,
      endMarkerEnd,
      contentStart,
      contentEnd,
    })
  }

  return blocks
}

class PlaceholderWidget extends WidgetType {
  private readonly placeholder: MarkdownPlaceholderMatch

  constructor(placeholder: MarkdownPlaceholderMatch) {
    super()
    this.placeholder = placeholder
  }

  eq(other: PlaceholderWidget) {
    return other.placeholder.declaration === this.placeholder.declaration
  }

  toDOM() {
    const token = document.createElement('button')
    token.type = 'button'
    token.className = 'strategy-reference-chip'
    token.dataset.placeholderKey = buildPlaceholderInstanceId(this.placeholder)

    const visual = resolvePlaceholderVisual(this.placeholder.type)
    token.style.setProperty('--strategy-placeholder-accent', visual.accent)
    token.style.setProperty('--strategy-placeholder-border', visual.border)
    token.style.setProperty('--strategy-placeholder-background', visual.background)

    const icon = document.createElement('span')
    icon.className = 'strategy-reference-chip__glyph'
    icon.textContent = resolvePlaceholderGlyph(this.placeholder.type)

    const label = document.createElement('strong')
    label.textContent = this.placeholder.key

    token.append(icon, label)
    return token
  }

  ignoreEvent() {
    return false
  }
}

function createStrategyDecorations(content: string) {
  const builder = new RangeSetBuilder<Decoration>()
  const importBlocks = scanStrategyImportBlocks(content)
  const lines: Array<{ start: number; end: number }> = []
  let currentLineStart = 0

  for (let index = 0; index < content.length; index += 1) {
    if (content[index] === '\n') {
      lines.push({ start: currentLineStart, end: index })
      currentLineStart = index + 1
    }
  }

  lines.push({ start: currentLineStart, end: content.length })

  const decorations: Array<{ from: number; to: number; decoration: Decoration }> = []

  for (const block of importBlocks) {
    const startMarkerLine = lines.find((line) => line.start <= block.startMarkerStart && line.end >= block.startMarkerStart)
    const endMarkerLine = lines.find((line) => line.start <= block.endMarkerStart && line.end >= block.endMarkerStart)

    if (startMarkerLine) {
      decorations.push({
        from: startMarkerLine.start,
        to: startMarkerLine.start,
        decoration: Decoration.line({
          attributes: {
            class: 'strategy-import-marker-line',
          },
        }),
      })
    }

    if (endMarkerLine) {
      decorations.push({
        from: endMarkerLine.start,
        to: endMarkerLine.start,
        decoration: Decoration.line({
          attributes: {
            class: 'strategy-import-marker-line',
          },
        }),
      })
    }

    const contentLines = lines.filter(
      (line) => line.start < block.contentEnd && line.end > block.contentStart,
    )

    contentLines.forEach((line, index) => {
      const classes = ['strategy-import-line']

      if (index === 0) {
        classes.push('strategy-import-line--first')
      }

      if (index === contentLines.length - 1) {
        classes.push('strategy-import-line--last')
      }

      decorations.push({
        from: line.start,
        to: line.start,
        decoration: Decoration.line({
          attributes: {
            class: classes.join(' '),
            ...(index === 0 ? { 'data-import-title': block.title } : {}),
          },
        }),
      })
    })
  }

  for (const match of scanMarkdownPlaceholderMatches(content)) {
    decorations.push({
      from: match.start,
      to: match.end,
      decoration: Decoration.replace({
        widget: new PlaceholderWidget(match),
        inclusive: false,
      }),
    })
  }

  decorations
    .sort((a, b) => a.from - b.from || a.to - b.to)
    .forEach(({ from, to, decoration }) => {
      builder.add(from, to, decoration)
    })

  return builder.finish()
}

function createEditorView() {
  if (!editorHostRef.value) {
    return
  }

  const decorationsField = StateField.define({
    create(state) {
      return createStrategyDecorations(state.doc.toString())
    },
    update(decorations, transaction) {
      if (!transaction.docChanged) {
        return decorations
      }

      return createStrategyDecorations(transaction.state.doc.toString())
    },
    provide: (field) => EditorView.decorations.from(field),
  })

  editorView = new EditorView({
    parent: editorHostRef.value,
    state: EditorState.create({
      doc: form.markdown,
      extensions: [
        history(),
        keymap.of([...defaultKeymap, ...historyKeymap, indentWithTab]),
        decorationsField,
        EditorView.lineWrapping,
        EditorView.updateListener.of((update) => {
          if (!update.docChanged) {
            return
          }

          isSyncingFromEditor = true
          form.markdown = update.state.doc.toString()
          isSyncingFromEditor = false
        }),
        EditorView.domEventHandlers({
          mousedown: (event) => {
            const target = (event.target as HTMLElement).closest<HTMLElement>('[data-placeholder-key]')

            if (!target) {
              return false
            }

            const key = target.dataset.placeholderKey

            if (!key) {
              return false
            }

            event.preventDefault()
            openPlaceholderDialog(key)
            return true
          },
        }),
      ],
    }),
  })
}

function applyStrategy(detail: StrategyDetailRecord | null) {
  currentStrategy.value = detail
  form.name = detail?.name ?? ''
  form.summary = detail?.summary ?? ''
  form.markdown = detail?.contentMarkdown?.length ? detail.contentMarkdown : createDefaultMarkdown()
  form.tagsText = detail?.tags.join(', ') ?? ''
  tagDraft.value = ''
  isTagInputVisible.value = false
  activePlaceholderKey.value = ''
  isPlaceholderDialogOpen.value = false
  placeholderDraftType.value = ''
  placeholderDraftKey.value = ''
  placeholderDraftValue.value = ''
}

function resizeSummaryTextarea() {
  const textarea = summaryRef.value

  if (!textarea) {
    return
  }

  textarea.style.height = 'auto'
  textarea.style.height = `${textarea.scrollHeight}px`
}

watch(() => form.summary, () => {
  void nextTick(resizeSummaryTextarea)
}, { flush: 'post' })

watch(() => form.markdown, (value) => {
  if (isSyncingFromEditor || !editorView) {
    return
  }

  const currentValue = editorView.state.doc.toString()

  if (currentValue === value) {
    return
  }

  editorView.dispatch({
    changes: {
      from: 0,
      to: currentValue.length,
      insert: value,
    },
  })
})

onMounted(() => {
  createEditorView()
})

onBeforeUnmount(() => {
  editorView?.destroy()
  editorView = null
})

function syncTags(tags: string[]) {
  form.tagsText = [...new Set(tags.map((tag) => tag.trim()).filter(Boolean))].join(', ')
}

function handleAddTag() {
  const tags = tagDraft.value
    .split(/[\n,，]/)
    .map((tag) => tag.trim())
    .filter(Boolean)

  if (tags.length === 0) {
    return
  }

  syncTags([...parsedTags.value, ...tags])
  tagDraft.value = ''
  isTagInputVisible.value = false
}

function handleRemoveTag(tagToRemove: string) {
  syncTags(parsedTags.value.filter((tag) => tag !== tagToRemove))
}

function openPlaceholderDialog(key: string) {
  const placeholder = placeholderPreview.value.find((item) => item.instanceId === key)

  if (!placeholder) {
    return
  }

  activePlaceholderKey.value = placeholder.instanceId
  placeholderDraftType.value = placeholder.type
  placeholderDraftKey.value = placeholder.key
  placeholderDraftValue.value = placeholder.displayDefaultValue
  isPlaceholderDialogOpen.value = true
}

function normalizePlaceholderSegment(value: string, fallback: string) {
  const normalized = value.trim()

  if (!normalized) {
    return fallback
  }

  return normalized.replace(/[\s{}=:"']/g, '')
}

function serializePlaceholderValue(value: string) {
  return JSON.stringify(value)
}

function updatePlaceholderRecord(placeholder: StrategyPlaceholderPreviewItem, nextType: string, nextKey: string, nextValue: string) {
  const normalizedType = normalizePlaceholderSegment(nextType, '对象')
  const normalizedKey = normalizePlaceholderSegment(nextKey, '字段')
  const nextDeclaration = `{{${normalizedType}:${normalizedKey}=${serializePlaceholderValue(nextValue)}}}`

  form.markdown = [
    form.markdown.slice(0, placeholder.start),
    nextDeclaration,
    form.markdown.slice(placeholder.end),
  ].join('')
  activePlaceholderKey.value = buildPlaceholderInstanceId({
    start: placeholder.start,
    end: placeholder.start + nextDeclaration.length,
  })
}

function closePlaceholderDialog() {
  isPlaceholderDialogOpen.value = false
}

function submitPlaceholderDialog() {
  if (!activePlaceholderRecord.value) {
    return
  }

  updatePlaceholderRecord(activePlaceholderRecord.value, placeholderDraftType.value, placeholderDraftKey.value, placeholderDraftValue.value)
  isPlaceholderDialogOpen.value = false
}

async function handleTagAddButtonClick() {
  if (isTagInputVisible.value) {
    handleAddTag()
    return
  }

  isTagInputVisible.value = true
  await nextTick()
  tagInputRef.value?.focus()
}

function handleTagInputBlur() {
  if (!tagDraft.value.trim()) {
    isTagInputVisible.value = false
  }
}

function handleCancelTagInput() {
  tagDraft.value = ''
  isTagInputVisible.value = false
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

watch(strategyId, () => {
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
  const editor = editorView

  if (!editor) {
    form.markdown = [form.markdown.trimEnd(), text].filter(Boolean).join('\n\n')
    return
  }

  const { from, to } = editor.state.selection.main
  const before = form.markdown.slice(0, from)
  const after = form.markdown.slice(to)
  const prefix = before && !before.endsWith('\n') ? '\n\n' : ''
  const suffix = after && !after.startsWith('\n') ? '\n\n' : ''
  const insertion = `${prefix}${text}${suffix}`

  editor.dispatch({
    changes: { from, to, insert: insertion },
    selection: { anchor: from + insertion.length },
  })
  editor.focus()
}

async function insertInlineTextAtCursor(text: string) {
  const editor = editorView

  if (!editor) {
    form.markdown = `${form.markdown}${text}`
    return
  }

  const { from, to } = editor.state.selection.main
  editor.dispatch({
    changes: { from, to, insert: text },
    selection: { anchor: from + text.length },
  })
  editor.focus()
}

function composeSnapshotBlock(strategy: StrategyDetailRecord) {
  return [
    `<!-- s:${strategy.id} -->`,
    strategy.contentMarkdown.trim(),
    '<!-- /s -->',
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

function resolveNextPlaceholderNumber() {
  let maxValue = 0

  for (const placeholder of placeholderPreview.value) {
    const matched = /^对象(\d+)$/.exec(placeholder.key.trim())

    if (!matched) {
      continue
    }

    maxValue = Math.max(maxValue, Number(matched[1]))
  }

  return maxValue + 1
}

async function handleInsertPlaceholder() {
  const nextNumber = resolveNextPlaceholderNumber()

  await insertInlineTextAtCursor(buildPlaceholderDeclaration({
    type: '对象',
    key: `对象${nextNumber}`,
    defaultValue: '',
  }))
}

function buildPlaceholderInstanceId(placeholder: Pick<MarkdownPlaceholderMatch, 'start' | 'end'>) {
  return `${placeholder.start}:${placeholder.end}`
}

const PLACEHOLDER_VISUALS = [
  { accent: '#8ff5ff', border: 'rgb(143 245 255 / 0.32)', background: 'rgb(143 245 255 / 0.10)' },
  { accent: '#c3f400', border: 'rgb(195 244 0 / 0.30)', background: 'rgb(195 244 0 / 0.10)' },
  { accent: '#ffb86b', border: 'rgb(255 184 107 / 0.30)', background: 'rgb(255 184 107 / 0.10)' },
  { accent: '#7ab8ff', border: 'rgb(122 184 255 / 0.30)', background: 'rgb(122 184 255 / 0.10)' },
  { accent: '#ff8cc6', border: 'rgb(255 140 198 / 0.30)', background: 'rgb(255 140 198 / 0.10)' },
  { accent: '#7ef0c9', border: 'rgb(126 240 201 / 0.30)', background: 'rgb(126 240 201 / 0.10)' },
] as const

function resolvePlaceholderVisual(type: string) {
  const normalizedType = type.trim() || '对象'
  let hash = 0

  for (const character of normalizedType) {
    hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
  }

  return PLACEHOLDER_VISUALS[Math.abs(hash) % PLACEHOLDER_VISUALS.length]
}

function resolvePlaceholderGlyph(type: string) {
  const normalized = type.trim()

  return (normalized[0] ?? 'O').toLocaleUpperCase('zh-CN')
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
          <span v-for="tag in parsedTags" :key="tag" class="strategy-editor-header__tag">
            <span class="material-symbols-outlined">sell</span>
            {{ tag }}
            <button type="button" class="strategy-editor-header__tag-remove" :aria-label="`删除标签 ${tag}`" @click="handleRemoveTag(tag)">
              <span class="material-symbols-outlined">close</span>
            </button>
          </span>
          <span v-if="parsedTags.length === 0" class="strategy-editor-header__tag strategy-editor-header__tag--empty">
            <span class="material-symbols-outlined">sell</span>
            未分类
          </span>
          <input
            v-if="isTagInputVisible"
            ref="tagInputRef"
            v-model="tagDraft"
            class="strategy-editor-header__tag-input"
            type="text"
            placeholder="输入标签"
            data-testid="strategy-editor-tags"
            @blur="handleTagInputBlur"
            @keydown.enter.prevent="handleAddTag"
            @keydown.esc.prevent="handleCancelTagInput"
          />
          <button type="button" class="strategy-editor-header__tag-add" @click="handleTagAddButtonClick">
            <span class="material-symbols-outlined">add</span>
          </button>
        </div>
        <div class="strategy-editor-header__divider" />
        <div class="strategy-editor-header__actions">
          <button
            type="button"
            class="strategy-editor-header__action strategy-editor-header__action--primary"
            data-testid="strategy-editor-save"
            :disabled="isSaving || !form.name.trim() || !form.markdown.trim()"
            @click="handleSave"
          >
            <span class="material-symbols-outlined">rocket_launch</span>
            <span>{{ isSaving ? '部署中…' : '部署策略' }}</span>
          </button>
        </div>
      </div>
    </header>

    <main class="strategy-editor-body">
      <aside class="strategy-modules">
        <div class="strategy-modules__header">
          <h2>
            <span class="material-symbols-outlined">extension</span>
            <span>模块池</span>
          </h2>
          <p>点击添加已有策略至主编辑区，插入后仅保留快照内容。</p>
          <label class="strategy-modules__search">
            <span class="material-symbols-outlined">search</span>
            <input v-model="moduleKeyword" type="text" placeholder="搜索模块..." />
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
              <span>插入标题</span>
            </button>
            <button type="button" @click="handleInsertPlaceholder">
              <span class="material-symbols-outlined">data_object</span>
              <span>对象引用</span>
            </button>
            <div class="strategy-canvas__toolbar-divider" />
            <button type="button" @click="handleReload">
              <span class="material-symbols-outlined">data_object</span>
              <span>重置数据</span>
            </button>
          </div>
          <span class="strategy-canvas__toolbar-status">{{ placeholderPreview.length }} 个对象引用 · Markdown</span>
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
            <div class="strategy-canvas__meta-row strategy-canvas__meta-row--summary">
              <span class="strategy-canvas__key">summary:</span>
              <textarea
                ref="summaryRef"
                v-model="form.summary"
                class="strategy-canvas__meta-textarea"
                rows="2"
                placeholder="摘要说明"
                data-testid="strategy-editor-summary"
                @input="resizeSummaryTextarea"
              />
            </div>
          </div>

          <div ref="editorHostRef" class="strategy-canvas__editor-shell" data-testid="strategy-editor-markdown" />
          <p v-if="pageErrorMessage" class="strategy-canvas__error">{{ pageErrorMessage }}</p>
        </div>
      </section>

      <aside class="strategy-objects">
        <div class="strategy-objects__header">
          <h2>
            <span class="material-symbols-outlined">data_object</span>
            <span>对象引用</span>
          </h2>
          <p>自动检测当前策略中的对象引用契约。</p>
        </div>

        <div class="strategy-objects__list">
          <button
            v-for="placeholder in placeholderPreview"
            :key="placeholder.instanceId"
            type="button"
            class="strategy-object"
            :class="{ 'strategy-object--active': activePlaceholderKey === placeholder.instanceId }"
            :style="{
              '--strategy-placeholder-accent': resolvePlaceholderVisual(placeholder.type).accent,
              '--strategy-placeholder-border': resolvePlaceholderVisual(placeholder.type).border,
              '--strategy-placeholder-background': resolvePlaceholderVisual(placeholder.type).background,
            }"
            @click="openPlaceholderDialog(placeholder.instanceId)"
          >
            <div class="strategy-object__icon">
              <span class="strategy-object__glyph">{{ resolvePlaceholderGlyph(placeholder.type) }}</span>
            </div>
            <div class="strategy-object__content">
              <h3>{{ placeholder.key }}</h3>
              <span>{{ placeholder.type }} · {{ placeholder.displayDefaultValue || '空字符串' }}</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check">chevron_right</span>
          </button>

          <div v-if="placeholderPreview.length === 0" class="strategy-object strategy-object--asset">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">data_object</span>
            </div>
            <div class="strategy-object__content">
              <h3>暂无占位符</h3>
              <span>可使用 {{ buildPlaceholderDeclaration({ type: '对象', key: '对象1', defaultValue: '' }) }}</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check strategy-object__check--muted">remove</span>
          </div>
        </div>
      </aside>
    </main>

    <div v-if="isPlaceholderDialogOpen && activePlaceholderRecord" class="strategy-dialog__backdrop" @click.self="closePlaceholderDialog">
      <div class="strategy-dialog">
        <div class="strategy-dialog__header">
          <div>
            <h3>{{ activePlaceholderRecord.key }}</h3>
            <p>{{ activePlaceholderRecord.type }} 对象引用</p>
          </div>
          <button type="button" class="strategy-dialog__close" @click="closePlaceholderDialog">
            <span class="material-symbols-outlined">close</span>
          </button>
        </div>

        <label class="strategy-dialog__field">
          <span>类型 / Type</span>
          <input
            v-model="placeholderDraftType"
            type="text"
            @keydown.enter.prevent="submitPlaceholderDialog"
          />
        </label>

        <label class="strategy-dialog__field">
          <span>名称 / Name</span>
          <input
            v-model="placeholderDraftKey"
            type="text"
            @keydown.enter.prevent="submitPlaceholderDialog"
          />
        </label>

        <label class="strategy-dialog__field">
          <span>值 / Value</span>
          <input
            v-model="placeholderDraftValue"
            type="text"
            @keydown.enter.prevent="submitPlaceholderDialog"
          />
        </label>

        <div class="strategy-dialog__footer">
          <button type="button" class="strategy-dialog__button strategy-dialog__button--ghost" @click="closePlaceholderDialog">
            取消
          </button>
          <button type="button" class="strategy-dialog__button strategy-dialog__button--primary" @click="submitPlaceholderDialog">
            保存修改
          </button>
        </div>
      </div>
    </div>
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
  display: grid;
  grid-template-columns: minmax(16rem, 34rem) minmax(22rem, 1fr) auto;
  gap: 1.25rem;
  align-items: center;
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
  min-width: 0;
}

.strategy-editor-header__right {
  min-width: 0;
  display: contents;
}

.strategy-editor-header__right > .strategy-editor-header__divider {
  display: none;
}

.strategy-editor-header__tags {
  min-width: 0;
  justify-content: flex-end;
  gap: 0.5rem;
  flex-wrap: wrap;
  overflow: visible;
}

.strategy-editor-header__actions {
  justify-content: flex-end;
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

.strategy-editor-header__left input {
  flex: 1;
  min-width: 0;
  border: 0;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-display);
  font-size: 1.18rem;
  font-weight: 700;
  outline: 0;
  padding: 0.25rem 0.5rem;
  margin-left: -0.5rem;
  border-radius: 0.25rem;
  transition: background-color var(--cn-transition);
}

.strategy-editor-header__left input:hover,
.strategy-editor-header__left input:focus {
  background: #201f1f;
}

.strategy-editor-header__tags > span,
.strategy-editor-header__tag-add {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  min-height: 1.55rem;
  padding: 0 0.7rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #262626;
  font-size: 0.72rem;
  font-weight: 500;
  white-space: nowrap;
}

.strategy-editor-header__tag {
  max-width: 12rem;
}

.strategy-editor-header__tags .material-symbols-outlined {
  padding: 0;
  border: 0;
  background: transparent;
  font-size: 0.9rem;
}

.strategy-editor-header__tags > span:first-of-type {
  color: #4aa2f9;
}

.strategy-editor-header__tags > span:nth-of-type(2) {
  color: #b7e500;
}

.strategy-editor-header__tag-add {
  width: 1.75rem;
  min-width: 1.75rem;
  height: 1.75rem;
  padding: 0;
  justify-content: center;
  border-radius: 999px;
  background: #1a1919;
  color: #adaaaa;
  cursor: pointer;
}

.strategy-editor-header__tag-add:hover:not(:disabled) {
  color: #8ff5ff;
  background: #262626;
}

.strategy-editor-header__tag-add .material-symbols-outlined {
  font-size: 0.95rem;
}

.strategy-editor-header__tag-add:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.strategy-editor-header__tag-remove {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1rem;
  height: 1rem;
  padding: 0;
  margin-left: 0.15rem;
  border: 0;
  border-radius: 999px;
  color: currentcolor;
  background: transparent;
  cursor: pointer;
  opacity: 0.6;
}

.strategy-editor-header__tag-remove:hover {
  opacity: 1;
  background: rgb(255 255 255 / 0.08);
}

.strategy-editor-header__tag-remove .material-symbols-outlined {
  font-size: 0.78rem;
}

.strategy-editor-header__tag-input {
  width: 6.5rem;
  min-width: 6.5rem;
  max-width: 6.5rem;
  flex: 0 0 6.5rem;
  min-height: 1.9rem;
  padding: 0.25rem 0.75rem;
  margin: 0;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 999px;
  color: #fff;
  background: rgb(32 31 31 / 0.45);
  font-family: var(--cn-font-body);
  font-size: 0.75rem;
  font-weight: 400;
  outline: 0;
}

.strategy-editor-header__tag-input::placeholder {
  color: #767575;
}

.strategy-editor-header__action {
  border: 0;
  padding: 0.55rem 1rem;
  border-radius: 0.25rem;
  color: #adaaaa;
  background: transparent;
  font-size: 0.875rem;
  font-weight: 500;
}

.strategy-editor-header__action:hover {
  background: #201f1f;
}

.strategy-editor-header__action--primary {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-width: 8.5rem;
  min-height: 2.25rem;
  padding: 0.45rem 1.1rem;
  justify-content: center;
  color: #005d63;
  background: #8ff5ff;
  font-size: 0.9rem;
  font-weight: 700;
  box-shadow: 0 0 16px rgb(143 245 255 / 0.16);
}

.strategy-editor-header__action--primary:hover {
  background: #00eefc;
}

.strategy-editor-header__action--primary .material-symbols-outlined {
  font-size: 1.15rem;
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
  font-size: 1.05rem;
  font-weight: 700;
}

.strategy-modules__header h2 .material-symbols-outlined {
  font-size: 1.25rem;
}

.strategy-objects__header h2 {
  color: #fff;
  font-size: 1rem;
}

.strategy-objects__header h2 .material-symbols-outlined {
  font-size: 1.25rem;
}

.strategy-modules__header p,
.strategy-objects__header p {
  margin: 0.35rem 0 0;
  color: #adaaaa;
  font-size: 0.74rem;
  line-height: 1.5;
}

.strategy-modules__alert {
  color: #ff716c !important;
}

.strategy-modules__search {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  height: 2.5rem;
  padding: 0 0.75rem;
  margin-top: 1rem;
  border: 0;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.25rem;
  background: #1a1919;
  color: #adaaaa;
}

.strategy-modules__search .material-symbols-outlined {
  font-size: 1.125rem;
}

.strategy-modules__search input {
  width: 100%;
  border: 0;
  color: #fff;
  background: transparent;
  font-size: 0.875rem;
  outline: 0;
}

.strategy-modules__list,
.strategy-objects__list {
  display: grid;
  gap: 1rem;
  padding: 1rem 1.5rem 1.5rem;
  overflow-y: auto;
  overflow-x: hidden;
}

.strategy-module,
.strategy-object {
  position: relative;
  display: grid;
  gap: 0.65rem;
  padding: 1rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
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
  border-radius: 0.25rem;
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
  color: #fff;
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
  gap: 0.45rem;
  align-items: center;
  color: #adaaaa;
}

.strategy-canvas__toolbar-left .material-symbols-outlined {
  font-size: 1.125rem;
}

.strategy-canvas__toolbar-left button {
  display: inline-flex;
  gap: 0.35rem;
  align-items: center;
  justify-content: center;
  height: 2rem;
  padding: 0 0.65rem;
  border: 0;
  border-radius: 0.25rem;
  color: inherit;
  background: transparent;
  font-size: 0.78rem;
  font-weight: 500;
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

.strategy-canvas__toolbar-status {
  color: #adaaaa;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.strategy-canvas__content {
  flex: 1;
  overflow-y: auto;
  padding: 2rem 3rem;
}

.strategy-canvas__content > * {
  width: 100%;
}

.strategy-canvas__frontmatter {
  padding: 1rem;
  margin-bottom: 1.5rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
  background: #0a0a0a;
  font-family: var(--cn-font-mono);
  font-size: 0.75rem;
}

.strategy-canvas__meta-row {
  margin-bottom: 0.5rem;
}

.strategy-canvas__meta-row--summary {
  display: flex;
  gap: 0.4rem;
  align-items: flex-start;
  margin-bottom: 0;
}

.strategy-canvas textarea.strategy-canvas__meta-textarea {
  flex: 1;
  width: auto;
  min-height: calc(0.75rem * 1.65 * 2);
  border: 0;
  color: #c5c9cb;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.75rem;
  line-height: 1.65;
  outline: 0;
  overflow: hidden;
  resize: none;
}

.strategy-canvas__key {
  color: #65afff;
}

.strategy-canvas__value {
  color: #c3f400;
}

.strategy-canvas__editor-shell {
  min-height: 18rem;
}

:deep(.strategy-reference-chip) {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  box-sizing: border-box;
  height: 1.22em;
  margin: 0 0.1em;
  padding: 0 0.4rem;
  border: 1px solid var(--strategy-placeholder-border);
  border-radius: 0.3rem;
  color: var(--strategy-placeholder-accent);
  background: var(--strategy-placeholder-background);
  font: inherit;
  font-size: 1em;
  font-weight: 700;
  letter-spacing: normal;
  line-height: 1.02;
  white-space: nowrap;
  vertical-align: 0.02em;
  transform: translateY(-0.08em);
}

:deep(.strategy-reference-chip strong) {
  color: currentcolor;
  font-size: inherit;
  font-weight: 700;
  letter-spacing: normal;
  line-height: 1;
}

:deep(.strategy-reference-chip__glyph) {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1em;
  height: 1em;
  flex: 0 0 1em;
  border-radius: 999px;
  border: 1px solid color-mix(in srgb, var(--strategy-placeholder-accent) 36%, transparent);
  color: var(--strategy-placeholder-accent);
  background: radial-gradient(circle at 50% 50%, rgb(8 18 19 / 0.92), rgb(6 11 12 / 0.98));
  box-shadow:
    inset 0 0 10px color-mix(in srgb, var(--strategy-placeholder-accent) 12%, transparent),
    0 0 14px color-mix(in srgb, var(--strategy-placeholder-accent) 28%, transparent);
  font-size: 0.68em;
  font-weight: 800;
  line-height: 1;
  text-shadow: 0 0 10px color-mix(in srgb, var(--strategy-placeholder-accent) 45%, transparent);
}

:deep(.strategy-reference-chip:hover) {
  box-shadow: 0 0 12px color-mix(in srgb, var(--strategy-placeholder-accent) 20%, transparent);
}

:deep(.cm-editor) {
  min-height: 18rem;
  color: #c5c9cb;
  background: transparent;
  font-family: var(--cn-font-mono);
  font-size: 0.875rem;
  line-height: 1.75;
}

:deep(.cm-focused) {
  outline: none;
}

:deep(.cm-scroller) {
  font-family: inherit;
  line-height: inherit;
}

:deep(.cm-content) {
  min-height: 18rem;
  padding: 0;
  caret-color: #8ff5ff;
}

:deep(.cm-line) {
  padding: 0;
}

:deep(.cm-selectionBackground),
:deep(.cm-content ::selection) {
  background: rgb(143 245 255 / 0.16) !important;
}

:deep(.cm-gutters) {
  display: none;
}

:deep(.strategy-import-marker-line) {
  height: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
  line-height: 0 !important;
  opacity: 0;
  pointer-events: none;
}

:deep(.strategy-import-marker-line .cm-line) {
  height: 0 !important;
  padding: 0 !important;
  overflow: hidden !important;
}

:deep(.strategy-import-line) {
  padding-right: 1.2rem !important;
  padding-left: 1.5rem !important;
  border-right: 1px solid rgb(143 245 255 / 0.22);
  border-left: 1px solid rgb(143 245 255 / 0.22);
  background: rgb(38 38 38 / 0.4);
}

:deep(.strategy-import-line--first) {
  position: relative;
  margin-top: 0.6rem;
  padding-top: 2.9rem !important;
  border-top: 1px solid rgb(143 245 255 / 0.22);
  border-radius: 0.65rem 0.65rem 0 0;
}

:deep(.strategy-import-line--first)::before {
  position: absolute;
  top: 0.95rem;
  left: 1.5rem;
  color: #8ff5ff;
  font-size: 0.8rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  content: attr(data-import-title);
}

:deep(.strategy-import-line--first)::after {
  position: absolute;
  top: 0.95rem;
  left: -1px;
  bottom: 0;
  width: 2px;
  content: '';
  background: linear-gradient(180deg, #8ff5ff, #00eefc);
}

:deep(.strategy-import-line--last) {
  padding-bottom: 0.9rem !important;
  margin-bottom: 0.6rem;
  border-bottom: 1px solid rgb(143 245 255 / 0.22);
  border-radius: 0 0 0.65rem 0.65rem;
}

.strategy-canvas__error {
  margin: 0;
  color: #ff716c;
  font-style: italic;
}

.strategy-objects {
  display: none;
  border-left: 1px solid rgb(72 72 71 / 0.1);
}

.strategy-objects__list {
  gap: 0.75rem;
  padding-top: 1rem;
}

.strategy-object {
  gap: 0.75rem;
  align-items: center;
  padding: 0.75rem;
  transition: background-color var(--cn-transition);
  width: 100%;
  min-width: 0;
  text-align: left;
  cursor: pointer;
  overflow: hidden;
}

.strategy-object:hover {
  background: #262626;
}

.strategy-object--active {
  border-color: var(--strategy-placeholder-border);
  background: color-mix(in srgb, var(--strategy-placeholder-background) 70%, #1a1919);
}

.strategy-object--asset .strategy-object__icon {
  color: #c3f400;
  background: rgb(195 244 0 / 0.12);
}

.strategy-object__content {
  flex: 1;
  min-width: 0;
  overflow: hidden;
}

.strategy-object__content h3 {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.strategy-object__content span {
  display: block;
  margin-top: 0.2rem;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #8d8d8d;
  font-size: 0.74rem;
  letter-spacing: normal;
  text-transform: none;
  line-height: 1.45;
}

.strategy-object__check {
  color: var(--strategy-placeholder-accent, #8ff5ff);
  font-size: 1rem;
}

.strategy-object__check--muted {
  color: #adaaaa;
}

.strategy-object__icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
  color: var(--strategy-placeholder-accent, #8ff5ff);
  background: var(--strategy-placeholder-background, rgb(143 245 255 / 0.1));
  box-shadow: inset 0 0 0 1px var(--strategy-placeholder-border, rgb(143 245 255 / 0.3));
}

.strategy-object__glyph {
  color: currentcolor;
  font-size: 0.9rem;
  font-weight: 800;
  line-height: 1;
}

.strategy-dialog__backdrop {
  position: fixed;
  inset: 0;
  display: grid;
  place-items: center;
  background: rgb(0 0 0 / 0.45);
  backdrop-filter: blur(6px);
  z-index: 40;
}

.strategy-dialog {
  width: min(28rem, calc(100vw - 2rem));
  padding: 1.25rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
  background: #131313;
  box-shadow: 0 24px 60px rgb(0 0 0 / 0.4);
}

.strategy-dialog__header {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.strategy-dialog__header h3 {
  margin: 0;
  font-size: 1rem;
  color: #fff;
}

.strategy-dialog__header p {
  margin: 0.3rem 0 0;
  color: #adaaaa;
  font-size: 0.78rem;
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
  background: transparent;
}

.strategy-dialog__close:hover {
  color: #fff;
  background: #201f1f;
}

.strategy-dialog__field {
  display: grid;
  gap: 0.45rem;
  margin-top: 0.85rem;
}

.strategy-dialog__field span {
  color: #adaaaa;
  font-size: 0.78rem;
}

.strategy-dialog__field input {
  width: 100%;
  min-height: 2.5rem;
  padding: 0 0.8rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
  color: #fff;
  background: #1a1919;
  font-size: 0.9rem;
  outline: 0;
}

.strategy-dialog__field input:focus {
  border-color: rgb(143 245 255 / 0.34);
}

.strategy-dialog__footer {
  display: flex;
  justify-content: flex-end;
  gap: 0.75rem;
  margin-top: 1.25rem;
}

.strategy-dialog__button {
  min-height: 2.4rem;
  padding: 0 1rem;
  border: 0;
  border-radius: 0.45rem;
  font-size: 0.85rem;
  font-weight: 600;
}

.strategy-dialog__button--ghost {
  color: #adaaaa;
  background: #201f1f;
}

.strategy-dialog__button--primary {
  color: #005d63;
  background: #8ff5ff;
}

@media (min-width: 1280px) {
  .strategy-editor-body {
    grid-template-columns: 20rem minmax(0, 1fr) 18rem;
  }

  .strategy-objects {
    display: flex;
    flex-direction: column;
  }

  .strategy-canvas__content {
    padding: 2.25rem 3.5rem;
  }
}

@media (max-width: 1100px) {
  .strategy-editor-header {
    grid-template-columns: minmax(0, 1fr);
    padding: 0.75rem 1rem;
  }

  .strategy-editor-header__right {
    display: flex;
  }

  .strategy-editor-header__actions {
    justify-content: flex-start;
  }
}
</style>
