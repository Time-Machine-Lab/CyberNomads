<script setup lang="ts">
export interface BreadcrumbItem {
  label: string
  to?: string
}

defineProps<{
  title: string
  description?: string
  eyebrow?: string
  breadcrumbs?: BreadcrumbItem[]
  statusLabel?: string
}>()
</script>

<template>
  <header class="app-page-header">
    <nav v-if="breadcrumbs?.length" class="app-page-header__breadcrumbs" aria-label="Breadcrumb">
      <template v-for="(item, index) in breadcrumbs" :key="`${item.label}-${index}`">
        <RouterLink v-if="item.to" :to="item.to" class="app-page-header__crumb-link">
          {{ item.label }}
        </RouterLink>
        <span v-else class="app-page-header__crumb-current">{{ item.label }}</span>
        <span v-if="index < breadcrumbs.length - 1" class="app-page-header__crumb-separator">
          /
        </span>
      </template>
    </nav>

    <div class="app-page-header__row">
      <div class="app-page-header__copy">
        <span v-if="eyebrow" class="app-page-header__eyebrow">{{ eyebrow }}</span>
        <div class="app-page-header__title-row">
          <h1>{{ title }}</h1>
          <span v-if="statusLabel" class="app-page-header__status">{{ statusLabel }}</span>
        </div>
        <p v-if="description">{{ description }}</p>
      </div>

      <div v-if="$slots.actions" class="app-page-header__actions">
        <slot name="actions" />
      </div>
    </div>
  </header>
</template>

<style scoped lang="scss">
.app-page-header {
  display: grid;
  gap: var(--cn-space-4);
}

.app-page-header__breadcrumbs {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cn-space-2);
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 500;
  letter-spacing: 0.04em;
  color: var(--cn-on-surface-faint);
}

.app-page-header__crumb-link {
  color: var(--cn-on-surface-muted);
}

.app-page-header__crumb-current,
.app-page-header__crumb-separator {
  color: var(--cn-on-surface-faint);
}

.app-page-header__row {
  display: flex;
  justify-content: space-between;
  gap: var(--cn-space-4);
  align-items: flex-start;
}

.app-page-header__copy {
  display: grid;
  gap: var(--cn-space-3);
}

.app-page-header__title-row {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cn-space-3);
  align-items: center;
}

.app-page-header__eyebrow {
  font-family: var(--cn-font-display);
  font-size: 0.76rem;
  text-transform: uppercase;
  letter-spacing: 0.16em;
  color: var(--cn-primary);
}

.app-page-header__status {
  display: inline-flex;
  align-items: center;
  min-height: 2rem;
  padding: 0.2rem 0.75rem;
  border-radius: var(--cn-radius-pill);
  color: var(--cn-secondary);
  background: rgb(195 244 0 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(195 244 0 / 0.18);
  font-family: var(--cn-font-body);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.04em;
}

h1 {
  margin: 0;
  font-family: var(--cn-font-display);
  font-size: clamp(2rem, 4vw, 2.85rem);
  line-height: 1;
  letter-spacing: -0.04em;
}

p {
  margin: 0;
  max-width: 46rem;
  color: var(--cn-on-surface-muted);
  font-size: 0.95rem;
  line-height: 1.7;
}

.app-page-header__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cn-space-3);
}

@media (max-width: 900px) {
  .app-page-header__row {
    flex-direction: column;
  }
}
</style>
