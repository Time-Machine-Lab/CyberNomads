<script setup lang="ts">
interface Props {
  label: string
  accent?: 'cyan' | 'lime' | 'blue' | 'red'
  compact?: boolean
}

withDefaults(defineProps<Props>(), {
  accent: 'cyan',
  compact: false,
})
</script>

<template>
  <div class="placeholder-asset" :class="[`placeholder-asset--${accent}`, { 'placeholder-asset--compact': compact }]">
    <div class="placeholder-asset__core">
      <span>{{ label }}</span>
    </div>
  </div>
</template>

<style scoped lang="scss">
.placeholder-asset {
  position: relative;
  display: grid;
  place-items: center;
  min-height: 8.5rem;
  border-radius: var(--cn-radius-xl);
  background:
    radial-gradient(circle at top, rgb(255 255 255 / 0.03), transparent 55%),
    linear-gradient(180deg, rgb(255 255 255 / 0.015), rgb(0 0 0 / 0.08));
  box-shadow: inset 0 0 0 1px var(--cn-outline-ghost);
}

.placeholder-asset--compact {
  min-height: 4.25rem;
  border-radius: var(--cn-radius-lg);
}

.placeholder-asset::before,
.placeholder-asset::after {
  content: '';
  position: absolute;
  inset: 1rem;
  border-radius: inherit;
  border: 1px dashed rgb(255 255 255 / 0.08);
}

.placeholder-asset::after {
  inset: 1.75rem;
}

.placeholder-asset__core {
  position: relative;
  z-index: 1;
  display: grid;
  place-items: center;
  width: 4rem;
  height: 4rem;
  border-radius: 1rem;
  background: rgb(255 255 255 / 0.03);
  box-shadow: inset 0 0 0 1px rgb(255 255 255 / 0.04);
}

.placeholder-asset__core span {
  font-family: var(--cn-font-body);
  font-size: 0.82rem;
  font-weight: 600;
}

.placeholder-asset--cyan .placeholder-asset__core {
  color: var(--cn-primary);
  box-shadow: inset 0 0 0 1px rgb(143 245 255 / 0.16);
}

.placeholder-asset--lime .placeholder-asset__core {
  color: var(--cn-secondary);
  box-shadow: inset 0 0 0 1px rgb(195 244 0 / 0.16);
}

.placeholder-asset--blue .placeholder-asset__core {
  color: var(--cn-tertiary);
  box-shadow: inset 0 0 0 1px rgb(101 175 255 / 0.16);
}

.placeholder-asset--red .placeholder-asset__core {
  color: var(--cn-error);
  box-shadow: inset 0 0 0 1px rgb(255 113 108 / 0.16);
}
</style>
