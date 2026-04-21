<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import { referenceSidebarBrandUrl } from '@/shared/config/reference-ui'

type ShellNavKey = 'workspaces' | 'assets' | 'strategies' | 'accounts' | 'agents'

const route = useRoute()
const collapsed = ref(false)

const navItems: Array<{
  key: ShellNavKey
  to: string
  icon: string
  label: string
}> = [
  { key: 'workspaces', to: '/workspaces', icon: 'account_tree', label: '工作区' },
  { key: 'assets', to: '/assets', icon: 'inventory_2', label: '资产库' },
  { key: 'strategies', to: '/strategies', icon: 'psychology', label: '策略库' },
  { key: 'accounts', to: '/accounts', icon: 'group_work', label: '账号池' },
  { key: 'agents', to: '/agents/openclaw', icon: 'settings_input_component', label: '节点控制' },
]

const moduleLabel = computed(() => `${String(route.meta.moduleTitle ?? '模块')} / 节点控制`)
const sectionLabel = computed(() => String(route.meta.shellSectionTitle ?? '系统设置'))

const activeNavKey = computed<ShellNavKey>(() => {
  const metaKey = route.meta.shellNavKey
  if (metaKey === 'workspaces' || metaKey === 'assets' || metaKey === 'strategies' || metaKey === 'accounts' || metaKey === 'agents') {
    return metaKey
  }

  if (route.path.startsWith('/assets')) return 'assets'
  if (route.path.startsWith('/strategies')) return 'strategies'
  if (route.path.startsWith('/accounts')) return 'accounts'
  if (route.path.startsWith('/agents')) return 'agents'
  return 'workspaces'
})

const primaryAction = computed(() => {
  switch (activeNavKey.value) {
    case 'assets':
      return { to: '/assets/new', icon: 'add', label: '新建资产' }
    case 'strategies':
      return { to: '/strategies/new', icon: 'add', label: '新建策略' }
    case 'accounts':
      return { to: '/accounts', icon: 'add', label: '添加账号' }
    case 'agents':
      return { to: '/agents/openclaw', icon: 'power_settings_new', label: '初始化节点' }
    case 'workspaces':
    default:
      return { to: '/workspaces/new', icon: 'add', label: '创建团队' }
  }
})
</script>

<template>
  <div class="app-shell" :class="{ 'app-shell--collapsed': collapsed }">
    <aside class="app-shell__sidebar">
      <div class="app-shell__header">
        <RouterLink class="app-shell__brand" to="/workspaces">
          <div class="app-shell__brand-mark">
            <img :src="referenceSidebarBrandUrl" alt="CyberNomads" />
          </div>

          <div class="app-shell__brand-copy">
            <h1>CyberNomads</h1>
            <p>Arch-Level Access</p>
          </div>
        </RouterLink>

        <button
          type="button"
          class="app-shell__collapse"
          :aria-expanded="!collapsed"
          :title="collapsed ? '展开导航' : '折叠导航'"
          @click="collapsed = !collapsed"
        >
          <span class="material-symbols-outlined">{{ collapsed ? 'chevron_right' : 'chevron_left' }}</span>
        </button>
      </div>

      <nav class="app-shell__nav">
        <RouterLink
          v-for="item in navItems"
          :key="item.key"
          class="app-shell__nav-link"
          :class="{ 'app-shell__nav-link--active': activeNavKey === item.key }"
          :to="item.to"
        >
          <span class="material-symbols-outlined app-shell__nav-icon">{{ item.icon }}</span>
          <span class="app-shell__nav-label">{{ item.label }}</span>
        </RouterLink>
      </nav>

      <div class="app-shell__footer">
        <RouterLink class="app-shell__cta" :to="primaryAction.to">
          <span class="material-symbols-outlined">{{ primaryAction.icon }}</span>
          <span class="app-shell__cta-label">{{ primaryAction.label }}</span>
        </RouterLink>

        <div class="app-shell__support">
          <a class="app-shell__support-link" href="#">
            <span class="material-symbols-outlined">menu_book</span>
            <span class="app-shell__support-label">文档中心</span>
          </a>
          <a class="app-shell__support-link" href="#">
            <span class="material-symbols-outlined">support_agent</span>
            <span class="app-shell__support-label">技术支持</span>
          </a>
        </div>
      </div>

      <div class="app-shell__sr-only">
        <span>{{ moduleLabel }}</span>
        <span>{{ sectionLabel }}</span>
      </div>
    </aside>

    <main class="app-shell__main">
      <RouterView />
    </main>
  </div>
</template>

<style lang="scss">
.app-shell {
  --app-shell-sidebar-size: 16rem;
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top right, rgb(0 238 252 / 0.06), transparent 28rem),
    linear-gradient(180deg, #0a0b0b 0%, #0e0e0e 40%, #090909 100%);
}

.app-shell--collapsed {
  --app-shell-sidebar-size: 5rem;
}

.app-shell__sidebar {
  position: fixed;
  inset: 0 auto 0 0;
  z-index: 80;
  display: flex;
  flex-direction: column;
  width: var(--app-shell-sidebar-size);
  padding: 1.5rem 1rem 1rem;
  background: #131313;
  border-right: 0;
  box-shadow: 4px 0 24px rgb(0 0 0 / 0.5);
  transition: width var(--cn-transition);
}

.app-shell__header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 1.85rem;
}

.app-shell__collapse {
  display: inline-flex;
  align-items: center;
  justify-content: center;
  width: 2rem;
  height: 2rem;
  flex-shrink: 0;
  border: 1px solid rgb(72 72 71 / 0.18);
  border-radius: 0.85rem;
  color: #adaaaa;
  background: rgb(26 25 25 / 0.62);
  transition:
    border-color var(--cn-transition),
    color var(--cn-transition),
    background-color var(--cn-transition);
}

.app-shell__collapse:hover {
  color: var(--cn-primary);
  border-color: rgb(143 245 255 / 0.22);
  background: rgb(38 38 38 / 0.82);
}

.app-shell__brand {
  display: flex;
  gap: 0.95rem;
  align-items: center;
  flex: 1;
  min-width: 0;
  padding: 0 0.2rem;
}

.app-shell__brand-mark {
  display: grid;
  place-items: center;
  width: 2.6rem;
  height: 2.6rem;
  overflow: hidden;
  border: 1px solid rgb(72 72 71 / 0.2);
  border-radius: 999px;
  background: #262626;
}

.app-shell__brand-mark img {
  width: 100%;
  height: 100%;
  object-fit: cover;
}

.app-shell__brand-copy h1,
.app-shell__brand-copy p {
  margin: 0;
}

.app-shell__brand-copy h1 {
  color: #00f0ff;
  font-family: var(--cn-font-display);
  font-size: 1.18rem;
  font-weight: 700;
  letter-spacing: -0.04em;
  line-height: 1;
}

.app-shell__brand-copy p {
  color: var(--cn-on-surface-muted);
  margin-top: 0.28rem;
  font-size: 0.78rem;
  letter-spacing: 0.01em;
}

.app-shell__nav {
  display: grid;
  gap: 0.45rem;
  flex: 1;
  margin-top: 0.5rem;
}

.app-shell__nav-link,
.app-shell__support-link {
  display: flex;
  gap: 0.95rem;
  align-items: center;
  min-height: 3.15rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-display);
  font-size: 0.92rem;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition),
    transform var(--cn-transition);
}

.app-shell__nav-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.app-shell__nav-link:hover,
.app-shell__support-link:hover {
  color: #00f0ff;
  background: #262626;
}

.app-shell__nav-link--active {
  color: #00f0ff;
  font-weight: 700;
  background: linear-gradient(90deg, rgb(0 240 255 / 0.1), transparent 85%);
  border-left: 2px solid #00f0ff;
  transform: scale(0.96);
  transform-origin: center left;
}

.app-shell__footer {
  padding-top: 1.35rem;
  margin-top: auto;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.app-shell__cta {
  display: flex;
  gap: 0.55rem;
  align-items: center;
  justify-content: center;
  min-height: 3.15rem;
  margin-bottom: 1rem;
  padding: 0 1rem;
  border: 1px solid rgb(143 245 255 / 0.24);
  border-radius: 0.75rem;
  color: #005d63;
  background: #8ff5ff;
  font-family: var(--cn-font-display);
  font-size: 0.88rem;
  font-weight: 700;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition),
    border-color var(--cn-transition);
}

.app-shell__cta:hover {
  background: #9af6ff;
  box-shadow: 0 0 18px rgb(143 245 255 / 0.28);
}

.app-shell__support {
  display: grid;
  gap: 0.45rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgb(72 72 71 / 0.2);
}

.app-shell__support-link {
  min-height: 2.7rem;
  font-family: var(--cn-font-display);
  font-size: 0.84rem;
}

.app-shell__main {
  min-height: 100vh;
  margin-left: var(--app-shell-sidebar-size);
  transition: margin-left var(--cn-transition);
}

.app-shell--collapsed .app-shell__brand {
  justify-content: center;
  padding: 0 0.1rem;
}

.app-shell--collapsed .app-shell__brand-copy,
.app-shell--collapsed .app-shell__nav-label,
.app-shell--collapsed .app-shell__cta-label,
.app-shell--collapsed .app-shell__support-label {
  display: none;
}

.app-shell--collapsed .app-shell__header {
  flex-direction: column;
  align-items: center;
  gap: 0.85rem;
}

.app-shell--collapsed .app-shell__nav-link,
.app-shell--collapsed .app-shell__support-link,
.app-shell--collapsed .app-shell__cta {
  justify-content: center;
  padding-inline: 0;
}

.app-shell__sr-only {
  position: fixed;
  top: -10000px;
  left: -10000px;
  width: 1px;
  height: 1px;
  overflow: hidden;
}

.app-shell .workspace-sidebar,
.app-shell .create-sidebar,
.app-shell .assets-sidebar,
.app-shell .asset-editor-sidebar,
.app-shell .agents-sidebar,
.app-shell .openclaw-sidebar,
.app-shell .strategies-sidebar,
.app-shell .accounts-sidebar,
.app-shell .account-detail-sidebar {
  display: none !important;
}

.app-shell .workspace-page,
.app-shell .create-page,
.app-shell .assets-page,
.app-shell .asset-editor-page,
.app-shell .agents-page,
.app-shell .openclaw-page,
.app-shell .strategies-page,
.app-shell .accounts-page,
.app-shell .account-detail-page,
.app-shell .execution-shell,
.app-shell .intervention-page {
  min-height: 100vh;
  background: transparent;
}

.app-shell .workspace-main,
.app-shell .create-main,
.app-shell .assets-main,
.app-shell .asset-editor-main,
.app-shell .agents-main,
.app-shell .openclaw-main,
.app-shell .strategies-main,
.app-shell .accounts-main,
.app-shell .account-detail-main {
  width: 100%;
  min-width: 0;
  margin-left: 0 !important;
}

.app-shell .workspace-topbar,
.app-shell .asset-editor-topbar,
.app-shell .agents-topbar,
.app-shell .openclaw-topbar {
  width: calc(100% - var(--app-shell-sidebar-size)) !important;
}

.app-shell .execution-topbar {
  inset: 0 0 auto var(--app-shell-sidebar-size) !important;
  width: auto !important;
}

.app-shell .create-bottom-bar {
  left: var(--app-shell-sidebar-size) !important;
}

.app-shell .assets-canvas,
.app-shell .asset-editor-canvas,
.app-shell .agents-canvas,
.app-shell .openclaw-canvas,
.app-shell .strategies-canvas,
.app-shell .accounts-canvas {
  margin-left: 0 !important;
}

@media (max-width: 1023px) {
  .app-shell {
    --app-shell-sidebar-size: 5rem;
  }

  .app-shell__main {
    margin-left: 5rem;
  }

  .app-shell__brand {
    justify-content: center;
    padding: 0;
  }

  .app-shell__header {
    flex-direction: column;
    align-items: center;
  }

  .app-shell__brand-copy,
  .app-shell__nav-label,
  .app-shell__cta-label,
  .app-shell__support-label {
    display: none;
  }

  .app-shell__nav-link,
  .app-shell__support-link,
  .app-shell__cta {
    justify-content: center;
    padding-inline: 0;
  }

  .app-shell .workspace-topbar,
  .app-shell .asset-editor-topbar,
  .app-shell .agents-topbar,
  .app-shell .openclaw-topbar {
    width: calc(100% - 5rem) !important;
  }

  .app-shell .execution-topbar {
    inset: 0 0 auto 5rem !important;
  }

  .app-shell .create-bottom-bar {
    left: 5rem !important;
  }
}
</style>
