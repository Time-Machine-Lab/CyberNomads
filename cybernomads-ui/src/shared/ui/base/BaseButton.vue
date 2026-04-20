<script setup lang="ts">
import { computed, useAttrs } from 'vue'

import { cx } from '@/shared/lib/cx'

interface Props {
  size?: 'md' | 'lg'
  variant?: 'primary' | 'secondary' | 'ghost'
}

const props = withDefaults(defineProps<Props>(), {
  size: 'md',
  variant: 'primary',
})

const attrs = useAttrs()

const className = computed(() =>
  cx('base-button', `base-button--${props.size}`, `base-button--${props.variant}`),
)
</script>

<template>
  <button v-bind="attrs" :class="className">
    <slot />
  </button>
</template>

<style scoped lang="scss">
.base-button {
  border: 0;
  border-radius: var(--cn-radius-lg);
  padding: 0.9rem 1.2rem;
  font-weight: 600;
  letter-spacing: 0.01em;
  transition:
    transform 160ms ease,
    box-shadow 160ms ease,
    opacity 160ms ease;
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

.base-button--md {
  min-height: 2.75rem;
}

.base-button--lg {
  min-height: 3.125rem;
  padding-inline: 1.5rem;
}

.base-button--primary {
  color: var(--cn-on-primary);
  background: linear-gradient(135deg, var(--cn-primary), var(--cn-primary-container));
  box-shadow: 0 14px 28px rgb(0 238 252 / 0.22);
}

.base-button--secondary {
  color: var(--cn-on-secondary);
  background: var(--cn-secondary);
  box-shadow: 0 14px 28px rgb(195 244 0 / 0.18);
}

.base-button--ghost {
  color: var(--cn-on-surface);
  background: rgb(255 255 255 / 0.02);
  box-shadow: inset 0 0 0 1px var(--cn-outline-ghost);
}
</style>
