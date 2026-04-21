<script setup lang="ts">
import { computed, reactive, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { getStrategyById, saveStrategy } from '@/entities/strategy/api/strategy-service'
import { mockScenarioId } from '@/shared/mocks/runtime'

const route = useRoute()
const router = useRouter()

const strategyId = computed(() => String(route.params.strategyId ?? ''))
const isEditMode = computed(() => Boolean(strategyId.value))
const isSaving = ref(false)

const form = reactive({
  name: '',
  summary: '',
  markdown: '',
  moduleCount: 3,
})

const modules = [
  {
    title: '视频关键字搜索',
    subtitle: 'Discovery',
    description: '定义目标平台的搜索算法参数，提取高权重相关视频数据流。',
    icon: 'video_search',
    tone: 'tertiary',
  },
  {
    title: '潜在客户发现',
    subtitle: 'Lead Gen',
    description: '基于评论情感分析和用户画像提取高意向目标账户。',
    icon: 'person_search',
    tone: 'secondary',
  },
  {
    title: '评论触点生成',
    subtitle: 'Engagement',
    description: '生成上下文相关的非侵入式评论，建立初步连接。',
    icon: 'chat_bubble',
    tone: 'primary',
    active: true,
  },
  {
    title: '跟进 / DM 序列',
    subtitle: 'Conversion',
    description: '配置多阶段直接消息模板，处理常见异议并引导转化。',
    icon: 'send',
    tone: 'error',
  },
]

watch(
  [strategyId, mockScenarioId],
  async () => {
    if (!isEditMode.value) {
      form.name = 'TikTok 增长策略 - 亚太区'
      form.summary = '自动化社交媒体互动与线索生成策略，专注亚太区高意向用户转化。'
      form.markdown =
        'name: "TikTok 增长策略 - 亚太区"\nplatform: SocialMedia\n\n## 系统提示词配置\n1. 当发现高潜目标时，首先使用备用账户 @[账号A] 进行点赞与初步互动。\n2. 若目标回复互动，则切换至主理人账户 @[账号B] 进行深度沟通。\n3. 沟通成熟后，发送私域引流卡片，附带 @[QQ加群二维码图片A] 引导转化。'
      form.moduleCount = 4
      return
    }

    const strategy = await getStrategyById(strategyId.value)
    if (!strategy) return

    form.name = strategy.name
    form.summary = strategy.summary
    form.markdown = strategy.markdown
    form.moduleCount = strategy.moduleCount
  },
  { immediate: true },
)

async function handleSave(status: 'draft' | 'deployed') {
  isSaving.value = true

  try {
    await saveStrategy({
      id: isEditMode.value ? strategyId.value : undefined,
      name: form.name,
      summary: form.summary,
      markdown: form.markdown,
      moduleCount: form.moduleCount,
      status,
      platform: 'SocialMedia',
      category: '线索',
      tags: ['LeadGen'],
      successRate: 76,
      difficulty: '中',
    })

    await router.push('/strategies')
  } finally {
    isSaving.value = false
  }
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
        <input v-model="form.name" type="text" placeholder="策略名称" />
      </div>

      <div class="strategy-editor-header__right">
        <div class="strategy-editor-header__tags">
          <span>SocialMedia</span>
          <span>LeadGen</span>
          <span class="strategy-editor-header__tag-add" role="button" tabindex="0">
            <span class="material-symbols-outlined">add</span>
          </span>
        </div>
        <div class="strategy-editor-header__divider" />
        <div class="strategy-editor-header__actions">
          <button type="button" class="strategy-editor-header__action" :disabled="isSaving" @click="handleSave('draft')">
            保存草稿
          </button>
          <button
            type="button"
            class="strategy-editor-header__action strategy-editor-header__action--primary"
            :disabled="isSaving || !form.name.trim()"
            @click="handleSave('deployed')"
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
          <p>拖拽或点击添加代码片段至主编辑区</p>
          <label class="strategy-modules__search">
            <span class="material-symbols-outlined">search</span>
            <input type="text" placeholder="搜索模块..." />
          </label>
        </div>

        <div class="strategy-modules__list">
          <article
            v-for="module in modules"
            :key="module.title"
            class="strategy-module"
            :class="[
              `strategy-module--${module.tone}`,
              { 'strategy-module--active': module.active },
            ]"
          >
            <div class="strategy-module__top">
              <div class="strategy-module__identity">
                <div class="strategy-module__icon">
                  <span class="material-symbols-outlined">{{ module.icon }}</span>
                </div>
                <div>
                  <h3>{{ module.title }}</h3>
                  <span>{{ module.subtitle }}</span>
                </div>
              </div>

              <button type="button" class="strategy-module__action">
                <span class="material-symbols-outlined">{{ module.active ? 'check' : 'add' }}</span>
              </button>
            </div>
            <p>{{ module.description }}</p>
          </article>
        </div>
      </aside>

      <section class="strategy-canvas">
        <div class="strategy-canvas__toolbar">
          <div class="strategy-canvas__toolbar-left">
            <button type="button">
              <span class="material-symbols-outlined">format_h1</span>
            </button>
            <button type="button">
              <span class="material-symbols-outlined">format_bold</span>
            </button>
            <button type="button">
              <span class="material-symbols-outlined">code</span>
            </button>
            <div class="strategy-canvas__toolbar-divider" />
            <button type="button">
              <span class="material-symbols-outlined">data_object</span>
            </button>
          </div>
          <span>Line 48, Col 12 | UTF-8 | Markdown</span>
        </div>

        <div class="strategy-canvas__content">
          <textarea v-model="form.summary" class="strategy-editor-hidden-field" placeholder="摘要说明" />
          <div class="strategy-canvas__frontmatter">
            <span class="strategy-canvas__key">name:</span>
            <span class="strategy-canvas__value">"{{ form.name || 'TikTok 增长策略 - 亚太区' }}"</span>
            <br />
            <span class="strategy-canvas__key">description:</span>
            <span class="strategy-canvas__value">"{{ form.summary || '自动化社交媒体互动与线索生成策略，专注亚太区高意向用户转化。' }}"</span>
          </div>

          <textarea v-model="form.markdown" />

          <div class="strategy-snippet">
            <div class="strategy-snippet__rail" />
            <div class="strategy-snippet__header">
              <span class="material-symbols-outlined">chat_bubble</span>
              <span>模块: 评论触点生成</span>
            </div>
            <div class="strategy-snippet__body">
              <p>### 评论生成逻辑</p>
              <p>当识别到目标潜在客户发布的视频内容时，根据以下规则生成互动评论：</p>
              <div class="strategy-snippet__code">
                <span class="strategy-canvas__key">IF</span> sentiment == <span class="strategy-canvas__value">"positive"</span>
                <span class="strategy-canvas__key"> AND</span> intent_score &gt; 0.7
              </div>
              <p class="strategy-snippet__hint">* 约束：绝对不要包含直接的销售链接。保持在 15-25 个字以内。</p>
            </div>
          </div>

          <div class="strategy-canvas__cursor">
            <span />
            <p>继续输入或从左侧拖拽模块...</p>
          </div>
        </div>
      </section>

      <aside class="strategy-objects">
        <div class="strategy-objects__header">
          <h2>
            <span class="material-symbols-outlined">data_object</span>
            <span>对象引用</span>
          </h2>
          <p>自动检测当前策略中的对象引用</p>
        </div>

        <div class="strategy-objects__list">
          <div class="strategy-object">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="strategy-object__content">
              <h3>账号A</h3>
              <span>备用互动账号</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check">check_circle</span>
          </div>

          <div class="strategy-object">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">person</span>
            </div>
            <div class="strategy-object__content">
              <h3>账号B</h3>
              <span>主理人转化账号</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check">check_circle</span>
          </div>

          <div class="strategy-object strategy-object--asset">
            <div class="strategy-object__icon">
              <span class="material-symbols-outlined">image</span>
            </div>
            <div class="strategy-object__content">
              <h3>QQ加群二维码图片A</h3>
              <span>引流媒体资产</span>
            </div>
            <span class="material-symbols-outlined strategy-object__check">check_circle</span>
          </div>
        </div>
      </aside>
    </main>

    <button type="button" class="strategy-editor-hidden-submit" @click="handleSave('deployed')">deploy</button>
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

.strategy-editor-hidden-field,
.strategy-editor-hidden-submit {
  position: fixed;
  top: -10000px;
  left: -10000px;
  width: 1px;
  height: 1px;
  opacity: 0;
  pointer-events: none;
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
