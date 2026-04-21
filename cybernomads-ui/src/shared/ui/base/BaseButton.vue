<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cx } from '@/shared/lib/cx'

interface Props {
  size?: 'sm' | 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost' | 'outline'
  block?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
  block: false,
})

const attrs = useAttrs()

const className = computed(() =>
  cx('base-button', `base-button--${props.size}`, `base-button--${props.variant}`, {
    'base-button--block': props.block,
  }),
)
</script>

<template>
  <button v-bind="attrs" :class="className">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.base-button {
  position: relative;
  display: inline-flex;
  align-items: center;
  justify-content: center;
  gap: var(--cn-space-2);
  border: 0;
  border-radius: var(--cn-radius-lg);
  padding: 0.9rem 1.25rem;
  font-family: var(--cn-font-display);
  font-weight: 600;
  letter-spacing: 0.02em;
  white-space: nowrap;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease,
    border-color 160ms ease,
    background-color 160ms ease,
    color 160ms ease;
}

.base-button:hover:not(:disabled) {
  transform: translateY(-1px);
}

.base-button:focus-visible {
  outline: 2px solid rgb(143 245 255 / 0.65);
  outline-offset: 3px;
}

.base-button:disabled {
  cursor: not-allowed;
  opacity: 0.45;
}

.base-button--block {
  width: 100%;
}

.base-button--sm {
  min-height: 2.5rem;
  padding-inline: 1rem;
  font-size: 0.85rem;
}

.base-button--md {
  min-height: 2.875rem;
}

.base-button--lg {
  min-height: 3.25rem;
  padding-inline: 1.5rem;
  font-size: 0.98rem;
}

.base-button--primary {
  color: var(--cn-on-primary);
  background: linear-gradient(135deg, var(--cn-primary), var(--cn-primary-container));
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 0 22px rgb(0 238 252 / 0.18);
}

.base-button--secondary {
  color: var(--cn-on-secondary);
  background: var(--cn-secondary);
  box-shadow:
    inset 0 1px 0 rgb(255 255 255 / 0.18),
    0 0 20px rgb(195 244 0 / 0.18);
}

.base-button--ghost {
  color: var(--cn-on-surface);
  background: rgb(255 255 255 / 0.04);
  box-shadow: inset 0 0 0 1px var(--cn-outline-ghost);
}

.base-button--outline {
  color: var(--cn-primary);
  background: rgb(0 0 0 / 0.05);
  box-shadow:
    inset 0 0 0 1px rgb(143 245 255 / 0.28),
    0 0 18px rgb(143 245 255 / 0.08);
}
</style>
