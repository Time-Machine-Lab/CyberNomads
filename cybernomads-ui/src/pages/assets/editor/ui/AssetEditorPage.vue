<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getAssetById, saveAsset } from '@/entities/asset/api/asset-service'
import type { AssetAttachmentRecord } from '@/entities/asset/model/types'
import cybernomadsMarkUrl from '@/shared/assets/branding/cybernomads-mark.svg'
import { referenceNeuralOperatorAvatarUrl } from '@/shared/config/reference-ui'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()

const assetId = computed(() => String(route.params.assetId ?? ''))
const isEditMode = computed(() => Boolean(assetId.value))
const isSaving = ref(false)

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

watch(
  [assetId, mockScenarioId],
  async () => {
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

    const asset = await getAssetById(assetId.value)
    if (!asset) return

    form.name = asset.name
    form.platform = asset.platform
    form.summary = asset.summary
    form.markdown = asset.markdown
    form.status = asset.status
    form.category = asset.category
    form.targetLabels = asset.targetLabels
    attachments.value = asset.attachments
  },
  { immediate: true },
)

function resolveAttachmentIcon(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'movie'
  if (kind === 'image') return 'image'
  if (kind === 'link') return 'link'
  return 'description'
}

async function handleSave(status: 'draft' | 'ready') {
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
  } finally {
    isSaving.value = false
  }
}
</script>

<template>
  <section class="asset-editor-page">
    <aside class="asset-editor-sidebar">
      <div class="asset-editor-sidebar__brand">
        <img :src="cybernomadsMarkUrl" alt="CyberNomads" />
        <div>
          <h1>CyberNomads</h1>
          <p>神经架构师 v1.0</p>
        </div>
      </div>

      <button type="button" class="asset-editor-sidebar__cta">
        <span class="material-symbols-outlined">add</span>
        <span>新建活动</span>
      </button>

      <nav class="asset-editor-sidebar__nav">
        <a class="asset-editor-sidebar__link" href="#">
          <span class="material-symbols-outlined">dashboard</span>
          <span>仪表盘</span>
        </a>
        <RouterLink class="asset-editor-sidebar__link asset-editor-sidebar__link--active" to="/assets">
          <span class="material-symbols-outlined fill">description</span>
          <span>资产</span>
        </RouterLink>
        <RouterLink class="asset-editor-sidebar__link" to="/strategies">
          <span class="material-symbols-outlined">auto_awesome</span>
          <span>策略</span>
        </RouterLink>
        <RouterLink class="asset-editor-sidebar__link" to="/workspaces">
          <span class="material-symbols-outlined">hub</span>
          <span>工作区</span>
        </RouterLink>
      </nav>

      <div class="asset-editor-sidebar__footer">
        <RouterLink class="asset-editor-sidebar__link" to="/agents/openclaw">
          <span class="material-symbols-outlined">settings</span>
          <span>设置</span>
        </RouterLink>
        <a class="asset-editor-sidebar__link" href="#">
          <span class="material-symbols-outlined">contact_support</span>
          <span>支持</span>
        </a>
      </div>
    </aside>

    <div class="asset-editor-main">
      <header class="asset-editor-topbar">
        <label class="asset-editor-topbar__search">
          <span class="material-symbols-outlined">search</span>
          <input type="text" placeholder="搜索参数、资产或日志..." />
        </label>

        <div class="asset-editor-topbar__brand">CyberNomads</div>

        <div class="asset-editor-topbar__actions">
          <button type="button">
            <span class="material-symbols-outlined">notifications</span>
          </button>
          <button type="button">
            <span class="material-symbols-outlined">grid_view</span>
          </button>
          <button type="button">
            <span class="material-symbols-outlined">history</span>
          </button>
          <img :src="referenceNeuralOperatorAvatarUrl" alt="Neural Operator" />
        </div>
      </header>

      <main class="asset-editor-canvas">
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
                <button type="button">
                  <span class="material-symbols-outlined">format_bold</span>
                </button>
                <button type="button">
                  <span class="material-symbols-outlined">format_italic</span>
                </button>
                <div class="asset-editor-toolbar__separator" />
                <button type="button">
                  <span class="material-symbols-outlined">code</span>
                </button>
                <button type="button">
                  <span class="material-symbols-outlined">link</span>
                </button>
                <button type="button">
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
          </div>

          <aside class="asset-editor-side">
            <section class="asset-editor-side__panel">
              <header class="asset-editor-side__panel-header">
                <div>
                  <h3>本地资源</h3>
                  <p>支持拖拽文档、图片、视频与链接。</p>
                </div>
                <button type="button">
                  <span class="material-symbols-outlined">add</span>
                </button>
              </header>

              <div class="asset-editor-side__dropzone">
                <div class="asset-editor-side__dropzone-icon">
                  <span class="material-symbols-outlined">upload_file</span>
                </div>
                <span>拖拽资源到这里或点击上传</span>
              </div>

              <div class="asset-editor-files">
                <div
                  v-for="file in attachments"
                  :key="file.id"
                  class="asset-editor-file"
                >
                  <div class="asset-editor-file__info">
                    <span class="material-symbols-outlined">{{ resolveAttachmentIcon(file.kind) }}</span>
                    <span>{{ file.name }}</span>
                  </div>
                  <button type="button">
                    <span class="material-symbols-outlined">delete</span>
                  </button>
                </div>
              </div>
            </section>

            <section class="asset-editor-side__panel">
              <header class="asset-editor-side__panel-header">
                <div>
                  <h3>摘要说明</h3>
                  <p>补充资产用途、场景和目标说明。</p>
                </div>
              </header>

              <textarea
                v-model="form.summary"
                class="asset-editor-side__summary"
                rows="6"
                placeholder="在此填写资产摘要"
              />
            </section>
          </aside>
        </section>

        <footer class="asset-editor-footer">
          <button type="button" class="asset-editor-footer__button">
            <span class="material-symbols-outlined">visibility</span>
            <span>生成预览</span>
          </button>
          <button type="button" class="asset-editor-footer__button" :disabled="isSaving" @click="handleSave('draft')">
            <span class="material-symbols-outlined">draft</span>
            <span>保存草稿</span>
          </button>
          <button
            type="button"
            class="asset-editor-footer__button asset-editor-footer__button--primary"
            :disabled="isSaving || !form.name.trim()"
            @click="handleSave('ready')"
          >
            <span class="material-symbols-outlined">save</span>
            <span>{{ isSaving ? '提交中…' : '提交资产' }}</span>
          </button>
        </footer>
      </main>
    </div>
  </section>
</template>

<style scoped lang="scss">
.asset-editor-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.asset-editor-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 30;
  display: none;
  flex-direction: column;
  width: 16rem;
  padding: 1.5rem 1rem;
  background: #131313;
  box-shadow: 4px 0 24px rgb(0 0 0 / 0.5);
}

.asset-editor-sidebar__brand {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  padding: 0 0.5rem;
  margin-bottom: 2rem;
}

.asset-editor-sidebar__brand img {
  width: 2.5rem;
  height: 2.5rem;
  border-radius: 0.75rem;
}

.asset-editor-sidebar__brand h1,
.asset-editor-sidebar__brand p {
  margin: 0;
}

.asset-editor-sidebar__brand h1 {
  color: #8ff5ff;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.asset-editor-sidebar__brand p {
  color: #adaaaa;
  font-size: 0.76rem;
}

.asset-editor-sidebar__cta {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(143 245 255 / 0.3);
  padding: 0.85rem 1rem;
  margin: 0 0.5rem 1.75rem;
  border-radius: 0.75rem;
  color: #8ff5ff;
  background: rgb(143 245 255 / 0.08);
}

.asset-editor-sidebar__nav,
.asset-editor-sidebar__footer {
  display: grid;
  gap: 0.35rem;
}

.asset-editor-sidebar__nav {
  flex: 1;
}

.asset-editor-sidebar__link {
  display: flex;
  gap: 0.8rem;
  align-items: center;
  padding: 0.85rem 1rem;
  border-radius: 0.75rem;
  color: #adaaaa;
  font-family: var(--cn-font-display);
  font-size: 0.9rem;
  transition: background-color 180ms ease, color 180ms ease;
}

.asset-editor-sidebar__link:hover {
  color: #8ff5ff;
  background: #1a1919;
}

.asset-editor-sidebar__link--active {
  color: #8ff5ff;
  font-weight: 600;
  background: #1a1919;
  border-right: 2px solid #8ff5ff;
}

.asset-editor-main {
  flex: 1;
  min-width: 0;
}

.asset-editor-topbar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 20;
  display: none;
  align-items: center;
  justify-content: space-between;
  width: calc(100% - 16rem);
  height: 4rem;
  padding: 0 2rem;
  background: rgb(14 14 14 / 0.8);
  backdrop-filter: blur(20px);
}

.asset-editor-topbar__search {
  position: relative;
  display: flex;
  gap: 0.55rem;
  align-items: center;
  width: 100%;
  max-width: 22rem;
  padding: 0.65rem 1rem;
  border-radius: 999px;
  background: #131313;
  color: #adaaaa;
}

.asset-editor-topbar__search input {
  width: 100%;
  border: 0;
  color: #fff;
  background: transparent;
  outline: 0;
}

.asset-editor-topbar__brand {
  color: #8ff5ff;
  font-family: var(--cn-font-display);
  font-size: 1rem;
  font-weight: 700;
  letter-spacing: 0.08em;
}

.asset-editor-topbar__actions {
  display: flex;
  gap: 0.9rem;
  align-items: center;
  color: #adaaaa;
}

.asset-editor-topbar__actions button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  border: 0;
  color: inherit;
  background: transparent;
}

.asset-editor-topbar__actions button:hover {
  color: #8ff5ff;
}

.asset-editor-topbar__actions img {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(72 72 71 / 0.3);
  border-radius: 999px;
}

.asset-editor-canvas {
  display: grid;
  gap: 1.5rem;
  padding: 1.5rem;
}

.asset-editor-meta {
  display: flex;
  flex-direction: column;
  gap: 1rem;
  padding-bottom: 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.12);
}

.asset-editor-meta__title,
.asset-editor-meta__targets {
  display: grid;
  gap: 0.6rem;
}

.asset-editor-meta__row {
  display: flex;
  gap: 0.75rem;
  align-items: center;
}

.asset-editor-meta__row label,
.asset-editor-meta__targets label {
  color: #adaaaa;
  font-size: 0.72rem;
  font-weight: 600;
  letter-spacing: 0.16em;
  text-transform: uppercase;
}

.asset-editor-meta__status {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  padding: 0.35rem 0.65rem;
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
  font-size: clamp(2rem, 4vw, 2.9rem);
  font-weight: 700;
  line-height: 1.05;
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
  gap: 0.5rem;
}

.asset-editor-meta__chips button {
  display: inline-flex;
  gap: 0.3rem;
  align-items: center;
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.45rem 0.75rem;
  border-radius: 0.5rem;
  color: #adaaaa;
  background: #000;
  font-size: 0.78rem;
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
}

.asset-editor-editor {
  display: flex;
  flex-direction: column;
  min-height: 34rem;
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
  padding: 0.9rem 1rem;
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
  background: rgb(19 19 19 / 0.45);
}

.asset-editor-toolbar__group {
  display: flex;
  gap: 0.2rem;
  align-items: center;
  padding: 0.25rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.75rem;
  background: #000;
}

.asset-editor-toolbar button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 0;
  border-radius: 0.5rem;
  color: #adaaaa;
  background: transparent;
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

.asset-editor-toolbar span:last-child {
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
  font-size: 0.92rem;
  line-height: 1.85;
}

.asset-editor-side {
  display: grid;
  gap: 1rem;
}

.asset-editor-side__panel {
  display: grid;
  gap: 1rem;
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
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: 1.1rem;
  font-weight: 700;
}

.asset-editor-side__panel-header p {
  margin: 0.35rem 0 0;
  color: #adaaaa;
  font-size: 0.82rem;
  line-height: 1.6;
}

.asset-editor-side__panel-header button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  color: #adaaaa;
  background: #131313;
}

.asset-editor-side__dropzone {
  display: grid;
  gap: 0.75rem;
  justify-items: center;
  padding: 1.25rem;
  border: 1px dashed rgb(72 72 71 / 0.4);
  border-radius: 0.9rem;
  text-align: center;
  background: #131313;
}

.asset-editor-side__dropzone-icon {
  display: grid;
  place-items: center;
  width: 3rem;
  height: 3rem;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  color: #8ff5ff;
  background: #262626;
}

.asset-editor-side__dropzone span:last-child {
  color: #adaaaa;
  font-size: 0.82rem;
}

.asset-editor-files {
  display: grid;
  gap: 0.75rem;
}

.asset-editor-file {
  display: flex;
  align-items: center;
  justify-content: space-between;
  padding: 0.65rem 0.75rem;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.75rem;
  background: #000;
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

.asset-editor-file__info span:last-child {
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.asset-editor-file button {
  border: 0;
  color: #767575;
  background: transparent;
}

.asset-editor-file:hover button {
  color: #ff716c;
}

.asset-editor-side__summary {
  min-height: 8rem;
  padding: 0.9rem 1rem;
  border: 1px solid rgb(72 72 71 / 0.15);
  border-radius: 0.9rem;
  background: #131313;
  line-height: 1.7;
}

.asset-editor-footer {
  display: flex;
  flex-wrap: wrap;
  gap: 0.75rem;
  justify-content: flex-end;
  padding-top: 1rem;
  border-top: 1px solid rgb(72 72 71 / 0.1);
}

.asset-editor-footer__button {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  border: 1px solid rgb(72 72 71 / 0.3);
  padding: 0.85rem 1.1rem;
  border-radius: 0.75rem;
  color: #adaaaa;
  background: transparent;
  font-size: 0.9rem;
  font-weight: 500;
}

.asset-editor-footer__button:hover {
  color: #fff;
  background: #201f1f;
}

.asset-editor-footer__button--primary {
  color: #005d63;
  background: linear-gradient(135deg, #8ff5ff 0%, #00eefc 100%);
  border-color: transparent;
  font-weight: 600;
}

.asset-editor-footer__button--primary:hover {
  color: #005d63;
  box-shadow: 0 0 16px rgb(0 238 252 / 0.3);
}

@media (min-width: 1024px) {
  .asset-editor-sidebar,
  .asset-editor-topbar {
    display: flex;
  }

  .asset-editor-canvas {
    padding: 5.5rem 1.5rem 1.5rem;
    margin-left: 16rem;
  }

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
    grid-template-columns: minmax(0, 1fr) 22rem;
    align-items: start;
  }

  .asset-editor-footer {
    padding-top: 1.25rem;
  }
}
</style>
