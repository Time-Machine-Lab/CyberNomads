## 1. Product Delete API Integration

- [x] 1.1 Extend `src/entities/asset/api/asset-service.ts` with a delete helper that calls `DELETE /api/products/{productId}` and treats `404` as a handled stale-record outcome for the UI flow
- [x] 1.2 Add or update asset entity tests so delete requests remain aligned with `docs/api/products.yaml` and continue to send no unsupported product fields

## 2. Assets List Delete Flow

- [x] 2.1 Update `src/pages/assets/list/ui/AssetsListPage.vue` so each card exposes a real overflow menu with a delete action that does not trigger card navigation
- [x] 2.2 Add confirmation, deleting, success-removal, stale-`404`, and recoverable error states for asset deletion on `/assets`
- [x] 2.3 Verify the list refresh strategy keeps deleted cards out of the rendered collection without refetching unrelated product detail data

## 3. Focused Editor Cleanup

- [x] 3.1 Update `src/pages/assets/editor/ui/AssetEditorPage.vue` to add a visible return action back to `/assets` in both create and edit flows
- [x] 3.2 Remove the unsupported target-label metadata block from the editor header and rebalance the focused header layout around title plus status

## 4. Verification

- [x] 4.1 Add or update page-level tests covering the assets overflow-menu delete flow and editor return affordance
- [x] 4.2 Run frontend verification for typecheck, lint, tests, and a real backend smoke check for list-edit-delete behavior against the product runtime
