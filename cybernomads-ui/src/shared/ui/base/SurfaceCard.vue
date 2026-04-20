<script setup lang="ts">
withDefaults(
  defineProps<{
    tone?: 'default' | 'accent'
  }>(),
  {
    tone: 'default',
  },
)
</script>

<template>
  <section class="surface-card" :class="`surface-card--${tone}`">
    <slot />
  </section>
</template>

<style scoped lang="scss">
.surface-card {
  position: relative;
  padding: var(--cn-space-6);
  border-radius: var(--cn-radius-lg);
  background: rgb(19 19 19 / 0.78);
  box-shadow:
    inset 0 0 0 1px var(--cn-outline-ghost),
    var(--cn-shadow-soft);
  backdrop-filter: blur(20px);
}

.surface-card--accent {
  background:
    linear-gradient(180deg, rgb(143 245 255 / 0.08), transparent 42%),
    rgb(26 25 25 / 0.82);
  box-shadow:
    inset 0 0 0 1px rgb(143 245 255 / 0.18),
    var(--cn-shadow-ambient);
}
</style>
