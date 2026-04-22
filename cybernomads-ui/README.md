# CyberNomads UI

Vue 3 + TypeScript + Vite frontend scaffold for the CyberNomads web client.

## Scripts

- `npm run dev`: start local development server
- `npm run build`: run type check and create production build
- `npm run preview`: preview production build
- `npm run typecheck`: run TypeScript checks
- `npm run lint`: run ESLint
- `npm run lint:fix`: run ESLint with autofix
- `npm run format`: format the project with Prettier
- `npm run format:check`: validate formatting
- `npm run test`: run Vitest in watch mode
- `npm run test:run`: run Vitest once

## Local Backend Integration

- `VITE_USE_REAL_ACCOUNT_API=true`: enable the real account module backend
- `VITE_USE_REAL_STRATEGY_API=true`: enable the real strategy module backend
- `VITE_API_PROXY_TARGET=http://127.0.0.1:3000`: shared local `/api` proxy target for real backend modules

If only the strategy module needs the real backend, keep other modules on mock data and only enable `VITE_USE_REAL_STRATEGY_API`.
