<script setup lang="ts">
import { computed } from 'vue'

import { cx } from '@/shared/lib/cx'

interface Props {
  status: string
  mono?: boolean
}

const props = withDefaults(defineProps<Props>(), {
  mono: false,
})

const normalizedStatus = computed(() => {
  if (['running', 'active', 'connected', 'ready', 'completed', 'deployed'].includes(props.status)) {
    return 'positive'
  }

  if (['attention', 'error', 'missing', 'needs-auth'].includes(props.status)) {
    return 'warning'
  }

  return 'neutral'
})

const className = computed(() =>
  cx('status-badge', `status-badge--${normalizedStatus.value}`, {
    'status-badge--mono': props.mono,
  }),
)
</script>

<template>
  <span :class="className">
    <span class="status-badge__dot" />
    <slot>{{ status }}</slot>
  </span>
</template>

<style scoped lang="scss">
.status-badge {
  display: inline-flex;
  align-items: center;
  gap: 0.45rem;
  min-height: 1.8rem;
  padding: 0.2rem 0.7rem;
  border-radius: var(--cn-radius-pill);
  background: var(--cn-surface-container-low);
  color: var(--cn-on-surface-muted);
  box-shadow: inset 0 0 0 1px var(--cn-outline-ghost);
  font-family: var(--cn-font-body);
  font-size: 0.76rem;
  font-weight: 600;
}

.status-badge--mono {
  font-family: var(--cn-font-mono);
  letter-spacing: 0.02em;
}

.status-badge__dot {
  width: 0.48rem;
  height: 0.48rem;
  border-radius: 999px;
  background: currentColor;
  opacity: 0.9;
}

.status-badge--positive {
  color: var(--cn-primary);
  background: rgb(143 245 255 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(143 245 255 / 0.18);
}

.status-badge--warning {
  color: var(--cn-warning);
  background: rgb(255 184 0 / 0.08);
  box-shadow: inset 0 0 0 1px rgb(255 184 0 / 0.16);
}

.status-badge--neutral {
  color: var(--cn-on-surface-muted);
}
</style>
