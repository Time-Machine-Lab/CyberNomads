<template>
  <div class="focused-shell">
    <RouterView />
  </div>
</template>

<style scoped lang="scss">
.focused-shell {
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top right, rgb(0 238 252 / 0.06), transparent 28rem),
    linear-gradient(180deg, #090909 0%, #0e0e0e 36%, #090909 100%);
}
</style>
