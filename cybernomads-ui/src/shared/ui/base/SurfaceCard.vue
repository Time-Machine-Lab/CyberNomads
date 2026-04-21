<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'default' | 'accent' | 'success' | 'warning'
    density?: 'regular' | 'dense'
    interactive?: boolean
    glow?: boolean
  }>(),
  {
    tone: 'default',
    density: 'regular',
    interactive: false,
    glow: false,
  },
)
</script>

<template>
  <section
    class="surface-card"
    :class="[
      `surface-card--${tone}`,
      `surface-card--${density}`,
      { 'surface-card--interactive': interactive, 'surface-card--glow': glow },
    ]"
  >
    <slot />
  </section>
</template>

<style scoped lang="scss">
.surface-card {
  position: relative;
  overflow: hidden;
  border-radius: var(--cn-radius-xl);
  background: var(--cn-surface-glass);
  box-shadow:
    inset 0 0 0 1px var(--cn-outline-ghost),
    var(--cn-shadow-soft);
  backdrop-filter: blur(20px);
}

.surface-card::before {
  content: '';
  position: absolute;
  inset: 0;
  pointer-events: none;
  background: linear-gradient(180deg, rgb(255 255 255 / 0.03), transparent 24%);
}

.surface-card--regular {
  padding: var(--cn-space-6);
}

.surface-card--dense {
  padding: var(--cn-space-5);
}

.surface-card--accent {
  background:
    linear-gradient(180deg, rgb(143 245 255 / 0.09), transparent 42%),
    rgb(26 25 25 / 0.82);
  box-shadow:
    inset 0 0 0 1px rgb(143 245 255 / 0.18),
    var(--cn-shadow-ambient);
}

.surface-card--success {
  background:
    linear-gradient(180deg, rgb(195 244 0 / 0.08), transparent 42%),
    rgb(26 25 25 / 0.82);
  box-shadow:
    inset 0 0 0 1px rgb(195 244 0 / 0.16),
    var(--cn-shadow-soft);
}

.surface-card--warning {
  background:
    linear-gradient(180deg, rgb(255 113 108 / 0.08), transparent 42%),
    rgb(26 25 25 / 0.82);
  box-shadow:
    inset 0 0 0 1px rgb(255 113 108 / 0.18),
    var(--cn-shadow-soft);
}

.surface-card--interactive {
  transition:
    box-shadow var(--cn-transition),
    border-color var(--cn-transition);
}

.surface-card--interactive:hover {
  box-shadow:
    inset 0 0 0 1px rgb(143 245 255 / 0.22),
    var(--cn-shadow-soft),
    var(--cn-shadow-soft);
}

.surface-card--glow {
  box-shadow:
    inset 0 0 0 1px rgb(143 245 255 / 0.24),
    var(--cn-shadow-soft),
    var(--cn-shadow-neon);
}
</style>
