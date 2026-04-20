<script setup lang="ts">
import BaseButton from '@/shared/ui/base/BaseButton.vue'
import SurfaceCard from '@/shared/ui/base/SurfaceCard.vue'

const foundationItems = [
  'Vue 3 + TypeScript + Vite baseline',
  'Vue Router and Pinia already wired',
  'ESLint, Prettier, Vitest, and alias resolution',
  'Global design tokens aligned to the project design system',
]

const moduleLayers = [
  'app: bootstrapping, router, providers, global styles',
  'pages: route-level composition only',
  'widgets / features / entities: reserved for real UI implementation',
  'shared: reusable UI, hooks, config, api, styles, and utilities',
]

function scrollToStructure() {
  document.getElementById('structure')?.scrollIntoView({ behavior: 'smooth', block: 'start' })
}
</script>

<template>
  <main class="home-page">
    <section class="home-page__hero">
      <div class="home-page__lead">
        <span class="home-page__eyebrow">CyberNomads Frontend</span>
        <h1>Scaffold ready for UI implementation.</h1>
        <p class="home-page__summary">
          The app shell is in place. Use it as the base for the actual UI system and business
          flows once visual design starts.
        </p>
        <div class="home-page__actions">
          <BaseButton type="button" @click="scrollToStructure">Inspect module skeleton</BaseButton>
        </div>
      </div>

      <SurfaceCard tone="accent" class="home-page__status">
        <p class="home-page__label">Included now</p>
        <ul class="home-page__list">
          <li v-for="item in foundationItems" :key="item">{{ item }}</li>
        </ul>
      </SurfaceCard>
    </section>

    <section id="structure" class="home-page__grid">
      <SurfaceCard>
        <p class="home-page__label">Module layers</p>
        <ul class="home-page__list">
          <li v-for="item in moduleLayers" :key="item">{{ item }}</li>
        </ul>
      </SurfaceCard>

      <SurfaceCard>
        <p class="home-page__label">Next expected work</p>
        <ul class="home-page__list">
          <li>Replace placeholder page blocks with final UI layouts.</li>
          <li>Add business entities, features, and widgets as the design stabilizes.</li>
          <li>Expand route structure only when page-level semantics are clear.</li>
          <li>Keep design tokens as the single source of styling truth.</li>
        </ul>
      </SurfaceCard>
    </section>
  </main>
</template>

<style scoped lang="scss">
.home-page {
  width: min(100%, calc(var(--cn-shell-width) + 2 * var(--cn-space-8)));
  margin: 0 auto;
  padding: var(--cn-space-8);
}

.home-page__hero {
  display: grid;
  grid-template-columns: minmax(0, 1.5fr) minmax(18rem, 0.85fr);
  gap: var(--cn-space-6);
  align-items: stretch;
  min-height: 60vh;
}

.home-page__lead {
  display: flex;
  flex-direction: column;
  justify-content: center;
  gap: var(--cn-space-5);
  padding: var(--cn-space-8) 0;
}

.home-page__eyebrow,
.home-page__label {
  display: inline-flex;
  align-items: center;
  gap: var(--cn-space-2);
  font-size: 0.78rem;
  font-weight: 600;
  letter-spacing: 0.14em;
  text-transform: uppercase;
  color: var(--cn-on-surface-muted);
}

.home-page__eyebrow::before,
.home-page__label::before {
  content: '';
  width: 0.75rem;
  height: 0.75rem;
  border-radius: 999px;
  background: linear-gradient(135deg, var(--cn-primary), var(--cn-primary-container));
  box-shadow: 0 0 18px rgb(143 245 255 / 0.36);
}

h1 {
  margin: 0;
  max-width: 12ch;
  font-family: var(--cn-font-display);
  font-size: clamp(3rem, 7vw, 5.25rem);
  line-height: 0.94;
  letter-spacing: -0.05em;
}

.home-page__summary {
  max-width: 46rem;
  font-size: 1rem;
  line-height: 1.75;
  color: var(--cn-on-surface-soft);
}

.home-page__actions {
  display: flex;
  flex-wrap: wrap;
  gap: var(--cn-space-3);
}

.home-page__status {
  align-self: center;
}

.home-page__grid {
  display: grid;
  grid-template-columns: repeat(2, minmax(0, 1fr));
  gap: var(--cn-space-5);
}

.home-page__list {
  margin: var(--cn-space-4) 0 0;
  padding: 0;
  list-style: none;
  display: grid;
  gap: var(--cn-space-3);
}

.home-page__list li {
  position: relative;
  padding-left: var(--cn-space-5);
  color: var(--cn-on-surface-soft);
  line-height: 1.65;
}

.home-page__list li::before {
  content: '';
  position: absolute;
  left: 0;
  top: 0.6rem;
  width: 0.55rem;
  height: 0.55rem;
  border-radius: 999px;
  background: rgb(195 244 0 / 0.92);
  box-shadow: 0 0 12px rgb(195 244 0 / 0.28);
}

@media (max-width: 960px) {
  .home-page {
    padding: var(--cn-space-5);
  }

  .home-page__hero,
  .home-page__grid {
    grid-template-columns: 1fr;
  }

  .home-page__lead {
    padding: var(--cn-space-6) 0 var(--cn-space-3);
  }
}
</style>
