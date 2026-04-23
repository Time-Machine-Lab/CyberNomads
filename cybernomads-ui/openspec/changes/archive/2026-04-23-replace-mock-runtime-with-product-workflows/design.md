## Context

The current frontend began as a high-fidelity MVP shell and still uses `shared/mocks/runtime` as the coordination layer for several modules. Even after product API integration, many pages still import `mockScenarioId`, watch scenario changes, or force mock sources for workspace prerequisites. This means the UI can look complete while the real product-domain business flow remains disconnected.

The backend now has top-level API contracts for the required MVP domains: Agent Services, Account Onboarding Sessions, Accounts, Products, Strategies, Traffic Works, and Tasks. The frontend should treat those contracts as the application runtime source of truth and reserve artificial data only for tests.

## Goals / Non-Goals

**Goals:**
- Replace production page dependencies on `shared/mocks/runtime` with real API-backed entity services.
- Align the full business flow to backend product-domain semantics:
  Agent service setup -> account onboarding -> product creation -> strategy creation -> traffic work creation -> task inspection/intervention.
- Map existing frontend routes and visual modules to real domain resources without introducing unnecessary route churn.
- Remove `mockScenarioId` watches and scenario controls from production pages.
- Rewrite tests so they use explicit fixtures/fetch stubs or real backend smoke gates rather than the production mock runtime.

**Non-Goals:**
- Do not modify `docs/api/*.yaml` or `docs/sql/*.sql`.
- Do not add frontend-only APIs, SQL structures, task logs, platform script schemas, or deletion semantics beyond documented backend contracts.
- Do not rebuild the visual design system or redesign page layouts.
- Do not require route renaming during this change; compatibility labels such as `/assets` and `/workspaces` may remain while runtime semantics shift to Product and TrafficWork.

## Decisions

### Treat real backend APIs as the only production runtime boundary

Production entity services should call documented backend endpoints by default. Domain-specific real API flags introduced during incremental integration should be removed or collapsed into backend availability/configuration, because the product runtime should no longer have a supported mock mode.

Alternative considered: keep domain toggles such as `VITE_USE_REAL_PRODUCT_API` and `VITE_USE_REAL_STRATEGY_API`. This was rejected because the requested outcome is to remove mock/test runtime behavior, not keep parallel product runtimes.

### Keep compatibility routes while changing domain semantics

The user-facing modules can remain Console, Assets, Strategies, Accounts, and Workspaces for now. Internally:

- Assets maps to Product.
- Workspaces maps to TrafficWork.
- Runtime/intervention pages read Task data by `trafficWorkId`.

Alternative considered: rename routes immediately to `/products` and `/traffic-works`. This was deferred to avoid mixing IA migration with runtime replacement. The implementation can expose redirects later if product naming becomes the approved UX language.

### Create entity adapters for missing real domains

The current product, account, and strategy services are already partly real-capable. The missing/weak adapters are Agent service, Console overview, Workspace/TrafficWork, Task execution, and intervention. These should be refactored around DTO mappers and request functions:

- `agent-service` -> `docs/api/agent-services.yaml`
- `console-service` -> status aggregation from Agent service plus prerequisite summaries
- `workspace-service` -> `docs/api/traffic-works.yaml`
- task/intervention services -> `docs/api/tasks.yaml`

Alternative considered: centralize all API calls in a single workflow service. This was rejected because it would violate the existing entity-layer boundary and make pages depend on a large orchestration object.

### Use explicit test fixtures instead of production mock runtime

Tests should move scenario data into `tests/fixtures` or per-test fetch stubs. Page tests should assert the same entity APIs and backend contract shapes the production code uses, while optional smoke tests can run only when backend env variables are present.

Alternative considered: move `shared/mocks/runtime` into tests unchanged. This was rejected because the mock runtime encodes product behavior and scenarios too broadly; tests should own only the fixture data required for each case.

### Respect backend scope gaps instead of filling them in the UI

TrafficWork contracts intentionally do not expose execution logs or platform script details. Task contracts expose task summaries, details, status, and output records, not streaming logs. The frontend execution pages should show what those contracts support and avoid implying unsupported real-time logs unless a later backend contract adds them.

Alternative considered: preserve the current mock execution log model as UI-only. This was rejected because it would recreate fake runtime behavior in production.

## Risks / Trade-offs

- [Risk] Some high-fidelity panels rely on fields not present in backend contracts -> Mitigation: derive safe display labels from documented fields or hide unsupported panels until contracts exist.
- [Risk] Removing mock runtime can make local development dependent on backend availability -> Mitigation: use test fixtures for automated tests and document local backend startup as part of dev flow.
- [Risk] Existing workflow tests cover visual scenarios rather than backend business semantics -> Mitigation: rewrite tests around API contract fixtures and add backend smoke gates for critical flows.
- [Risk] Task execution pages may feel less dynamic after removing fake logs -> Mitigation: make the distinction explicit by showing task status/output records and contract-backed empty states.
- [Risk] Completed but unarchived `integrate-product-module-api` may overlap -> Mitigation: archive it first or treat its product adapter work as baseline and avoid redoing its files except where mock runtime removal requires cleanup.

## Migration Plan

1. Archive or baseline `integrate-product-module-api`.
2. Inventory all production imports from `shared/mocks/runtime` and remove them from page/entity source code.
3. Refactor entity services and mappers for Agent Service, Console, TrafficWork, Tasks, and any remaining mock-backed Account/Product/Strategy paths.
4. Update pages to load from entity services without `mockScenarioId`, including loading, empty, not-found, conflict, and failure states.
5. Replace workspace creation with TrafficWork creation using product, strategy, and consumable account bindings.
6. Replace runtime/intervention mock flow with task list/detail/output-record behavior scoped by `trafficWorkId`.
7. Move test data to explicit fixtures/fetch stubs and remove production mock runtime dependencies from tests.
8. Remove `VITE_USE_MOCK_API`, `VITE_MOCK_SCENARIO`, and domain real/mock toggles from production config after all pages are real-backed.
9. Run typecheck, lint, tests, OpenSpec validation, and backend smoke tests for the full product-domain flow.

Rollback: keep this as one change boundary. If a backend endpoint is unavailable, pause implementation and mark the specific task as backend-dependent rather than restoring mock runtime behavior.

## Open Questions

- Should the visible module label `资产列表` be renamed to `产品` in a separate IA change after real runtime migration?
- Should task output records become the only execution observation surface until a formal execution-log API exists?
