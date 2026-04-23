## Context

The current `/assets` frontend module represents the MVP product configuration surface but still uses `src/entities/asset/api/asset-service.ts` as a mock-only adapter. The backend product module has published contracts in `docs/api/products.yaml` and runtime requirements in `cybernomads-backend/openspec/specs/product-module-runtime/spec.md`, covering create, update, list, and detail only.

The frontend must preserve the existing information architecture and visual route naming: users continue to enter product content through `localhost:5173/assets`. Internally, the asset entity becomes the frontend view model for backend `Product` records, with mapping kept in the entity layer rather than page components.

## Goals / Non-Goals

**Goals:**
- Connect `/assets` list and editor pages to `GET /api/products`, `POST /api/products`, `GET /api/products/{productId}`, and `PUT /api/products/{productId}`.
- Keep mock product data available through the same entity API boundary for local UI review.
- Add a real product API feature flag aligned with the existing `VITE_USE_REAL_ACCOUNT_API` and `VITE_USE_REAL_STRATEGY_API` pattern.
- Preserve the existing frontend route and high-fidelity page structure while replacing page-local display assumptions with data derived from product API responses.
- Surface loading, empty, not-found, validation, saving, and request failure states in the list and editor flows.

**Non-Goals:**
- Do not add delete behavior because the backend product contracts explicitly exclude deletion in MVP.
- Do not change `docs/api/products.yaml` or `docs/sql/products.sql`.
- Do not persist attachments, target labels, platform metadata, draft status, publish state, or version history through the product API.
- Do not rename the frontend `/assets` route during this change.

## Decisions

### Use a source switch in the asset entity API

Add `VITE_USE_REAL_PRODUCT_API` and resolve product data source in `asset-service.ts` using the same shape as strategy/account services: default mock, real when the product flag is enabled, and optional per-call source override for tests. This keeps the switch local to the entity API and avoids leaking environment checks into pages.

Alternative considered: infer real product mode from `VITE_USE_MOCK_API=false`. This was rejected because existing modules already use domain-specific real API flags, and product联调 needs to be enabled independently while other modules can remain mocked.

### Keep `AssetRecord` as the UI model and add explicit product DTO mapping

Define product DTO/input types that mirror `docs/api/products.yaml`: `ProductSummary`, `ProductDetail`, `CreateProductRequest`, `UpdateProductRequest`, and `ListProductsResult`. Map them into the existing `AssetRecord` display model through an asset mapper, using:

- `productId` -> `AssetRecord.id`
- `name` -> `AssetRecord.name`
- `contentMarkdown` -> `AssetRecord.markdown`
- `updatedAt` / `createdAt` -> timestamp fields
- derived `summary` from the first non-heading markdown content line when the list endpoint does not provide full content

The mapper must not invent backend-only fields such as product status, content version, deletion flags, or unique name semantics. UI-only fields such as category, tags, target labels, and attachments may be deterministic frontend defaults when the real API lacks those fields.

Alternative considered: rename the entity module from `asset` to `product`. This was rejected for this change because it would create avoidable route/module churn during API联调. A future naming cleanup can be proposed separately if product terminology becomes the frontend IA source of truth.

### Use product detail only when full markdown is required

The list page must call `GET /api/products` and render summary cards from `ProductSummary` without expecting `contentMarkdown`. The editor page must call `GET /api/products/{productId}` when editing so it receives complete markdown content.

Alternative considered: call detail for every card in the list to derive summaries from full markdown. This was rejected because it violates the published separation between list summary and full detail responsibilities.

### Save maps to create/update contracts only

`saveAsset` should call `POST /api/products` when no id is present and `PUT /api/products/{productId}` when editing. The request body must contain only `name` and `contentMarkdown`. UI-only fields remain local presentation state and must not be sent to the backend product API.

Alternative considered: keep sending the richer `SaveAssetInput` as-is. This was rejected because it would drift from `CreateProductRequest` and `UpdateProductRequest`.

### Pages own interaction state, not API details

The `/assets` pages should track loading, saving, empty, not-found, and error states locally, but all request paths and DTO mapping stay inside `entities/asset/api` and `entities/asset/model`. This follows the frontend development spec's page/entity/shared dependency boundaries.

Alternative considered: introduce a Pinia store for assets immediately. This was rejected because list/editor state is localized and does not yet require shared cross-route caching.

## Risks / Trade-offs

- [Risk] The backend may not be running or may expose endpoints under a different base URL during联调 → Mitigation: keep `VITE_API_BASE_URL` as the single base URL input and surface request failures with retry guidance.
- [Risk] The product list contract does not include summaries, categories, tags, or attachments used by the high-fidelity cards → Mitigation: derive only safe display fallbacks on the frontend and avoid treating UI-only fields as backend data.
- [Risk] Duplicate product names are valid backend behavior but may surprise users → Mitigation: never use product name as a route key or edit identity; always navigate by stable `productId`.
- [Risk] Mock and real modes can diverge if they use different shapes → Mitigation: route both modes through the same `AssetRecord` mapper boundary and cover both with integration tests.
- [Risk] The current editor has preview/upload affordances not backed by product contracts → Mitigation: keep unsupported controls visually non-persistent or explicitly local until separate backend contracts exist.

## Migration Plan

1. Add product DTO/input types and mapper functions in the asset entity model.
2. Add `VITE_USE_REAL_PRODUCT_API` to the shared environment config and example env file.
3. Update `asset-service.ts` to support mock and real sources through the same exported functions.
4. Update `/assets` list and editor pages to render loading, empty, not-found, validation, saving, and request failure states.
5. Add tests for mapper behavior, source switching, list/detail load paths, create/update request payloads, and 404/error handling.
6. Verify mock mode still renders the current high-fidelity pages, then run real product联调 with `VITE_USE_REAL_PRODUCT_API=true`.

Rollback is straightforward: disable `VITE_USE_REAL_PRODUCT_API` to return `/assets` to the shared mock runtime without route or page structure changes.

## Open Questions

- Should the frontend copy say "资产" for MVP continuity or shift visible labels to "产品" once product API联调 is complete?
- Does the backend runtime return `createdAt` in create/update responses immediately in the same ISO 8601 UTC format defined by `docs/api/products.yaml`?
