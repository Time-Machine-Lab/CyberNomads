## 1. Product Entity API Boundary

- [x] 1.1 Add product DTO, request input, and mapper types under `src/entities/asset/model` aligned with `docs/api/products.yaml` and `docs/sql/products.sql`
- [x] 1.2 Add `VITE_USE_REAL_PRODUCT_API` to shared env parsing and example environment documentation
- [x] 1.3 Refactor `src/entities/asset/api/asset-service.ts` to support shared mock/real source switching for list, detail, create, and update flows

## 2. Assets Page Integration

- [x] 2.1 Update `/assets` list page to load product summaries from the entity API and render loading, empty, and request-failure states
- [x] 2.2 Update `/assets/new` and `/assets/:assetId/edit` editor flows to load full product detail, validate required fields, and submit only `name` plus `contentMarkdown`
- [x] 2.3 Add recoverable not-found and save-failure handling in the assets editor without discarding in-progress user input

## 3. Verification

- [x] 3.1 Add unit/integration tests for product mapper logic, source switching, and create/update payload compliance with `docs/api/products.yaml`
- [x] 3.2 Add page-level tests for assets list and editor states in both mock and real product API modes
- [x] 3.3 Run typecheck, lint, tests, and a real product API smoke verification against the backend runtime when available
