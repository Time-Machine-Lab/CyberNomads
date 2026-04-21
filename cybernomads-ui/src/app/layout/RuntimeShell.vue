<template>
  <div class="runtime-shell">
    <RouterView />
  </div>
</template>

<style scoped lang="scss">
.runtime-shell {
  min-height: 100vh;
  color: var(--cn-on-surface);
  background:
    radial-gradient(circle at top right, rgb(74 162 249 / 0.08), transparent 26rem),
    radial-gradient(circle at bottom left, rgb(143 245 255 / 0.06), transparent 28rem),
    linear-gradient(180deg, #070808 0%, #0d0d0d 40%, #080808 100%);
}
</style>
