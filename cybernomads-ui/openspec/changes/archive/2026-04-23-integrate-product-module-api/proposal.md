## Why

The frontend asset module is still backed by mock-only data while the backend product module now has published create, update, list, and detail contracts. We need to connect the `/assets` product-facing UI to the real product API so the MVP can complete product configuration against backend runtime behavior instead of local mock state.

## What Changes

- Wire the `/assets` list and editor flows to the product API defined in `docs/api/products.yaml` when real product API mode is enabled.
- Preserve `/assets` as the frontend route and user-facing module name while mapping it to backend `Product` semantics.
- Add product contract mapping for summary list data, full markdown detail loading, product creation, and product update.
- Keep mock mode available through the existing shared API boundary for local visual review and offline development.
- Add loading, empty, validation, and request failure behavior for the product list and editor flows.
- Exclude product deletion, attachment upload persistence, draft/publish/version-chain behavior, and API/SQL contract changes from this change.

## Capabilities

### New Capabilities
- `frontend-product-api-integration`: Covers the frontend behavior required to integrate the `/assets` product UI with the backend product API contracts.

### Modified Capabilities
- `frontend-mock-data-runtime`: Clarifies that product mock data remains available only behind the same asset/product API boundary used by pages and must not block real API switching.

## Impact

- Affected frontend code: `src/entities/asset/api/asset-service.ts`, `src/entities/asset/model/types.ts`, `/assets` list and editor pages, shared environment flags, and tests around product list/create/update/detail flows.
- API dependency: `docs/api/products.yaml`, specifically `GET /api/products`, `POST /api/products`, `GET /api/products/{productId}`, and `PUT /api/products/{productId}`.
- Data dependency: `docs/sql/products.sql` for stable product identity, non-unique product names, content references, and timestamp semantics.
- Backend dependency: the product module runtime must expose the published product endpoints before frontend real-api verification can pass end to end.
