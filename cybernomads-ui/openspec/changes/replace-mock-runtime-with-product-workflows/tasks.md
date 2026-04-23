## 1. Preparation

- [x] 1.1 Archive or baseline the completed `integrate-product-module-api` change before applying this broader runtime replacement
- [x] 1.2 Inventory every production import or runtime dependency on `@/shared/mocks/runtime`, `mockScenarioId`, `VITE_USE_MOCK_API`, `VITE_MOCK_SCENARIO`, and domain real/mock toggles
- [x] 1.3 Confirm current backend availability for Agent Services, Account Onboarding Sessions, Accounts, Products, Strategies, Traffic Works, and Tasks without modifying `docs/api` or `docs/sql`

## 2. Real Backend Entity Adapters

- [x] 2.1 Refactor shared runtime configuration so production code uses backend base URL/proxy settings instead of mock/scenario switches
- [x] 2.2 Implement or complete Agent Services API types, mappers, and entity service methods for current service, status, connection verification, and capability provisioning
- [x] 2.3 Refactor Console service and Console pages to derive setup state from Agent Services API responses instead of console mock data
- [x] 2.4 Complete Account Onboarding, Accounts, Products, and Strategies services so all production paths use documented backend endpoints with no mock fallback
- [x] 2.5 Implement TrafficWork types, mappers, and service methods for list, detail, create, update, start, pause, end, archive, and delete
- [x] 2.6 Implement Task types, mappers, and service methods for list, detail, status updates, output record list, and output record creation

## 3. Product-Domain Page Workflow

- [x] 3.1 Remove `mockScenarioId` watchers and shared mock imports from Console, Accounts, Assets, Strategies, Workspaces, runtime, and intervention pages
- [x] 3.2 Update Workspaces list page to render backend TrafficWork summaries and use backend lifecycle/context-preparation statuses
- [x] 3.3 Update Workspaces create page to load products, strategies, and consumable accounts from backend APIs and submit `POST /api/traffic-works`
- [x] 3.4 Update Workspaces runtime page to interpret route id as `trafficWorkId`, load TrafficWork detail, and display Tasks API summaries without fake execution logs
- [x] 3.5 Update task intervention page to load Task detail and output records, and submit output notes through `POST /api/tasks/{taskId}/outputs`
- [x] 3.6 Update user-facing empty, loading, conflict, not-found, and backend-unavailable states across the real product-domain workflow

## 4. Mock/Test Runtime Removal

- [x] 4.1 Remove production `shared/mocks/runtime` usage after all entity/page paths are real-backed
- [x] 4.2 Move required deterministic sample data into `tests/fixtures` or test-local stubs without importing production mock runtime
- [x] 4.3 Rewrite mock-scenario workflow tests to use fixture-backed request stubs and contract-shaped backend responses
- [x] 4.4 Add or update gated backend smoke tests for Agent service status, account onboarding/account list, product, strategy, traffic work, and task flows

## 5. Verification

- [x] 5.1 Run `openspec validate replace-mock-runtime-with-product-workflows --strict`
- [x] 5.2 Run frontend typecheck, lint, and full automated tests
- [x] 5.3 Run real backend smoke verification for the full product-domain flow: configure/read Agent service, prepare account/product/strategy, create TrafficWork, read Tasks, and open task detail/output records
- [x] 5.4 Verify no production `src/` file imports `@/shared/mocks/runtime` or references mock scenario runtime controls
