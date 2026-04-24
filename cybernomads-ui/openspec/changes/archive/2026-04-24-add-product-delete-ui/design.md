## Context

The frontend `/assets` module already maps backend Products into the existing asset-oriented route structure, but it only supports list, detail, create, and update flows. The backend contract in `docs/api/products.yaml` now documents `DELETE /api/products/{productId}`, while the current assets list still renders a non-interactive overflow icon and the focused editor header still shows a target-label block that is not part of the persisted product contract.

This change needs to align three layers at once: entity API integration, list-page interaction design, and focused editor chrome. The result must stay inside the existing `/assets` information architecture, continue to identify records by `productId`, and avoid inventing any backend fields beyond the published product contract.

## Goals / Non-Goals

**Goals:**
- Expose product deletion from the assets list through the documented `DELETE /api/products/{productId}` contract.
- Keep deletion separate from the card's primary click target so users can still open the editor without accidental destructive actions.
- Provide clear deletion feedback for confirmation, pending state, success removal, stale `404` responses, and recoverable request failures.
- Add an explicit return affordance to the focused asset editor and remove unsupported metadata chrome from the editor header.

**Non-Goals:**
- Do not add bulk delete, restore, archive, recycle bin, or version recovery behavior.
- Do not add delete controls to the asset editor page in this change.
- Do not change `docs/api/products.yaml`, `docs/sql/*.sql`, or backend contracts.
- Do not persist target labels, attachments, summaries, categories, or other UI-only metadata through product deletion or save requests.

## Decisions

### Reuse the existing card overflow area as the destructive-action entry point

The current assets list already renders a `more_vert` affordance on each card. This change will promote that area into a real overflow trigger and keep the card body itself as the primary navigation target for `/assets/:assetId/edit`.

Why this approach:
- It preserves the current information density and avoids adding a second visible button row to each card.
- It matches the user's request to attach delete under the first screenshot's top-right control.
- It reduces accidental deletes because destructive actions stay one interaction deeper than the normal edit/open action.

Alternative considered: add a persistent delete button directly on each card footer. This was rejected because it competes with the card's primary action and makes destructive controls too prominent in a dense grid.

### Use a frontend confirmation surface before calling the delete contract

Deletion will require an explicit confirmation step before the page issues `DELETE /api/products/{productId}`. The confirmation state can be implemented with the existing page-local Vue state and does not require a new dependency or a global modal framework.

Why this approach:
- The backend contract is irreversible within MVP, so the frontend should add a final user confirmation.
- Page-local state is sufficient because the delete workflow is contained to `/assets`.
- It keeps the implementation simple and testable without introducing a cross-app dialog abstraction.

Alternative considered: call delete immediately and rely on a later toast undo. This was rejected because the documented backend flow does not provide restore semantics.

### Remove deleted cards locally after a successful or stale delete outcome

After a confirmed delete request, the list page will remove the card from the current in-memory collection when the backend returns `204`. If the backend returns `404`, the frontend will treat the card as already gone, remove it from the list, and show a recoverable informational message rather than blocking the user.

Why this approach:
- The list already holds the active product summaries, so local removal is faster and simpler than reloading the whole collection.
- `404` indicates the current UI is stale relative to backend state; removing the stale card keeps the user in sync without an unnecessary retry loop.
- The pattern remains consistent with the stable `productId` identity already used by the list and editor routes.

Alternative considered: always refetch `GET /api/products` after delete. This was rejected because it adds avoidable latency and failure points for a simple single-record mutation.

### Simplify the focused asset editor header to persisted product controls only

The editor header will keep the title input and status pill, add a contextual return action to `/assets`, and remove the target-label section shown in the current header. This keeps the focused page aligned with the product contract, where only `name` and `contentMarkdown` are persisted through the backend API.

Why this approach:
- The current target-label block creates noise in the exact area the user called out and suggests backend-persistent metadata that does not exist in `docs/api/products.yaml`.
- A visible back action is required because the focused editor shell intentionally removes the global sidebar.
- The simplified header reinforces that the editor is a focused product-editing surface rather than a mixed metadata dashboard.

Alternative considered: keep the target-label chips but mark them as local-only. This was rejected because the user explicitly asked to remove the highlighted content and the chips still imply product fields that are out of scope for this backend integration.

## Risks / Trade-offs

- [Risk] Overflow-menu clicks may accidentally bubble into the card navigation action. -> Mitigation: treat the menu trigger and menu items as event boundaries that stop propagation before opening the editor route.
- [Risk] Local list removal after delete can diverge from backend state if a later request fails for unrelated reasons. -> Mitigation: only mutate the local list after `204` or `404`, and keep error cases non-destructive so the user can retry or reload.
- [Risk] Treating `404` as a successful stale-delete cleanup can hide backend environment issues. -> Mitigation: show a contextual message that the asset no longer exists and reserve silent removal for the card state only.
- [Risk] Removing the target-label block changes the visual balance of the editor header. -> Mitigation: rebalance the header with a dedicated return action and keep the title/status group as the dominant focal point.

## Migration Plan

1. Extend the asset entity API with a delete function mapped to `DELETE /api/products/{productId}`.
2. Update the assets list page to support overflow-menu state, delete confirmation state, request progress, and success/error messaging.
3. Update the focused asset editor header to add a return action and remove the unsupported target-label block.
4. Add or update tests for delete request compliance, list-state removal, `404` handling, and editor contextual navigation.
5. Verify the `/assets` list and `/assets/:assetId/edit` flows against the real backend runtime.

Rollback remains low risk because this change is frontend-only: disabling or removing the delete affordance returns the list to its prior read/create/update behavior without changing backend contracts or route structure.

## Open Questions

- None for proposal readiness. The published product delete contract and the existing `/assets` route structure provide enough information to implement this change without a backend API update.
