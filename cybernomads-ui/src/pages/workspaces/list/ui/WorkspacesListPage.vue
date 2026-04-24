<script setup lang="ts">
import { onMounted, ref } from 'vue'
import { useRouter } from 'vue-router'

import { listAssets } from '@/entities/asset/api/asset-service'
import { listStrategies } from '@/entities/strategy/api/strategy-service'
import { listWorkspaces } from '@/entities/workspace/api/workspace-service'
import type { AssetRecord } from '@/entities/asset/model/types'
import type { StrategyRecord } from '@/entities/strategy/model/types'
import type { ObjectBindingItem, WorkspaceRecord } from '@/entities/workspace/model/types'

const workspaces = ref<WorkspaceRecord[]>([])
const assets = ref<AssetRecord[]>([])
const strategies = ref<StrategyRecord[]>([])
const router = useRouter()

async function loadPage() {
  ;[workspaces.value, assets.value, strategies.value] = await Promise.all([
    listWorkspaces(),
    listAssets(),
    listStrategies(),
  ])
}

onMounted(loadPage)

function resolveAssetName(assetId: string) {
  const displayNameMap: Record<string, string> = {
    'asset-core-whitepaper': 'Q3 科技评测系列',
    'asset-telegram-community': '未选择',
    'asset-demo-video': '夏季大促 V3',
  }

  if (displayNameMap[assetId]) {
    return displayNameMap[assetId]
  }

  return assets.value.find((asset) => asset.id === assetId)?.name ?? '未选择'
}

function resolveStrategyName(strategyId: string) {
  return strategies.value.find((strategy) => strategy.id === strategyId)?.name ?? '未选择'
}

function resolveWorkspaceIcon(workspace: WorkspaceRecord) {
  if (workspace.id.includes('nova')) return 'smart_toy'
  if (workspace.id.includes('red')) return 'chat_bubble'
  if (workspace.id.includes('douyin')) return 'video_library'
  return 'hub'
}

function resolveStatusTone(workspace: WorkspaceRecord) {
  if (workspace.status === 'running') return 'running'
  if (workspace.status === 'attention') return 'completed'
  return 'idle'
}

function resolveObjectBindingGlyph(binding: ObjectBindingItem) {
  const normalizedType = binding.objectType.trim()

  if (normalizedType.includes('账号')) return 'person'
  if (normalizedType.includes('产品')) return 'inventory_2'
  if (normalizedType.includes('策略')) return 'strategy'
  if (normalizedType.includes('素材')) return 'perm_media'
  if (normalizedType.includes('人设')) return 'badge'
  return 'deployed_code'
}

function resolveObjectBindingTitle(binding: ObjectBindingItem) {
  return binding.resourceLabel?.trim() || binding.objectKey.trim() || '未命名对象'
}

function resolveObjectBindingMeta(binding: ObjectBindingItem) {
  const segments = [binding.objectType.trim(), binding.objectKey.trim()].filter(Boolean)
  return segments.join(' · ') || '对象绑定'
}

function openWorkspaceRuntime(workspaceId: string) {
  void router.push(`/workspaces/${workspaceId}/runtime`)
}

function openWorkspaceEditor(workspaceId: string) {
  void router.push(`/workspaces/${workspaceId}/edit`)
}
</script>

<template>
  <section class="workspace-page">
    <div class="workspace-canvas">
        <section class="workspace-alerts">
          <div class="workspace-alert">
            <div>
              <strong>工作区以 TrafficWork 为中心</strong>
              <p>当前列表展示的是已创建的工作对象。创建阶段只要求资产与策略，执行账号和后续运行控制在下一步继续处理。</p>
            </div>
            <RouterLink to="/workspaces/new">创建工作区</RouterLink>
          </div>
        </section>

        <section class="workspace-header">
          <div>
            <h3>工作区 / TrafficWork 列表</h3>
            <p>查看每个工作区的绑定资产、策略、生命周期状态与上下文准备状态。</p>
          </div>
          <RouterLink class="workspace-header__action" to="/workspaces/new">
            <span class="material-symbols-outlined">add</span>
            <span>创建工作区</span>
          </RouterLink>
        </section>

        <section class="workspace-grid">
          <article
            v-for="workspace in workspaces"
            :key="workspace.id"
            class="workspace-card"
            :class="[
              `workspace-card--${resolveStatusTone(workspace)}`,
              { 'workspace-card--warning': Boolean(workspace.highlightBanner) },
            ]"
          >
            <div class="workspace-card__body" role="link" tabindex="0" @click="openWorkspaceRuntime(workspace.id)" @keydown.enter="openWorkspaceRuntime(workspace.id)">
              <div class="workspace-card__top">
                <div class="workspace-card__identity">
                  <div class="workspace-card__icon">
                    <span class="material-symbols-outlined">{{ resolveWorkspaceIcon(workspace) }}</span>
                  </div>
                  <div>
                    <h4>{{ workspace.name }}</h4>
                    <div class="workspace-card__status">
                      <span class="workspace-card__dot" />
                      <span>{{ workspace.statusLabel ?? workspace.status }}</span>
                    </div>
                  </div>
                </div>
                <button type="button" aria-label="编辑工作区" title="编辑工作区" @click.stop="openWorkspaceEditor(workspace.id)">
                  <span class="material-symbols-outlined">edit</span>
                </button>
              </div>

              <div class="workspace-card__meta">
                <div class="workspace-card__meta-item">
                  <div class="workspace-card__meta-label">
                    <span class="material-symbols-outlined">inventory_2</span>
                    <p>引流资产</p>
                  </div>
                  <strong>{{ workspace.assetName ?? resolveAssetName(workspace.assetId) }}</strong>
                </div>
                <div class="workspace-card__meta-item">
                  <div class="workspace-card__meta-label">
                    <span class="material-symbols-outlined">strategy</span>
                    <p>引流策略</p>
                  </div>
                  <strong class="workspace-card__meta-accent">{{ workspace.strategyName ?? resolveStrategyName(workspace.strategyId) }}</strong>
                </div>
              </div>

              <div class="workspace-card__agents">
                <div class="workspace-card__agents-header">
                  <div class="workspace-card__meta-label">
                    <span class="material-symbols-outlined">deployed_code</span>
                    <p>对象绑定</p>
                  </div>
                  <span class="workspace-card__agents-count">
                    {{ workspace.objectBindingCount ?? workspace.objectBindings?.length ?? 0 }}
                  </span>
                </div>

                <div v-if="workspace.objectBindings?.length" class="workspace-card__binding-list">
                  <div
                    v-for="binding in workspace.objectBindings.slice(0, 3)"
                    :key="`${workspace.id}-${binding.objectType}-${binding.objectKey}-${binding.resourceId}`"
                    class="workspace-card__binding"
                  >
                    <div class="workspace-card__binding-icon">
                      <span class="material-symbols-outlined">{{ resolveObjectBindingGlyph(binding) }}</span>
                    </div>
                    <div class="workspace-card__binding-content">
                      <strong>{{ resolveObjectBindingTitle(binding) }}</strong>
                      <span>{{ resolveObjectBindingMeta(binding) }}</span>
                    </div>
                  </div>

                  <div v-if="workspace.objectBindings.length > 3" class="workspace-card__binding workspace-card__binding--more">
                    <div class="workspace-card__binding-icon">
                      <span class="material-symbols-outlined">more_horiz</span>
                    </div>
                    <div class="workspace-card__binding-content">
                      <strong>还有 {{ workspace.objectBindings.length - 3 }} 项对象绑定</strong>
                      <span>进入工作区后可继续查看和维护</span>
                    </div>
                  </div>
                </div>

                <div v-else-if="workspace.objectBindingCount" class="workspace-card__binding-empty">
                  <div class="workspace-card__binding-empty-icon">
                    <span class="material-symbols-outlined">deployed_code</span>
                  </div>
                  <div>
                    <strong>已绑定 {{ workspace.objectBindingCount }} 项对象</strong>
                    <p>列表接口当前只返回数量摘要，进入工作区详情后可查看完整对象绑定内容。</p>
                  </div>
                </div>

                <div v-else class="workspace-card__binding-empty">
                  <div class="workspace-card__binding-empty-icon">
                    <span class="material-symbols-outlined">schedule</span>
                  </div>
                  <div>
                    <strong>暂未配置对象绑定</strong>
                    <p>当前阶段只创建了资产与策略，后续执行阶段再补充绑定对象。</p>
                  </div>
                </div>
              </div>
            </div>

            <div
              v-if="workspace.highlightBanner"
              class="workspace-card__banner"
              role="link"
              tabindex="0"
              @click="openWorkspaceRuntime(workspace.id)"
              @keydown.enter="openWorkspaceRuntime(workspace.id)"
            >
              <span class="material-symbols-outlined">warning</span>
              <span>{{ workspace.highlightBanner }}</span>
              <strong>ACTION_REQUIRED</strong>
            </div>
          </article>
        </section>
    </div>
  </section>
</template>

<style scoped lang="scss">
.workspace-page {
  display: flex;
  min-height: 100vh;
  color: #fff;
  background: #0e0e0e;
}

.workspace-sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 50;
  display: flex;
  flex-direction: column;
  width: 18rem;
  padding: 2rem 1rem;
  background: #131313;
  border-right: 1px solid rgb(72 72 71 / 0.2);
  box-shadow: 0 24px 48px rgb(0 0 0 / 0.5);
}

.workspace-sidebar__brand {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  padding: 0 1rem;
  margin-bottom: 2rem;
}

.workspace-sidebar__brand-icon {
  font-size: 1.9rem;
  color: #00f0ff;
}

.workspace-sidebar__brand h1,
.workspace-sidebar__brand p {
  margin: 0;
}

.workspace-sidebar__brand h1 {
  color: #00f0ff;
  font-size: 2rem;
  font-weight: 900;
  letter-spacing: -0.05em;
}

.workspace-sidebar__brand p {
  color: var(--cn-on-surface-muted);
  font-size: 0.7rem;
  letter-spacing: 0.26em;
  text-transform: uppercase;
}

.workspace-sidebar__nav,
.workspace-sidebar__footer-links {
  display: grid;
  gap: 0.5rem;
}

.workspace-sidebar__nav {
  flex: 1;
}

.workspace-sidebar__nav-link,
.workspace-sidebar__footer-link {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-height: 3rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-display);
  font-size: 0.92rem;
  transition: all 0.3s ease;
}

.workspace-sidebar__nav-link:hover,
.workspace-sidebar__footer-link:hover {
  color: #00f0ff;
  background: rgb(26 25 25 / 0.9);
}

.workspace-sidebar__nav-link--active {
  color: #00f0ff;
  font-weight: 700;
  background: #1a1919;
  border-right: 4px solid #00f0ff;
}

.workspace-sidebar__footer {
  padding-top: 2rem;
  margin-top: auto;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.workspace-sidebar__primary-action {
  display: flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 3rem;
  margin-bottom: 1rem;
  color: #00f0ff;
  background: rgb(0 240 255 / 0.1);
  border: 1px solid rgb(0 240 255 / 0.3);
  border-radius: 0.75rem;
  font-weight: 700;
}

.workspace-main {
  flex: 1;
  min-width: 0;
  margin-left: 18rem;
}

.workspace-topbar {
  position: fixed;
  top: 0;
  right: 0;
  z-index: 40;
  display: flex;
  justify-content: space-between;
  align-items: center;
  width: calc(100% - 18rem);
  min-height: 4rem;
  padding: 0 2rem;
  background: rgb(14 14 14 / 0.8);
  backdrop-filter: blur(20px);
  border-bottom: 1px solid rgb(72 72 71 / 0.2);
}

.workspace-topbar__left,
.workspace-topbar__right,
.workspace-topbar__tabs,
.workspace-topbar__actions,
.workspace-topbar__profile {
  display: flex;
  align-items: center;
}

.workspace-topbar__left {
  gap: 1.5rem;
}

.workspace-topbar__left h2 {
  margin: 0;
  color: #00f0ff;
  font-size: 1.125rem;
  font-weight: 700;
}

.workspace-topbar__tabs {
  gap: 0.75rem;
}

.workspace-topbar__tabs button {
  padding: 1.25rem 0;
  color: var(--cn-on-surface-muted);
  background: transparent;
  border: 0;
  font-size: 0.92rem;
}

.workspace-topbar__tab--active {
  color: #00f0ff;
  border-bottom: 2px solid #00f0ff;
}

.workspace-topbar__right {
  gap: 1.5rem;
}

.workspace-topbar__search {
  position: relative;
  display: flex;
  align-items: center;
  width: 16rem;
  min-height: 2.4rem;
  padding: 0 0.9rem 0 2.3rem;
  background: #131313;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 0.65rem;
}

.workspace-topbar__search span {
  position: absolute;
  left: 0.75rem;
  font-size: 1rem;
  color: var(--cn-on-surface-muted);
}

.workspace-topbar__search input {
  width: 100%;
  color: #fff;
  background: transparent;
  border: 0;
  outline: 0;
}

.workspace-topbar__actions {
  gap: 1rem;
}

.workspace-topbar__actions button {
  color: var(--cn-on-surface-muted);
  background: transparent;
  border: 0;
}

.workspace-topbar__profile {
  gap: 0.75rem;
  padding-left: 1rem;
  border-left: 1px solid rgb(72 72 71 / 0.3);
}

.workspace-topbar__profile button {
  padding: 0.45rem 0.9rem;
  color: #00f0ff;
  background: rgb(0 240 255 / 0.1);
  border: 0;
  border-radius: 0.5rem;
  font-size: 0.76rem;
  font-weight: 700;
}

.workspace-topbar__profile img {
  width: 2rem;
  height: 2rem;
  border: 1px solid rgb(0 240 255 / 0.3);
  border-radius: 999px;
}

.workspace-canvas {
  position: relative;
  width: min(100%, 100rem);
  min-height: 100vh;
  margin: 0 auto;
  padding: 2.2rem 2rem 3rem;
}

.workspace-canvas::before {
  content: '';
  position: absolute;
  top: 6rem;
  left: 12rem;
  width: 28rem;
  height: 28rem;
  background: rgb(0 240 255 / 0.04);
  border-radius: 999px;
  filter: blur(110px);
  pointer-events: none;
}

.workspace-alerts {
  display: grid;
  gap: 0.75rem;
  max-width: 60rem;
  margin-bottom: 2rem;
}

.workspace-alert {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  gap: 1rem;
  align-items: center;
  padding: 1rem 1.25rem;
  background: rgb(19 19 19 / 0.86);
  border: 1px solid rgb(255 184 0 / 0.22);
  border-radius: 1rem;
  box-shadow: 0 18px 32px rgb(0 0 0 / 0.18);
}

.workspace-alert strong,
.workspace-alert p {
  margin: 0;
}

.workspace-alert p {
  margin-top: 0.25rem;
  color: var(--cn-on-surface-muted);
}

.workspace-alert a {
  color: #00f0ff;
  font-weight: 700;
}

.workspace-header {
  position: relative;
  z-index: 1;
  display: flex;
  justify-content: space-between;
  align-items: flex-end;
  gap: 1.5rem;
  margin-bottom: 2rem;
}

.workspace-header h3,
.workspace-header p {
  margin: 0;
}

.workspace-header h3 {
  font-family: var(--cn-font-display);
  font-size: 1.75rem;
  font-weight: 700;
  letter-spacing: -0.03em;
}

.workspace-header p {
  margin-top: 0.5rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.9rem;
}

.workspace-header__action {
  position: relative;
  z-index: 1;
  display: inline-flex;
  gap: 0.5rem;
  align-items: center;
  justify-content: center;
  min-height: 2.7rem;
  padding: 0 1rem;
  color: #041316;
  background: #8ff5ff;
  border: 1px solid rgb(143 245 255 / 0.28);
  border-radius: 0.55rem;
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 600;
}

.workspace-grid {
  position: relative;
  z-index: 1;
  display: grid;
  grid-template-columns: repeat(3, minmax(0, 1fr));
  gap: 1.25rem;
}

.workspace-card {
  display: flex;
  flex-direction: column;
  min-height: 20rem;
  overflow: hidden;
  color: #fff;
  background: #131313;
  border: 1px solid rgb(255 255 255 / 0.1);
  border-radius: 1rem;
  box-shadow: var(--cn-shadow-ambient);
  transition:
    border-color var(--cn-transition),
    box-shadow var(--cn-transition),
    background-color var(--cn-transition);
}

.workspace-card:hover {
  border-color: rgb(0 240 255 / 0.5);
}

.workspace-card__body {
  display: flex;
  flex: 1;
  flex-direction: column;
  padding: 1.5rem;
  cursor: pointer;
}

.workspace-card__top {
  display: flex;
  justify-content: space-between;
  align-items: flex-start;
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.workspace-card__identity {
  display: flex;
  gap: 1rem;
  align-items: center;
}

.workspace-card__icon {
  display: flex;
  align-items: center;
  justify-content: center;
  width: 3rem;
  height: 3rem;
  background: rgb(26 26 26 / 1);
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 0.5rem;
}

.workspace-card__icon span {
  font-size: 1.35rem;
}

.workspace-card__top h4 {
  margin: 0;
  font-size: 1.125rem;
  font-weight: 700;
}

.workspace-card__top button {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 1.95rem;
  height: 1.95rem;
  color: var(--cn-on-surface-muted);
  background: #171717;
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0.4rem;
  cursor: pointer;
  transition:
    color var(--cn-transition),
    border-color var(--cn-transition),
    background-color var(--cn-transition);
}

.workspace-card__top button:hover {
  color: #fff;
  border-color: rgb(143 245 255 / 0.18);
  background: #201f1f;
}

.workspace-card__status {
  display: flex;
  gap: 0.45rem;
  align-items: center;
  margin-top: 0.35rem;
  font-family: var(--cn-font-mono);
  font-size: 0.74rem;
  letter-spacing: 0.08em;
}

.workspace-card__dot {
  width: 0.5rem;
  height: 0.5rem;
  border-radius: 999px;
}

.workspace-card__meta {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: 1rem;
  margin-bottom: 1.5rem;
}

.workspace-card__meta-item {
  padding: 0.8rem;
  background: rgb(26 26 26 / 0.5);
  border: 1px solid rgb(255 255 255 / 0.05);
  border-radius: 0.5rem;
}

.workspace-card__meta-label {
  display: flex;
  gap: 0.25rem;
  align-items: center;
  margin-bottom: 0.25rem;
}

.workspace-card__meta-label span {
  font-size: 0.875rem;
  color: var(--cn-on-surface-muted);
}

.workspace-card__meta-label p {
  margin: 0;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
  letter-spacing: 0.12em;
  text-transform: uppercase;
}

.workspace-card__meta-item strong {
  display: block;
  overflow: hidden;
  font-size: 0.92rem;
  font-weight: 500;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__agents {
  margin-top: auto;
}

.workspace-card__agents-header {
  display: flex;
  align-items: center;
  justify-content: space-between;
  gap: 0.75rem;
  margin-bottom: 0.75rem;
}

.workspace-card__agents-count {
  display: flex;
  align-items: center;
  justify-content: center;
  min-width: 1.7rem;
  height: 1.45rem;
  padding: 0 0.5rem;
  color: var(--cn-on-surface-muted);
  background: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 999px;
  font-family: var(--cn-font-mono);
  font-size: 0.68rem;
}

.workspace-card__binding-list {
  display: grid;
  gap: 0.65rem;
}

.workspace-card__binding {
  display: flex;
  gap: 0.75rem;
  align-items: center;
  min-width: 0;
  padding: 0.75rem 0.8rem;
  background: rgb(26 26 26 / 0.55);
  border: 1px solid rgb(255 255 255 / 0.06);
  border-radius: 0.75rem;
}

.workspace-card__binding-icon,
.workspace-card__binding-empty-icon {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  flex-shrink: 0;
  width: 2rem;
  height: 2rem;
  color: var(--cn-on-surface-muted);
  background: rgb(255 255 255 / 0.05);
  border: 1px solid rgb(255 255 255 / 0.08);
  border-radius: 0.6rem;
}

.workspace-card__binding-icon span,
.workspace-card__binding-empty-icon span {
  font-size: 0.95rem;
}

.workspace-card__binding-content {
  min-width: 0;
}

.workspace-card__binding-content strong,
.workspace-card__binding-content span {
  display: block;
  overflow: hidden;
  text-overflow: ellipsis;
  white-space: nowrap;
}

.workspace-card__binding-content strong {
  font-size: 0.88rem;
  font-weight: 600;
}

.workspace-card__binding-content span {
  margin-top: 0.18rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.72rem;
}

.workspace-card__binding--more {
  border-style: dashed;
}

.workspace-card__binding-empty {
  display: flex;
  gap: 0.85rem;
  align-items: center;
  min-height: 5.2rem;
  padding: 0.9rem;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.02), rgb(255 255 255 / 0.01));
  border: 1px dashed rgb(255 255 255 / 0.12);
  border-radius: 0.85rem;
}

.workspace-card__binding-empty strong,
.workspace-card__binding-empty p {
  margin: 0;
}

.workspace-card__binding-empty strong {
  display: block;
  font-size: 0.9rem;
  font-weight: 600;
}

.workspace-card__binding-empty p {
  margin-top: 0.25rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.76rem;
  line-height: 1.6;
}

.workspace-card__banner {
  display: grid;
  grid-template-columns: auto 1fr auto;
  gap: 0.5rem;
  align-items: center;
  min-height: 2.7rem;
  padding: 0 1.25rem;
  color: #151515;
  background: #ffb800;
  font-size: 0.82rem;
  font-weight: 700;
  letter-spacing: 0.08em;
  cursor: pointer;
}

.workspace-card__banner strong {
  font-family: var(--cn-font-mono);
  font-size: 0.76rem;
}

.workspace-card--running .workspace-card__icon,
.workspace-card--running .workspace-card__meta-accent,
.workspace-card--running .workspace-card__status {
  color: #00f0ff;
}

.workspace-card--running .workspace-card__dot {
  background: #00f0ff;
  box-shadow: 0 0 8px rgb(0 240 255 / 0.8);
}

.workspace-card--idle .workspace-card__icon,
.workspace-card--idle .workspace-card__status {
  color: #9ca3af;
}

.workspace-card--idle .workspace-card__dot {
  background: #6b7280;
}

.workspace-card--completed .workspace-card__icon,
.workspace-card--completed .workspace-card__status,
.workspace-card--completed .workspace-card__meta-accent {
  color: #c3f400;
}

.workspace-card--completed .workspace-card__dot {
  background: #c3f400;
}

@media (max-width: 1440px) {
  .workspace-grid {
    grid-template-columns: repeat(2, minmax(0, 1fr));
  }
}

@media (max-width: 1200px) {
  .workspace-sidebar {
    position: static;
    width: 100%;
    height: auto;
  }

  .workspace-main {
    margin-left: 0;
  }

  .workspace-topbar {
    position: static;
    width: auto;
  }

  .workspace-page {
    flex-direction: column;
  }

  .workspace-canvas {
    padding-top: 2rem;
  }

  .workspace-grid {
    grid-template-columns: 1fr;
  }
}

@media (max-width: 900px) {
  .workspace-topbar,
  .workspace-header,
  .workspace-alert {
    flex-direction: column;
    align-items: flex-start;
  }

  .workspace-topbar__right {
    flex-wrap: wrap;
  }

  .workspace-topbar__search {
    width: 100%;
  }

  .workspace-card__meta {
    grid-template-columns: 1fr;
  }
}
</style>
