<script setup lang="ts">
import { computed, ref } from 'vue'
import { useRoute } from 'vue-router'

import cybernomadsMarkUrl from '@/shared/assets/branding/cybernomads-mark.svg'

type ShellNavKey = 'console' | 'assets' | 'strategies' | 'accounts' | 'workspaces'

const route = useRoute()
const collapsed = ref(false)

const navItems: Array<{
  key: ShellNavKey
  to: string
  icon: string
  label: string
}> = [
  { key: 'console', to: '/console', icon: 'dashboard', label: '控制台' },
  { key: 'assets', to: '/assets', icon: 'inventory_2', label: '资产列表' },
  { key: 'strategies', to: '/strategies', icon: 'psychology', label: '策略库' },
  { key: 'accounts', to: '/accounts', icon: 'group', label: '账号池' },
  { key: 'workspaces', to: '/workspaces', icon: 'workspaces', label: '推广工作区' },
]

const moduleLabel = computed(() => `${String(route.meta.moduleTitle ?? '模块')} / CyberNomads`)
const sectionLabel = computed(() => String(route.meta.shellSectionTitle ?? '系统设置'))

const activeNavKey = computed<ShellNavKey>(() => {
  const metaKey = route.meta.shellNavKey
  if (
    metaKey === 'console' ||
    metaKey === 'workspaces' ||
    metaKey === 'assets' ||
    metaKey === 'strategies' ||
    metaKey === 'accounts'
  ) {
    return metaKey
  }

  if (route.path.startsWith('/console')) return 'console'
  if (route.path.startsWith('/assets')) return 'assets'
  if (route.path.startsWith('/strategies')) return 'strategies'
  if (route.path.startsWith('/accounts')) return 'accounts'
  return 'workspaces'
})

const primaryAction = computed(() => {
  switch (activeNavKey.value) {
    case 'console':
      return { to: '/console/openclaw', icon: 'tune', label: '配置主控' }
    case 'assets':
      return { to: '/assets/new', icon: 'add', label: '新建资产' }
    case 'strategies':
      return { to: '/strategies/new', icon: 'add', label: '新建策略' }
    case 'accounts':
      return { to: '/accounts/new', icon: 'add', label: '新增账号' }
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
        <RouterLink class="app-shell__brand" to="/console">
          <div class="app-shell__brand-mark">
            <img :src="cybernomadsMarkUrl" alt="CyberNomads" />
          </div>

          <div class="app-shell__brand-copy">
            <h1>CyberNomads</h1>
            <p>AI 营销指挥中心</p>
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
  display: flex;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top left, rgb(0 238 252 / 0.03), transparent 24rem),
    linear-gradient(180deg, #0d0d0d 0%, #0e0e0e 40%, #0b0b0b 100%);
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
  padding: 1.75rem 1rem 1rem;
  background: #131313;
  border-right: 1px solid rgb(72 72 71 / 0.18);
  box-shadow: 24px 0 48px rgb(0 0 0 / 0.5);
  transition: width var(--cn-transition);
}

.app-shell__sidebar::after {
  position: absolute;
  inset: 1.5rem 0 auto auto;
  width: 1px;
  height: calc(100% - 3rem);
  background: linear-gradient(180deg, rgb(143 245 255 / 0.12), transparent 18%, transparent 82%, rgb(143 245 255 / 0.06));
  content: '';
  opacity: 0.3;
  pointer-events: none;
}

.app-shell__header {
  display: flex;
  gap: 0.75rem;
  align-items: flex-start;
  justify-content: space-between;
  margin-bottom: 2rem;
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
  width: 2.5rem;
  height: 2.5rem;
  overflow: hidden;
  border: 1px solid rgb(143 245 255 / 0.24);
  border-radius: 999px;
  background: linear-gradient(180deg, #1a1919 0%, #262626 100%);
  box-shadow:
    inset 0 0 0 1px rgb(255 255 255 / 0.03),
    0 0 18px rgb(0 240 255 / 0.12);
}

.app-shell__brand-mark img {
  width: 74%;
  height: 74%;
  object-fit: contain;
}

.app-shell__brand-copy h1,
.app-shell__brand-copy p {
  margin: 0;
}

.app-shell__brand-copy h1 {
  color: #00f0ff;
  font-family: var(--cn-font-display);
  font-size: 1.18rem;
  font-weight: 800;
  letter-spacing: -0.04em;
  line-height: 1;
}

.app-shell__brand-copy p {
  color: var(--cn-on-surface-muted);
  margin-top: 0.28rem;
  font-size: 0.72rem;
  letter-spacing: 0.01em;
}

.app-shell__nav {
  display: grid;
  gap: 0.35rem;
  flex: 1;
  margin-top: 0.5rem;
}

.app-shell__nav-link,
.app-shell__support-link {
  display: flex;
  gap: 0.95rem;
  align-items: center;
  min-height: 3.1rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  color: var(--cn-on-surface-muted);
  font-family: var(--cn-font-body);
  font-size: 0.92rem;
  font-weight: 500;
  letter-spacing: 0;
  transition:
    color var(--cn-transition),
    background-color var(--cn-transition),
    border-color var(--cn-transition);
}

.app-shell__nav-icon {
  font-size: 1.3rem;
  flex-shrink: 0;
}

.app-shell__nav-link {
  border-right: 3px solid transparent;
  border-top-right-radius: 0;
  border-bottom-right-radius: 0;
}

.app-shell__nav-link:hover,
.app-shell__support-link:hover {
  color: var(--cn-primary);
  background: #1a1919;
}

.app-shell__nav-link--active {
  color: var(--cn-primary);
  border-right-color: var(--cn-primary);
  background: linear-gradient(90deg, rgb(0 240 255 / 0.08), transparent 92%);
  box-shadow: 0 0 15px rgb(0 240 255 / 0.08);
}

.app-shell__footer {
  display: grid;
  gap: 1rem;
  padding-top: 1.35rem;
  border-top: 1px solid rgb(72 72 71 / 0.16);
}

.app-shell__cta {
  display: inline-flex;
  gap: 0.65rem;
  align-items: center;
  justify-content: center;
  width: 100%;
  min-height: 3rem;
  padding: 0 1rem;
  border-radius: 0.75rem;
  color: var(--cn-primary);
  background: rgb(143 245 255 / 0.1);
  border: 1px solid rgb(143 245 255 / 0.22);
  font-family: var(--cn-font-body);
  font-size: 0.88rem;
  font-weight: 600;
  transition:
    background-color var(--cn-transition),
    border-color var(--cn-transition);
}

.app-shell__cta:hover {
  background: rgb(143 245 255 / 0.16);
  border-color: rgb(143 245 255 / 0.32);
}

.app-shell__support {
  display: grid;
  gap: 0.35rem;
  padding-top: 0.9rem;
  border-top: 1px solid rgb(72 72 71 / 0.08);
}

.app-shell__support-link {
  min-height: 2.8rem;
  font-family: var(--cn-font-body);
  font-size: 0.84rem;
  font-weight: 500;
}

.app-shell__main {
  flex: 1;
  min-height: 100vh;
  margin-left: var(--app-shell-sidebar-size);
  transition: margin-left var(--cn-transition);
}

.app-shell--collapsed .app-shell__brand-copy,
.app-shell--collapsed .app-shell__nav-label,
.app-shell--collapsed .app-shell__cta-label,
.app-shell--collapsed .app-shell__support-label {
  display: none;
}

.app-shell--collapsed .app-shell__brand {
  justify-content: center;
}

.app-shell--collapsed .app-shell__nav-link,
.app-shell--collapsed .app-shell__support-link {
  justify-content: center;
  padding-inline: 0;
}

.app-shell--collapsed .app-shell__cta {
  justify-content: center;
  padding-inline: 0;
}

.app-shell__sr-only {
  position: absolute;
  width: 1px;
  height: 1px;
  padding: 0;
  margin: -1px;
  overflow: hidden;
  clip: rect(0 0 0 0);
  white-space: nowrap;
  border: 0;
}

@media (width <= 1280px) {
  .app-shell {
    --app-shell-sidebar-size: 15rem;
  }
}
</style>
