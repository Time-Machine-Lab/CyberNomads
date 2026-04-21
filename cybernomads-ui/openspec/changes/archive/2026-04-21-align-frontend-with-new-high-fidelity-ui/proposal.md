## Why

The previous high-fidelity frontend pass diverged from the approved redesign because it preserved the old information architecture and forced too many pages into a single generic application shell. We need a new change now so implementation can align with the grouped `code.html` references from the new UI set, preserve the correct page-shell boundaries, and avoid another round of low-fidelity rework.

## What Changes

- Redefine the top-level product structure around `控制台`、`资产列表`、`策略库`、`账号池`、`推广工作区`, with `控制台` as the default landing module.
- Replace the single-shell assumption with three approved shell modes:
  - outer module pages use a unified left sidebar and no top bar
  - focused editor/configuration pages remove the global sidebar and keep only contextual return affordances
  - runtime execution pages use an immersive control-environment shell
- Define the control-console first-run workflow so the default mock state is `未配置`, entering OpenClaw configuration can move the user back to a `已配置` console state for the current session, and a browser refresh resets the console to `未配置`.
- Define the primary workspace flow as `推广工作区列表 -> 创建引流团队 -> 工作环境 -> 任务干预与提示词编辑`.
- Re-baseline high-fidelity requirements around the new grouped UI `code.html` references, prioritizing content-panel fidelity while allowing a standardized unified sidebar for outer pages.
- Keep backend contracts unchanged in this change. Existing `docs/api/*.yaml` and `docs/sql/*.sql` remain read-only references, and any later real integration for workspaces, assets, strategies, accounts, or agents will require separate backend contract updates.

## Capabilities

### New Capabilities
- None.

### Modified Capabilities
- `frontend-information-architecture`: change the approved top-level module structure, routing ownership, and shell assignment rules to match the new dashboard-first UI.
- `frontend-visual-fidelity`: change shell composition and page fidelity rules to remove top bars, emphasize content panels, and distinguish outer, focused, and runtime shells.
- `frontend-core-workflows`: change first-entry, console setup, workspace creation, execution, and task-intervention behavior to match the new reference flow.
- `frontend-mock-data-runtime`: change mock runtime behavior to support session-scoped console setup transitions, reset-on-refresh behavior, and shell-aware mock scenarios.

## Impact

- Affected frontend areas: router structure, global layout system, dashboard and agent entry pages, workspace flows, resource editor/detail pages, execution pages, and shared mock runtime boundaries.
- Affected supporting assets: visual tokens, sidebar branding resources, screenshot-derived placeholders, and page-specific reference mappings.
- APIs and SQL: no changes in this proposal. The existing `products` API and SQL contracts remain untouched and do not get extended by this change.
- Dependencies: implementation must continue to follow `docs/spec/Cybernomads前端开发规范.md` and the approved design direction from `docs/spec/DESIGN.md`, while using the new grouped UI `code.html` references as the page-level source of truth.
