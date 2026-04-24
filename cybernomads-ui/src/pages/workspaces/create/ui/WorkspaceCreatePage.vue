<script setup lang="ts">
import { computed, onMounted, ref, watch } from 'vue'
import { useRoute, useRouter } from 'vue-router'

import { listAssets } from '@/entities/asset/api/asset-service'
import { getStrategyById, listStrategies } from '@/entities/strategy/api/strategy-service'
import { createWorkspace, getWorkspaceById, updateTrafficWork } from '@/entities/workspace/api/workspace-service'
import type { AssetAttachmentRecord, AssetRecord } from '@/entities/asset/model/types'
import type { StrategyDetailRecord, StrategyPlaceholderRecord, StrategyRecord } from '@/entities/strategy/model/types'
import type { StrategyParameterBinding, WorkspaceRecord } from '@/entities/workspace/model/types'

const route = useRoute()
const router = useRouter()

const assets = ref<AssetRecord[]>([])
const strategies = ref<StrategyRecord[]>([])
const workspace = ref<WorkspaceRecord | null>(null)
const strategyDetail = ref<StrategyDetailRecord | null>(null)
const selectedAssetId = ref('')
const selectedStrategyId = ref('')
const parameterFormValues = ref<Record<string, string>>({})
const isSubmitting = ref(false)
const isStrategyDetailLoading = ref(false)
const strategyDetailErrorMessage = ref('')

const workspaceId = computed(() => String(route.params.workspaceId ?? ''))
const isEditMode = computed(() => !!workspaceId.value)
const backTo = computed(() => String(route.meta.backTo ?? '/workspaces'))
const backLabel = computed(() => String(route.meta.backLabel ?? '返回工作区列表'))
const pageTitle = computed(() => (isEditMode.value ? '编辑工作区' : '创建工作区'))
const pageDescription = computed(() =>
  isEditMode.value
    ? '调整当前工作区的引流资产、引流策略和策略参数。保存后会重新准备工作区上下文。'
    : '当前先选择引流资产和引流策略，再填写策略模板里要求的参数。',
)
const submitLabel = computed(() => {
  if (isSubmitting.value) {
    return isEditMode.value ? '保存中…' : '创建中…'
  }

  return isEditMode.value ? '保存工作区' : '创建工作区'
})

const selectedAsset = computed(() => assets.value.find((asset) => asset.id === selectedAssetId.value) ?? null)
const selectedStrategy = computed(() => strategies.value.find((strategy) => strategy.id === selectedStrategyId.value) ?? null)
const strategyPlaceholders = computed(() => strategyDetail.value?.placeholders ?? [])
const canSubmitWorkspace = computed(
  () =>
    !!selectedAssetId.value &&
    !!selectedStrategyId.value &&
    !isSubmitting.value &&
    !isStrategyDetailLoading.value &&
    !strategyDetailErrorMessage.value &&
    strategyPlaceholders.value.every((placeholder) => !resolveParameterFieldError(placeholder)),
)

const workspaceName = computed(() => {
  if (!selectedAsset.value || !selectedStrategy.value) {
    return '增长编排工作区'
  }

  return `${selectedAsset.value.platform} · ${selectedStrategy.value.name}`
})

const workspaceSummary = computed(() => {
  if (!selectedAsset.value || !selectedStrategy.value) {
    return '选择一套引流资产和一条引流策略，再补齐策略模板要求的参数。'
  }

  return `以「${selectedAsset.value.name}」作为引流资产，结合「${selectedStrategy.value.name}」策略和其参数配置创建一个新的工作区。`
})

async function loadPage() {
  const [loadedAssets, loadedStrategies, loadedWorkspace] = await Promise.all([
    listAssets(),
    listStrategies(),
    isEditMode.value ? getWorkspaceById(workspaceId.value) : Promise.resolve(null),
  ])

  assets.value = loadedAssets
  strategies.value = loadedStrategies
  workspace.value = loadedWorkspace

  if (workspace.value) {
    selectedAssetId.value = workspace.value.assetId
    selectedStrategyId.value = workspace.value.strategyId
    return
  }

  selectedAssetId.value ||= assets.value[0]?.id ?? ''
  selectedStrategyId.value ||= strategies.value[1]?.id ?? strategies.value[0]?.id ?? ''
}

onMounted(loadPage)

watch(selectedStrategyId, (next, previous) => {
  if (!next || next === previous) {
    return
  }

  void loadStrategyDetail(next)
})

function buildInitialParameterFormValues(detail: StrategyDetailRecord) {
  const savedBindings =
    isEditMode.value && workspace.value?.strategyId === detail.id
      ? new Map((workspace.value.parameterBindings ?? []).map((binding) => [binding.key, binding]))
      : new Map<string, StrategyParameterBinding>()

  return Object.fromEntries(
    detail.placeholders.map((placeholder) => {
      const savedBinding = savedBindings.get(placeholder.key)

      if (savedBinding?.type === placeholder.type) {
        return [placeholder.key, String(savedBinding.value)]
      }

      return [placeholder.key, String(placeholder.defaultValue)]
    }),
  )
}

async function loadStrategyDetail(strategyId: string) {
  isStrategyDetailLoading.value = true
  strategyDetailErrorMessage.value = ''

  try {
    const detail = await getStrategyById(strategyId)

    if (!detail) {
      strategyDetail.value = null
      parameterFormValues.value = {}
      strategyDetailErrorMessage.value = '未找到该策略的完整模板内容，请重新选择。'
      return
    }

    strategyDetail.value = detail
    parameterFormValues.value = buildInitialParameterFormValues(detail)
  } catch (error) {
    strategyDetail.value = null
    parameterFormValues.value = {}
    strategyDetailErrorMessage.value = error instanceof Error ? error.message : '策略模板加载失败。'
  } finally {
    isStrategyDetailLoading.value = false
  }
}

function resolveAttachmentIcon(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'video_file'
  if (kind === 'link') return 'link'
  return 'description'
}

function resolveAttachmentLabel(kind: AssetAttachmentRecord['kind']) {
  if (kind === 'video') return 'MP4'
  if (kind === 'link') return 'URL'
  return 'PDF'
}

function resolveStrategyGlyph(strategy: StrategyRecord, index: number) {
  if (strategy.tags.some((tag) => tag.includes('私信'))) return 'forum'
  if (strategy.tags.some((tag) => tag.includes('活动'))) return 'bolt'
  return index % 2 === 0 ? 'hub' : 'description'
}

function resolveStrategyUpdatedAt(strategy: StrategyRecord) {
  return strategy.updatedAtLabel
}

function resolveStrategyTag(strategy: StrategyRecord) {
  return strategy.tags[0] ?? '未分类'
}

function resolveParameterInputType(placeholder: StrategyPlaceholderRecord) {
  void placeholder
  return 'text'
}

function resolveParameterFieldValue(key: string) {
  return parameterFormValues.value[key] ?? ''
}

function updateParameterFieldValue(key: string, value: string) {
  parameterFormValues.value = {
    ...parameterFormValues.value,
    [key]: value,
  }
}

function handleParameterFieldInput(key: string, event: Event) {
  const target = event.target

  if (!(target instanceof HTMLInputElement)) {
    return
  }

  updateParameterFieldValue(key, target.value)
}

function resolveParameterFieldError(placeholder: StrategyPlaceholderRecord) {
  void placeholder
  return ''
}

function buildParameterBindings(): StrategyParameterBinding[] {
  return strategyPlaceholders.value.map((placeholder) => ({
    type: placeholder.type,
    key: placeholder.key,
    value: resolveParameterFieldValue(placeholder.key),
  }))
}

async function handleSubmit() {
  if (!canSubmitWorkspace.value) {
    return
  }

  isSubmitting.value = true

  try {
    if (isEditMode.value && workspace.value) {
      await updateTrafficWork(workspace.value.id, {
        displayName: workspaceName.value,
        productId: selectedAssetId.value,
        strategyId: selectedStrategyId.value,
        objectBindings: workspace.value.objectBindings ?? [],
        parameterBindings: buildParameterBindings(),
      })
      await router.push('/workspaces')
      return
    }

    const createdWorkspace = await createWorkspace({
      name: workspaceName.value,
      summary: workspaceSummary.value,
      assetId: selectedAssetId.value,
      strategyId: selectedStrategyId.value,
      accountIds: [],
      parameterBindings: buildParameterBindings(),
    })

    await router.push({
      path: `/workspaces/${createdWorkspace.id}/runtime`,
      query: { created: '1' },
    })
  } finally {
    isSubmitting.value = false
  }
}
</script>

<template>
  <section class="create-page">
    <main class="create-main">
      <div class="create-main__glow" />

      <div class="create-main__content">
        <div class="create-context">
          <RouterLink :to="backTo" class="create-context__back">
            <span class="material-symbols-outlined">arrow_back</span>
            <span>{{ backLabel }}</span>
          </RouterLink>
          <span class="create-context__crumb">/ 推广工作区 / {{ pageTitle }}</span>
        </div>

        <header class="create-main__header">
          <div>
            <h2>{{ pageTitle }}</h2>
            <p>{{ pageDescription }}</p>
          </div>
        </header>

        <section class="create-warning create-warning--info">
          <strong>{{ isEditMode ? '保存后会重新准备工作区' : '当前阶段先完成基础创建' }}</strong>
          <p>
            {{
              isEditMode
                ? '更新产品、策略或策略参数后，后端会重新准备工作区上下文。执行账号等运行配置后续再补充。'
                : '创建工作区不会自动启动。当前先完成产品、策略和策略参数配置，后续再进入执行流程。'
            }}
          </p>
        </section>

        <div class="create-timeline">
          <div class="create-timeline__line">
            <div class="create-timeline__line-glow" />
          </div>

          <section class="create-step">
            <div class="create-step__node">1</div>
            <h3>
              选择引流资产
              <span>必选</span>
            </h3>

            <div class="create-carousel">
              <article
                v-for="asset in assets"
                :key="asset.id"
                class="create-card"
                :class="{ 'create-card--active': selectedAssetId === asset.id }"
                @click="selectedAssetId = asset.id"
              >
                <div class="create-card__overlay" />
                <div class="create-card__top">
                  <div class="create-card__icon">
                    <span class="material-symbols-outlined">{{ resolveAttachmentIcon(asset.attachments[0]?.kind ?? 'pdf') }}</span>
                  </div>
                  <div v-if="selectedAssetId === asset.id" class="create-card__check">
                    <span class="material-symbols-outlined">check</span>
                  </div>
                  <div v-else class="create-card__radio" />
                </div>
                <h4>{{ asset.name }}</h4>
                <p>{{ asset.summary }}</p>
                <div class="create-card__chips">
                  <span v-for="chip in [resolveAttachmentLabel(asset.attachments[0]?.kind ?? 'pdf'), ...asset.tags.slice(0, 1)]" :key="chip">
                    {{ chip }}
                  </span>
                </div>
              </article>
            </div>
          </section>

          <section class="create-step">
            <div class="create-step__node">2</div>
            <h3>
              选择引流策略
              <span>必选</span>
            </h3>

            <div class="create-carousel">
              <article
                v-for="(strategy, index) in strategies"
                :key="strategy.id"
                class="strategy-card"
                :class="{ 'strategy-card--active': selectedStrategyId === strategy.id }"
                @click="selectedStrategyId = strategy.id"
              >
                <div class="strategy-card__glyph">
                  <span class="material-symbols-outlined">{{ resolveStrategyGlyph(strategy, index) }}</span>
                </div>
                <h4>
                  {{ strategy.name }}
                  <span v-if="selectedStrategyId === strategy.id" class="material-symbols-outlined strategy-card__verified">verified</span>
                </h4>
                <p>{{ strategy.summary }}</p>
                <div class="strategy-card__stats">
                  <div>
                    <small>最近更新</small>
                    <strong>{{ resolveStrategyUpdatedAt(strategy) }}</strong>
                  </div>
                  <div>
                    <small>主标签</small>
                    <strong class="strategy-card__risk strategy-card__risk--low">{{ resolveStrategyTag(strategy) }}</strong>
                  </div>
                </div>
              </article>
            </div>
          </section>

          <section class="create-step">
            <div class="create-step__node">3</div>
            <h3>
              填写策略参数
              <span>动态生成</span>
            </h3>

            <div class="parameter-panel">
              <div v-if="isStrategyDetailLoading" class="parameter-panel__state">
                <span class="material-symbols-outlined">hourglass_top</span>
                <strong>正在读取策略模板</strong>
                <p>正在从后端加载完整策略正文并解析参数占位符。</p>
              </div>

              <div v-else-if="strategyDetailErrorMessage" class="parameter-panel__state parameter-panel__state--error">
                <span class="material-symbols-outlined">error</span>
                <strong>策略模板加载失败</strong>
                <p>{{ strategyDetailErrorMessage }}</p>
              </div>

              <div v-else-if="!strategyDetail" class="parameter-panel__state">
                <span class="material-symbols-outlined">data_object</span>
                <strong>等待选择策略</strong>
                <p>选中一条策略后，这里会根据策略正文里的占位符自动生成表单。</p>
              </div>

              <div v-else-if="!strategyPlaceholders.length" class="parameter-panel__state">
                <span class="material-symbols-outlined">check_circle</span>
                <strong>当前策略没有参数占位符</strong>
                <p>这条策略的正文里没有声明需要填写的模板参数，可以直接创建工作区。</p>
              </div>

              <template v-else>
                <div class="parameter-panel__header">
                  <div>
                    <strong>{{ strategyDetail.name }}</strong>
                    <p>已从策略模板中解析出 {{ strategyPlaceholders.length }} 个参数字段。</p>
                  </div>
                  <span class="parameter-panel__badge">Markdown Template</span>
                </div>

                <div class="parameter-grid">
                  <label v-for="placeholder in strategyPlaceholders" :key="placeholder.key" class="parameter-field">
                    <span class="parameter-field__label">
                      {{ placeholder.key }}
                      <small>{{ placeholder.type }}</small>
                    </span>
                    <input
                      :type="resolveParameterInputType(placeholder)"
                      :value="resolveParameterFieldValue(placeholder.key)"
                      :placeholder="placeholder.displayDefaultValue || '空字符串'"
                      :class="{ 'parameter-field__input--error': resolveParameterFieldError(placeholder) }"
                      @input="handleParameterFieldInput(placeholder.key, $event)"
                    />
                    <code>{{ placeholder.declaration }}</code>
                    <p v-if="resolveParameterFieldError(placeholder)" class="parameter-field__error">
                      {{ resolveParameterFieldError(placeholder) }}
                    </p>
                  </label>
                </div>
              </template>
            </div>
          </section>

        </div>
      </div>

      <div class="create-bottom-bar">
        <button
          class="create-main__submit"
          type="button"
          :disabled="!canSubmitWorkspace"
          @click="handleSubmit"
        >
          <span class="material-symbols-outlined fill">add_circle</span>
          <span>{{ submitLabel }}</span>
        </button>
      </div>
    </main>
  </section>
</template>

<style scoped lang="scss">
.create-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.create-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 40;
  display: flex;
  flex-direction: column;
  width: 16rem;
  padding: 2rem 1rem 1.5rem;
  background: #131313;
  box-shadow: 4px 0 24px rgb(0 0 0 / 0.5);
}

.create-sidebar__brand {
  display: flex;
  gap: 1rem;
  align-items: center;
  padding: 0 0.5rem;
}

.create-sidebar__avatar {
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
}

.create-sidebar__avatar img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.create-sidebar__brand-copy h1,
.create-sidebar__brand-copy p {
  margin: 0;
}

.create-sidebar__brand-copy h1 {
  color: #00f0ff;
  font-size: 1.3rem;
  font-weight: 700;
  letter-spacing: -0.04em;
}

.create-sidebar__brand-copy p {
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-sidebar__nav {
  display: grid;
  gap: 0.5rem;
  flex: 1;
  margin-top: 2rem;
}

.create-sidebar__link {
  display: flex;
  gap: 1rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1rem;
  color: var(--cn-on-surface-muted);
  border-radius: 0.75rem;
  transition: all 0.3s ease;
}

.create-sidebar__link:hover {
  color: #00f0ff;
  background: #262626;
}

.create-sidebar__link--active {
  color: #00f0ff;
  font-weight: 700;
  background: linear-gradient(90deg, rgb(0 240 255 / 0.1), transparent);
  border-left: 2px solid #00f0ff;
}

.create-sidebar__footer {
  padding-top: 1.5rem;
}

.create-sidebar__initialize {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  margin-bottom: 1rem;
  color: var(--cn-on-primary);
  background: var(--cn-primary);
  border-radius: 0.65rem;
  box-shadow: 0 0 15px rgb(143 245 255 / 0.3);
  font-size: 0.9rem;
  font-weight: 700;
}

.create-sidebar__support {
  display: grid;
  gap: 0.5rem;
  padding-top: 1rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.create-main {
  position: relative;
  flex: 1;
  min-width: 0;
  margin-left: 0;
  overflow-y: auto;
}

.create-main__glow {
  position: absolute;
  top: 0;
  right: 0;
  width: 50rem;
  height: 50rem;
  background: rgb(0 238 252 / 0.05);
  border-radius: 999px;
  filter: blur(120px);
  pointer-events: none;
}

.create-main__content {
  position: relative;
  z-index: 1;
  max-width: 72rem;
  padding: 3rem 2rem 8rem;
  margin: 0 auto;
}

.create-context {
  display: flex;
  flex-wrap: wrap;
  gap: 0.85rem;
  align-items: center;
  margin-bottom: 1.5rem;
}

.create-context__back {
  display: inline-flex;
  gap: 0.45rem;
  align-items: center;
  min-height: 2.5rem;
  padding: 0 0.9rem;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 999px;
  background: rgb(19 19 19 / 0.82);
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.create-context__back:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.28);
  background: rgb(32 31 31 / 0.92);
}

.create-context__crumb {
  color: #767575;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
  letter-spacing: 0.04em;
}

.create-main__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 3rem;
}

.create-main__header h2,
.create-main__header p {
  margin: 0;
}

.create-main__header h2 {
  font-size: 3.5rem;
  line-height: 1;
  letter-spacing: -0.05em;
}

.create-main__header p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-main__submit {
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3.5rem;
  padding: 0 2rem;
  color: var(--cn-on-primary);
  background: var(--cn-primary);
  border: 0;
  border-radius: 0.75rem;
  box-shadow: 0 0 20px rgb(143 245 255 / 0.4);
  font-weight: 700;
}

.create-main__submit:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.create-warning {
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  margin-bottom: 2rem;
  background: #131313;
  border: 1px solid rgb(255 113 108 / 0.2);
  border-radius: 0.75rem;
}

.create-warning strong,
.create-warning p {
  margin: 0;
}

.create-warning p {
  margin-top: 0.25rem;
  color: var(--cn-on-surface-muted);
}

.create-warning a {
  color: #00f0ff;
  font-weight: 700;
}

.create-timeline {
  position: relative;
  padding-left: 3rem;
}

.create-timeline__line {
  position: absolute;
  top: 1rem;
  bottom: 0;
  left: 1rem;
  width: 2px;
  background: rgb(72 72 71 / 0.3);
}

.create-timeline__line-glow {
  position: absolute;
  inset: 0;
  height: 90%;
  background: linear-gradient(180deg, var(--cn-primary), rgb(143 245 255 / 0.5), transparent);
  box-shadow: 0 0 10px rgb(143 245 255 / 0.5);
}

.create-step {
  position: relative;
  z-index: 1;
  margin-bottom: 4rem;
}

.create-step__node {
  position: absolute;
  top: 0.25rem;
  left: -2.8rem;
  display: flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  color: var(--cn-primary);
  background: #262626;
  border: 1px solid var(--cn-primary);
  border-radius: 999px;
  box-shadow: 0 0 15px rgb(143 245 255 / 0.3);
  font-weight: 700;
}

.create-step h3 {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  margin: 0 0 1.5rem;
  font-size: 1.75rem;
}

.create-step h3 span {
  padding: 0.1rem 0.5rem;
  color: var(--cn-on-surface-muted);
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.25rem;
  font-size: 0.625rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.create-step__header {
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.create-step__header h3 {
  margin-bottom: 0;
}

.create-step__header button {
  display: inline-flex;
  gap: 0.25rem;
  align-items: center;
  color: var(--cn-tertiary);
  background: transparent;
  border: 0;
  font-size: 0.92rem;
}

.create-carousel {
  display: flex;
  gap: 1.5rem;
  overflow-x: auto;
  padding-bottom: 1.5rem;
  scrollbar-width: none;
}

.create-carousel::-webkit-scrollbar {
  display: none;
}

.create-card,
.strategy-card,
.account-card {
  position: relative;
  flex: 0 0 auto;
  cursor: pointer;
}

.create-card {
  min-width: 20rem;
  padding: 1.5rem;
  overflow: hidden;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
}

.create-card--active {
  background: #1a1919;
  border-color: rgb(143 245 255 / 0.4);
  box-shadow: 0 8px 32px rgb(143 245 255 / 0.1);
}

.create-card__overlay {
  position: absolute;
  inset: 0;
  background: linear-gradient(135deg, rgb(143 245 255 / 0.05), transparent);
  pointer-events: none;
}

.create-card__top {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  margin-bottom: 1rem;
}

.create-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.5rem;
}

.create-card__icon span {
  font-size: 1.5rem;
}

.create-card__check,
.create-card__radio {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 1.5rem;
  height: 1.5rem;
  border-radius: 999px;
}

.create-card__check {
  color: var(--cn-on-primary);
  background: var(--cn-primary);
}

.create-card__radio {
  border: 2px solid rgb(118 117 117 / 0.5);
}

.create-card h4,
.create-card p,
.strategy-card h4,
.strategy-card p,
.account-card h5,
.account-card p {
  position: relative;
  z-index: 1;
  margin: 0;
}

.create-card h4,
.strategy-card h4 {
  font-size: 1.125rem;
}

.create-card p,
.strategy-card p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.create-card__chips {
  position: relative;
  z-index: 1;
  display: flex;
  gap: 0.5rem;
  margin-top: 1rem;
}

.create-card__chips span {
  padding: 0.25rem 0.5rem;
  color: var(--cn-on-surface-muted);
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.25rem;
  font-size: 0.72rem;
}

.strategy-card {
  min-width: 23.75rem;
  padding: 1.5rem;
  overflow: hidden;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.75rem;
}

.strategy-card--active {
  background: #1a1919;
  border-color: rgb(143 245 255 / 0.4);
  box-shadow: 0 8px 32px rgb(143 245 255 / 0.05);
}

.strategy-card__glyph {
  position: absolute;
  top: 0;
  right: 0;
  padding: 1rem;
  opacity: 0.15;
}

.strategy-card__glyph span {
  font-size: 6rem;
}

.strategy-card__verified {
  font-size: 1rem;
  color: var(--cn-primary);
}

.strategy-card__stats {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-top: 1.5rem;
}

.strategy-card__stats div {
  padding: 0.75rem;
  background: #262626;
  border: 1px solid rgb(72 72 71 / 0.1);
  border-radius: 0.5rem;
}

.strategy-card__stats small {
  display: block;
  margin-bottom: 0.25rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.72rem;
}

.strategy-card__stats strong {
  font-size: 0.9rem;
}

.strategy-card__risk--low {
  color: var(--cn-secondary);
}

.strategy-card__risk--warning {
  color: var(--cn-warning);
}

.strategy-card__risk--high {
  color: var(--cn-error);
}

.parameter-panel {
  display: grid;
  gap: 1rem;
  padding: 1.5rem;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.85rem;
}

.parameter-panel__header,
.parameter-panel__state {
  display: flex;
  gap: 1rem;
  align-items: flex-start;
}

.parameter-panel__header {
  justify-content: space-between;
  align-items: center;
}

.parameter-panel__header strong,
.parameter-panel__header p,
.parameter-panel__state strong,
.parameter-panel__state p {
  margin: 0;
}

.parameter-panel__header p,
.parameter-panel__state p {
  margin-top: 0.35rem;
  color: var(--cn-on-surface-muted);
}

.parameter-panel__state .material-symbols-outlined {
  color: var(--cn-primary);
}

.parameter-panel__state--error .material-symbols-outlined,
.parameter-field__error {
  color: var(--cn-error);
}

.parameter-panel__badge {
  padding: 0.35rem 0.65rem;
  color: var(--cn-primary);
  background: rgb(143 245 255 / 0.08);
  border: 1px solid rgb(143 245 255 / 0.18);
  border-radius: 999px;
  font-size: 0.72rem;
  letter-spacing: 0.08em;
  text-transform: uppercase;
}

.parameter-grid {
  display: grid;
  gap: 1rem;
  grid-template-columns: repeat(auto-fit, minmax(18rem, 1fr));
}

.parameter-field {
  display: grid;
  gap: 0.55rem;
  padding: 1rem;
  background: #1a1919;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.75rem;
}

.parameter-field__label {
  display: flex;
  justify-content: space-between;
  gap: 0.75rem;
  align-items: baseline;
  font-weight: 700;
}

.parameter-field__label small {
  color: var(--cn-on-surface-muted);
  font-size: 0.74rem;
  font-weight: 500;
}

.parameter-field input,
.parameter-field code {
  width: 100%;
}

.parameter-field input {
  min-height: 2.9rem;
  padding: 0 0.9rem;
  color: #fff;
  background: #101010;
  border: 1px solid rgb(72 72 71 / 0.24);
  border-radius: 0.6rem;
  outline: 0;
}

.parameter-field input:focus {
  border-color: rgb(143 245 255 / 0.45);
  box-shadow: 0 0 0 3px rgb(143 245 255 / 0.08);
}

.parameter-field__input--error {
  border-color: rgb(255 113 108 / 0.45) !important;
}

.parameter-field code {
  overflow-wrap: anywhere;
  color: var(--cn-tertiary);
  font-size: 0.74rem;
}

.parameter-field__error {
  margin: 0;
  font-size: 0.78rem;
}

.create-bottom-bar {
  position: fixed;
  right: 0;
  bottom: 0;
  left: 0;
  z-index: 20;
  display: flex;
  justify-content: flex-end;
  padding: 1rem 2rem;
  background: rgb(14 14 14 / 0.8);
  border-top: 1px solid rgb(72 72 71 / 0.2);
  backdrop-filter: blur(18px);
  box-shadow: 0 -8px 32px rgb(0 0 0 / 0.5);
}

@media (max-width: 1200px) {
  .create-page {
    flex-direction: column;
  }

  .create-sidebar {
    position: static;
    width: 100%;
  }

  .create-main {
    margin-left: 0;
  }

  .create-bottom-bar {
    left: 0;
  }
}

@media (max-width: 900px) {
  .create-main__header,
  .create-warning,
  .create-step__header {
    flex-direction: column;
    align-items: flex-start;
  }

  .create-main__header h2 {
    font-size: 2.6rem;
  }

  .create-timeline {
    padding-left: 2rem;
  }

  .create-step__node {
    left: -1.8rem;
  }
}
</style>
