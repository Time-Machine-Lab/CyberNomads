<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAssetById, saveAsset } from '@/entities/asset/api/asset-service'
import type { AssetAttachmentRecord } from '@/entities/asset/model/types'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()

const assetId = computed(() => String(route.params.assetId ?? ''))
const isEditMode = computed(() => Boolean(assetId.value))
const isLoading = ref(false)
const isSaving = ref(false)
const notFound = ref(false)
const loadError = ref('')
const saveError = ref('')
const validationMessage = ref('')

const form = reactive({
  name: '',
  platform: 'Bilibili',
  summary: '',
  markdown: '',
  status: 'draft' as 'draft' | 'ready',
  category: '本地草稿',
  targetLabels: ['硬件发烧友', 'AI 开发者'],
})

const attachments = ref<AssetAttachmentRecord[]>([])
const lineCount = computed(() => Math.max(form.markdown.split('\n').length, 10))
const wordCount = computed(() => form.markdown.trim().split(/\s+/).filter(Boolean).length)
const characterCount = computed(() => form.markdown.length)

watch(
  [assetId, mockScenarioId],
  async () => {
    loadError.value = ''
    saveError.value = ''
    validationMessage.value = ''
    notFound.value = false

    if (!isEditMode.value) {
      form.name = '面向B站科技粉的产品推介'
      form.summary = ''
      form.markdown = `# 下一代编排器来了

大家好，快速分享一下为什么新的神经架构师 v1.0 将从根本上改变我们管理并行数据流的方式。 

如果你一直被手动提示工程搞得焦头烂额，你需要看看这个。

## 关键升级
* **量子解析：** 处理上下文数组的速度提高 40 倍。
* **自动调优节点：** 它会从你的语法失败中学习。
* **全息 CLI：** 可视化图表叠加让调试变得更轻松。

在下面留下你的想法。我们准备好全面编排了吗？`
      form.status = 'draft'
      form.category = '本地草稿'
      attachments.value = [
        { id: 'local-asset-1', name: 'arch_specs_v2.pdf', kind: 'pdf' },
        { id: 'local-asset-2', name: 'ui_mockup_dark.png', kind: 'image' },
      ]
      return
    }

    isLoading.value = true

    try {
      const asset = await getAssetById(assetId.value)

      if (!asset) {
        notFound.value = true
        return
      }

      form.name = asset.name
      form.platform = asset.platform
      form.summary = asset.summary
      form.markdown = asset.markdown
      form.status = asset.status
      form.category = asset.category
      form.targetLabels = asset.targetLabels
      attachments.value = asset.attachments
    } catch {
      loadError.value = '产品资产详情加载失败，请确认产品服务可用后重试。'
    } finally {
      isLoading.value = false
    }
  },
  { immediate: true },
)

function resolveAttachmentIcon(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'movie'
  if (kind === 'image') return 'image'
  if (kind === 'link') return 'link'
  return 'picture_as_pdf'
}

async function handleSave(status: 'draft' | 'ready') {
  validationMessage.value = ''
  saveError.value = ''

  if (!form.name.trim()) {
    validationMessage.value = '请先填写资产标题。'
    return
  }

  if (!form.markdown.trim()) {
    validationMessage.value = '请先填写 Markdown 产品内容。'
    return
  }

  isSaving.value = true

  try {
    await saveAsset({
      id: isEditMode.value ? assetId.value : undefined,
      name: form.name,
      platform: form.platform,
      summary: form.summary,
      markdown: form.markdown,
      status,
      category: form.category,
      targetLabels: form.targetLabels,
      tags: [form.category],
    })

    await router.push('/assets')
  } catch {
    saveError.value = '产品资产保存失败，请检查后端连接后重试。当前编辑内容已保留。'
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="asset-editor-page">
    <main class="asset-editor-main">
      <section v-if="isLoading" class="asset-editor-state" data-testid="asset-editor-loading-state">
        <span class="material-symbols-outlined">sync</span>
        <h1>正在加载产品资产</h1>
        <p>正在读取完整 Markdown 上下文。</p>
      </section>

      <section v-else-if="notFound" class="asset-editor-state" data-testid="asset-editor-not-found-state">
        <span class="material-symbols-outlined">search_off</span>
        <h1>未找到产品资产</h1>
        <p>该产品可能不存在，或当前后端环境尚未同步这条记录。</p>
        <RouterLink to="/assets">返回资产列表</RouterLink>
      </section>

      <div v-else class="asset-editor-canvas">
        <section
          v-if="loadError || validationMessage || saveError"
          class="asset-editor-alert"
          data-testid="asset-editor-alert"
        >
          <span class="material-symbols-outlined">error</span>
          <span>{{ loadError || validationMessage || saveError }}</span>
        </section>

        <section class="asset-editor-meta">
          <div class="asset-editor-meta__title">
            <div class="asset-editor-meta__row">
              <label>资产标题</label>
              <div class="asset-editor-meta__status">
                <span class="asset-editor-meta__status-dot" />
                <span>{{ form.status === 'draft' ? '本地草稿' : '已就绪' }}</span>
              </div>
            </div>
            <input v-model="form.name" required type="text" placeholder="在此输入资产标题..." />
          </div>

          <div class="asset-editor-meta__divider" />

          <div class="asset-editor-meta__targets">
            <label>目标节点 (标签)</label>
            <div class="asset-editor-meta__chips">
              <button
                v-for="(label, index) in form.targetLabels"
                :key="label"
                type="button"
                :class="{ 'asset-editor-meta__chip--primary': index === 0 }"
              >
                <span>{{ label }}</span>
                <span class="material-symbols-outlined">close</span>
              </button>
              <button type="button" class="asset-editor-meta__chip asset-editor-meta__chip--add">
                <span class="material-symbols-outlined">add</span>
                <span>添加</span>
              </button>
            </div>
          </div>
        </section>

        <section class="asset-editor-workspace">
          <div class="asset-editor-editor">
            <div class="asset-editor-toolbar">
              <div class="asset-editor-toolbar__group">
                <button type="button" title="Bold">
                  <span class="material-symbols-outlined">format_bold</span>
                </button>
                <button type="button" title="Italic">
                  <span class="material-symbols-outlined">format_italic</span>
                </button>
                <div class="asset-editor-toolbar__separator" />
                <button type="button" title="Code Block">
                  <span class="material-symbols-outlined">code</span>
                </button>
                <button type="button" title="Insert Link">
                  <span class="material-symbols-outlined">link</span>
                </button>
                <button type="button" title="Insert AI Variable">
                  <span class="material-symbols-outlined">data_object</span>
                </button>
              </div>
              <span>Markdown</span>
            </div>

            <div class="asset-editor-body">
              <div class="asset-editor-body__lines">
                <span v-for="line in lineCount" :key="line">{{ line }}</span>
              </div>
              <textarea v-model="form.markdown" placeholder="在此处初始化传输序列..." />
            </div>

            <div class="asset-editor-statusbar">
              <span>支持 Markdown</span>
              <span>字数: {{ wordCount }} | 字符: {{ characterCount }}</span>
            </div>
          </div>

          <aside class="asset-editor-side">
            <section class="asset-editor-side__panel">
              <header class="asset-editor-side__panel-header">
                <div>
                  <h3>
                    <span class="material-symbols-outlined">folder_open</span>
                    <span>本地资源</span>
                  </h3>
                </div>
                <span class="asset-editor-side__count">{{ attachments.length }} 个文件</span>
              </header>

              <div class="asset-editor-side__dropzone">
                <div class="asset-editor-side__dropzone-icon">
                  <span class="material-symbols-outlined">cloud_upload</span>
                </div>
                <span><strong>点击注入</strong> 或拖拽文件</span>
              </div>

              <div class="asset-editor-files">
                <div v-for="file in attachments" :key="file.id" class="asset-editor-file">
                  <div class="asset-editor-file__info">
                    <span class="material-symbols-outlined">{{ resolveAttachmentIcon(file.kind) }}</span>
                    <span>{{ file.name }}</span>
                  </div>
                  <button type="button" aria-label="删除文件">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </section>
          </aside>
        </section>

        <footer class="asset-editor-footer">
          <button type="button" class="asset-editor-footer__button">
            <span class="material-symbols-outlined">visibility</span>
            <span>生成预览</span>
          </button>
          <button
            type="button"
            class="asset-editor-footer__button asset-editor-footer__button--primary"
            :disabled="isSaving"
            @click="handleSave('ready')"
          >
            <span class="material-symbols-outlined">save</span>
            <span>{{ isSaving ? '提交中…' : '提交资产' }}</span>
          </button>
        </footer>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.asset-editor-page {
  min-height: 100vh;
  color: #fff;
}

.asset-editor-main {
  width: 100%;
  padding: 1.5rem;
}

.asset-editor-canvas {
  display: grid;
  gap: 1.5rem;
  width: min(100%, 90rem);
  margin: 0 auto;
}

.asset-editor-state,
.asset-editor-alert {
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: var(--cn-shadow-ambient);
}

.asset-editor-state {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  width: min(100%, 48rem);
  min-height: 18rem;
  margin: 4rem auto 0;
  padding: 3rem 1.5rem;
  text-align: center;
}

.asset-editor-state .material-symbols-outlined {
  color: #8ff5ff;
  font-size: 2.3rem;
}

.asset-editor-state h1 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(1.8rem, 3vw, 2.6rem);
  letter-spacing: -0.04em;
}

.asset-editor-state p {
  max-width: 30rem;
  margin: 0;
  color: #adaaaa;
  line-height: 1.7;
}

.asset-editor-state a {
  display: inline-flex;
  align-items: center;
  min-height: 2.5rem;
  margin-top: 0.35rem;
  padding: 0 1rem;
  border-radius: 0.5rem;
  color: #041316;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  font-family: var(--cn-font-body);
  font-weight: 700;
}

.asset-editor-alert {
  display: flex;
  gap: 0.6rem;
  align-items: center;
  padding: 0.85rem 1rem;
  color: #ffb5b2;
  background: rgb(255 113 108 / 0.08);
}

.asset-editor-alert .material-symbols-outlined {
  color: #ff716c;
  font-size: 1.2rem;
}

.asset-editor-meta {
  display: flex;
  flex-direction: column;
  gap: 1.25rem;
  padding: 0 0.25rem 0.5rem;
}

.asset-editor-meta__title,
.asset-editor-meta__targets {
  display: grid;
  gap: 0.5rem;
}

.asset-editor-meta__row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin-bottom: 0.05rem;
}

.asset-editor-meta__row label,
.asset-editor-meta__targets label {
  color: #adaaaa;
  font-size: 0.72rem;
  font-weight: 500;
  letter-spacing: 0.14em;
  text-transform: uppercase;
}

.asset-editor-meta__status {
  display: inline-flex;
  gap: 0.4rem;
  align-items: center;
  padding: 0.3rem 0.55rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #131313;
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.asset-editor-meta__status-dot {
  width: 0.38rem;
  height: 0.38rem;
  border-radius: 999px;
  background: #c3f400;
  box-shadow: 0 0 8px rgb(183 229 0 / 0.5);
}

.asset-editor-meta__title input {
  width: 100%;
  border: 0;
  padding: 0;
  color: #fff;
  background: transparent;
  font-family: var(--cn-font-display);
  font-size: clamp(2.1rem, 3vw, 3rem);
  font-weight: 700;
  line-height: 1.1;
  outline: 0;
}

.asset-editor-meta__divider {
  display: none;
  width: 1px;
  background: rgb(72 72 71 / 0.2);
}

.asset-editor-meta__chips {
  display: flex;
  flex-wrap: wrap;
  gap: 0.45rem;
}

.asset-editor-meta__chips button {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  border: 1px solid rgb(72 72 71 / 0.22);
  padding: 0.32rem 0.62rem;
  border-radius: 0.3rem;
  color: #adaaaa;
  background: #000;
  font-family: var(--cn-font-body);
  font-size: 0.72rem;
  font-weight: 500;
}

.asset-editor-meta__chip--primary {
  color: #8ff5ff !important;
  border-color: rgb(143 245 255 / 0.25) !important;
  background: rgb(143 245 255 / 0.05) !important;
}

.asset-editor-meta__chip--add {
  border-style: dashed !important;
  color: #7d7b7b !important;
}

.asset-editor-workspace {
  display: grid;
  gap: 1.5rem;
  min-height: 0;
  align-items: stretch;
}

.asset-editor-editor {
  display: flex;
  flex-direction: column;
  min-height: 42rem;
  height: 100%;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
  box-shadow: 0 8px 32px rgb(0 0 0 / 0.3);
}

.asset-editor-toolbar {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.75rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: rgb(19 19 19 / 0.45);
}

.asset-editor-toolbar__group {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  padding: 0.2rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.5rem;
  background: #000;
}

.asset-editor-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 0.3rem;
  color: #adaaaa;
  background: transparent;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.asset-editor-toolbar button:hover {
  color: #8ff5ff;
  background: #1a1919;
}

.asset-editor-toolbar__separator {
  width: 1px;
  height: 1rem;
  background: rgb(72 72 71 / 0.3);
}

.asset-editor-toolbar > span {
  color: #767575;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.asset-editor-body {
  display: grid;
  grid-template-columns: 3rem minmax(0, 1fr);
  flex: 1;
  min-height: 0;
  background: #0e0e0e;
}

.asset-editor-body__lines {
  display: flex;
  flex-direction: column;
  gap: 0.55rem;
  align-items: center;
  padding: 1rem 0;
  border-right: 1px solid rgb(72 72 71 / 0.12);
  background: #000;
  color: rgb(118 117 117 / 0.5);
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.asset-editor-body textarea,
.asset-editor-side__summary {
  width: 100%;
  border: 0;
  color: #adaaaa;
  background: transparent;
  outline: 0;
  resize: none;
}

.asset-editor-body textarea {
  padding: 1rem;
  font-family: var(--cn-font-mono);
  font-size: 0.88rem;
  line-height: 1.8;
}

.asset-editor-statusbar {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  min-height: 2rem;
  padding: 0 1rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
  background: #000;
  color: #767575;
  font-family: var(--cn-font-mono);
  font-size: 0.72rem;
}

.asset-editor-side {
  display: flex;
  flex-direction: column;
  overflow: hidden;
  padding-right: 0.5rem;
  padding-bottom: 0.5rem;
  min-height: 42rem;
}

.asset-editor-side__panel {
  display: grid;
  gap: 1rem;
  height: 100%;
  padding: 1.25rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 1rem;
  background: #1a1919;
}

.asset-editor-side__panel-header {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
  justify-content: space-between;
}

.asset-editor-side__panel-header h3 {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  font-weight: 500;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.asset-editor-side__panel-header h3 .material-symbols-outlined {
  color: #65afff;
  font-size: 1rem;
}

.asset-editor-side__count {
  display: inline-flex;
  align-items: center;
  min-height: 1.6rem;
  padding: 0 0.55rem;
  border-radius: 0.45rem;
  color: #767575;
  background: #000;
  font-size: 0.72rem;
}

.asset-editor-side__dropzone {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  padding: 1.5rem;
  border: 2px dashed rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
  text-align: center;
  background: rgb(19 19 19 / 0.5);
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition);
  cursor: pointer;
}

.asset-editor-side__dropzone:hover {
  border-color: rgb(143 245 255 / 0.4);
  background: #131313;
}

.asset-editor-side__dropzone-icon {
  display: grid;
  place-items: center;
  width: 2.5rem;
  height: 2.5rem;
  border: 0;
  border-radius: 999px;
  color: #767575;
  background: #1a1919;
}

.asset-editor-side__dropzone span:last-child {
  color: #adaaaa;
  font-size: 0.76rem;
  text-align: center;
}

.asset-editor-side__dropzone strong {
  color: #8ff5ff;
  font-weight: 600;
}

.asset-editor-files {
  display: grid;
  gap: 0.5rem;
  margin-top: 0.25rem;
  overflow-y: auto;
}

.asset-editor-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.55rem 0.7rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.5rem;
  background: #000;
  transition: border-color var(--cn-transition);
}

.asset-editor-file:hover {
  border-color: rgb(72 72 71 / 0.3);
}

.asset-editor-file__info {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  overflow: hidden;
  color: #adaaaa;
  font-size: 0.82rem;
}

.asset-editor-file__info .material-symbols-outlined {
  font-size: 1.1rem;
}

.asset-editor-file:nth-child(1) .asset-editor-file__info .material-symbols-outlined {
  color: #4aa2f9;
}

.asset-editor-file:nth-child(2) .asset-editor-file__info .material-symbols-outlined {
  color: #b7e500;
}

.asset-editor-file__info span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
  color: #fff;
  font-size: 0.76rem;
}

.asset-editor-file button {
  border: 0;
  opacity: 0;
  color: #767575;
  background: transparent;
  transition:
    opacity var(--cn-transition),
    color var(--cn-transition);
}

.asset-editor-file:hover button {
  opacity: 1;
  color: #ff716c;
}

.asset-editor-footer {
  display: flex;
  flex-wrap: wrap;
  align-items: center;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 0.25rem;
}

.asset-editor-footer__button {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.72rem 1.25rem;
  border-radius: 0.5rem;
  color: #adaaaa;
  background: transparent;
  font-family: var(--cn-font-body);
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    border-color var(--cn-transition),
    background-color var(--cn-transition),
    color var(--cn-transition);
}

.asset-editor-footer__button:hover {
  color: #fff;
  background: #201f1f;
}

.asset-editor-footer__button--primary {
  color: #041316;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  border-color: transparent;
  font-weight: 600;
}

.asset-editor-footer__button--primary:hover {
  color: #041316;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
}

@media (min-width: 1024px) {
  .asset-editor-meta {
    flex-direction: row;
    align-items: flex-end;
  }

  .asset-editor-meta__title {
    flex: 1;
  }

  .asset-editor-meta__divider {
    display: block;
    height: 3rem;
    margin-bottom: 0.25rem;
  }

  .asset-editor-meta__targets {
    min-width: 22rem;
  }

  .asset-editor-workspace {
    grid-template-columns: minmax(0, 1fr) 20rem;
    align-items: start;
    min-height: 0;
  }
}

@media (max-width: 900px) {
  .asset-editor-main {
    padding: 1rem;
  }

  .asset-editor-workspace {
    grid-template-columns: 1fr;
  }

  .asset-editor-side {
    padding-right: 0;
  }

  .asset-editor-footer {
    justify-content: stretch;
  }

  .asset-editor-footer__button {
    flex: 1 1 100%;
  }
}
</style>
