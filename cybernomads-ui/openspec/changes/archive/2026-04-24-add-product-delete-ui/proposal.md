## Why

The frontend Assets module currently supports listing, creating, and editing backend Products, but it does not expose the documented delete capability from `docs/api/products.yaml`. Now that the backend product delete flow is available, the frontend needs a safe deletion UX and a cleaner editor header so users can remove obsolete assets and navigate back from focused edit pages without extra visual noise.

## What Changes

- Add a real delete action to the `/assets` card overflow menu and connect it to `DELETE /api/products/{productId}`.
- Add user-visible delete confirmation, in-flight feedback, success removal, and recoverable error handling for missing or failed product deletion requests.
- Update the assets editor header to include a contextual return action back to `/assets`.
- Remove the non-product metadata block from the assets editor header so the focused page only shows persisted product-editing controls.

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `frontend-product-api-integration`: extend the real product API integration so assets can delete backend products through the documented delete contract and handle `204`/`404` outcomes.
- `frontend-information-architecture`: adjust the assets list and editor child-page structure so delete actions live in card overflow controls and the focused editor provides an explicit return path to the assets list.
- `frontend-visual-fidelity`: refine the assets list and editor chrome so delete controls, confirmation states, and the editor header cleanup match the approved focused-page visual language.

## Impact

- `src/entities/asset/api/asset-service.ts`
- `src/pages/assets/list/ui/AssetsListPage.vue`
- `src/pages/assets/editor/ui/AssetEditorPage.vue`
- `openspec/specs/frontend-product-api-integration/spec.md`
- `openspec/specs/frontend-information-architecture/spec.md`
- `openspec/specs/frontend-visual-fidelity/spec.md`
- Existing backend contract only: `docs/api/products.yaml`
