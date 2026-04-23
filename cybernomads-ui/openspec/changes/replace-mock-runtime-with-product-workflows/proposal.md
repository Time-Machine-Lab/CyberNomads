## Why

The frontend has started integrating real product APIs, but most page collaboration still depends on `shared/mocks/runtime`, `mockScenarioId`, and page-specific mock/testing flows. We need to move the application workflow to the real product-domain backend contracts so users can complete the MVP path with actual products, strategies, accounts, agent services, traffic works, and tasks instead of scenario data.

## What Changes

- Replace product runtime page dependencies on shared mock scenarios with real backend API adapters aligned to `docs/api/*.yaml`.
- Reframe the primary frontend workflow around product-domain business objects: configure Agent service, onboard account, create product, create strategy, create traffic work from product + strategy + account bindings, inspect tasks, and manage traffic work lifecycle.
- Remove page imports of `mockScenarioId`, `resetMockRuntime`, `setMockScenario`, and direct `shared/mocks/runtime` data from production source files.
- Convert mock-driven integration tests to explicit test fixtures, fetch stubs, or backend smoke tests that do not act as product runtime data sources.
- Rename or map frontend "workspace/team" behavior to backend `TrafficWork` semantics without changing routes unless required for compatibility.
- Keep API and SQL files read-only; if a required backend behavior is missing from existing contracts, mark it as a backend dependency rather than inventing frontend-only data.
- **BREAKING**: `VITE_USE_MOCK_API`, `VITE_MOCK_SCENARIO`, and production `shared/mocks/runtime` behavior stop being supported as normal application runtime controls.

## Capabilities

### New Capabilities
- `frontend-real-backend-runtime`: Defines the frontend requirement to use real backend API adapters as the application runtime data source across product-domain modules.
- `frontend-product-domain-workflow`: Defines the end-to-end product-domain workflow across Agent service, account onboarding, product, strategy, traffic work, and task pages.

### Modified Capabilities
- `frontend-core-workflows`: Replace mock-session first-entry and workspace execution assumptions with real backend product-domain flow requirements.
- `frontend-mock-data-runtime`: Deprecate production mock runtime requirements and constrain mock/test data to test-only fixtures or explicit request stubs.
- `frontend-information-architecture`: Clarify that existing routes may remain user-facing compatibility routes while their runtime semantics align to backend product-domain resources.

## Impact

- Affected frontend runtime: `src/shared/mocks/runtime.ts`, `src/shared/config/env.ts`, all entity API modules, and pages importing `mockScenarioId` or mock data.
- Affected pages: Console/Agent setup, Accounts onboarding/list/detail, Assets product list/editor, Strategies list/editor, Workspaces list/create/runtime/intervention.
- API dependencies: `docs/api/agent-services.yaml`, `account-onboarding-sessions.yaml`, `accounts.yaml`, `products.yaml`, `strategies.yaml`, `traffic-works.yaml`, and `tasks.yaml`.
- Data dependencies: corresponding `docs/sql/*.sql` contracts for agent services, accounts, products, strategies, traffic works, and tasks.
- Test impact: existing scenario-based workflow tests must be rewritten to use deterministic fixtures/fetch stubs or real backend smoke gates instead of the production mock runtime.
- OpenSpec dependency: the completed `integrate-product-module-api` change should be archived or treated as baseline before this broader replacement is applied.
