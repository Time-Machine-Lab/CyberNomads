## Context

The current frontend codebase still reflects the previous information architecture and a single outer-shell assumption. The router is centered on legacy module ownership, the application shell expects one persistent global layout, and the earlier high-fidelity pass overfit those assumptions instead of the new grouped UI references.

This change introduces a second redesign pass driven by the grouped UI set under `temp/新版ui`. In that reference set, `code.html` is the page-level source of truth, while `docs/spec/DESIGN.md` and `docs/spec/Cybernomads前端开发规范.md` define the broader visual direction and implementation constraints. The user also clarified several product rules that materially change the frontend structure:

- the product lands on `控制台`
- the old `Agents` top-level concept is collapsed into the `控制台` module
- outer pages keep a unified left sidebar, but internal editor/configuration pages must not reuse that shell
- all top bars from the exported references are noise and should be removed from the real product shell
- the console must start in `未配置`, transition to `已配置` after mock setup in the same session, and reset to `未配置` on browser refresh

The current top-level API and SQL contracts only define `products` and are not extended by this change. This redesign therefore remains frontend-structure and mock-runtime work only; any later real backend integration for console, workspaces, assets, strategies, accounts, or agents will require separate updates to `docs/api/*.yaml` and `docs/sql/*.sql`.

## Goals / Non-Goals

**Goals:**
- Rebuild the frontend around the approved top-level modules: Console, Assets, Strategies, Accounts, and Workspaces.
- Replace the single-shell assumption with a shell system that distinguishes outer module pages, focused editor/configuration pages, and runtime execution pages.
- Make the grouped `code.html` references the implementation source of truth for page composition, panel hierarchy, and visual density.
- Define a mock runtime architecture that supports the console setup transition in-session while resetting on full reload.
- Preserve a clean implementation path for later real API integration by keeping mock data behind shared API or adapter boundaries.

**Non-Goals:**
- This change does not introduce or modify backend API contracts or SQL schemas.
- This change does not require mobile-first adaptation beyond maintaining desktop usability on common desktop widths.
- This change does not attempt to preserve the legacy `workspaces-first` entry flow or the legacy `Agents` top-level navigation model.
- This change does not require pixel-for-pixel reproduction of incidental top bars or inconsistent sidebars embedded in exported reference files.

## Decisions

### Decision: Replace the single global shell with an explicit shell system

The redesign will use three approved shell types instead of one generic `AppShell`.

| Shell | Applies To | Key Rules |
|---|---|---|
| Outer module shell | `控制台`、`资产列表`、`策略库`、`账号池`、`推广工作区` entry pages | Unified left sidebar, collapsible nav, no persistent global top bar |
| Focused shell | OpenClaw configuration, asset editing, strategy editing, account editing, team creation | No global sidebar, contextual back path only, page-specific hero/panel layout |
| Runtime shell | Workspace runtime, task intervention | Immersive execution chrome, execution context visible, no outer navigation shell |

Alternatives considered:
- Keep one shell and hide parts of it per route. Rejected because it encourages layout leakage and recreates the same fidelity gap seen in the previous pass.
- Keep the exported top bars and sidebars per page. Rejected because the grouped reference set is visually inconsistent at the shell level and the user explicitly wants only the content panels treated as strict source material.

### Decision: Make Console the default landing module and own the setup flow

The root route will redirect to the Console entry module. The Console module will own both the `未配置` and `已配置` states, and OpenClaw configuration becomes a focused child route owned by Console rather than a separate top-level module.

Recommended route ownership:

| Product Area | Route Pattern |
|---|---|
| Console entry | `/` -> `/console` |
| OpenClaw configuration | `/console/openclaw` |
| Assets | `/assets`, `/assets/new`, `/assets/:assetId/edit` |
| Strategies | `/strategies`, `/strategies/new`, `/strategies/:strategyId/edit` |
| Accounts | `/accounts`, `/accounts/:accountId` |
| Workspaces list and create | `/workspaces`, `/workspaces/new` |
| Workspace runtime | `/workspaces/:workspaceId/runtime` |
| Task intervention | `/workspaces/:workspaceId/tasks/:taskId/intervention` |

Alternatives considered:
- Keep `/workspaces` as the root redirect. Rejected because it no longer reflects the approved entry hierarchy.
- Keep a top-level `/agents` module and render Console as a renamed landing page. Rejected because it preserves the wrong mental model and duplicates setup ownership.

### Decision: Treat grouped `code.html` references as content truth and standardize the shared chrome

Implementation will take content-panel composition, internal spacing, card density, control clusters, and key placeholder placement directly from the grouped `code.html` references. Shared shell chrome will not be copied literally from each exported file; instead:

- the outer sidebar will be standardized from the strongest outer-page reference pattern
- top bars from exported references will be dropped
- inner pages keep only contextual return cues and page-specific structure
- missing assets may use screenshot-derived placeholders if they preserve hierarchy and scale

Alternatives considered:
- Rely on `DESIGN.md` alone. Rejected because it defines visual direction but not the concrete page compositions the user expects.
- Rebuild from screenshots only. Rejected because the exported `code.html` contains richer structure, spacing, and asset usage than the screenshots.

### Decision: Move mock state into a shared session-scoped adapter

The console setup transition will be implemented through a shared mock adapter under the existing frontend mock boundary, not through page-local toggles and not through persistent browser storage.

The adapter will expose:
- a default console scenario (`未配置`)
- an in-session configured console scenario (`已配置`)
- workspace list, creation, runtime, and task-intervention scenarios
- shared dense mock models for cards, panels, runtime nodes, logs, and placeholders

Behavior rules:
- saving OpenClaw configuration updates the shared adapter state for the current runtime session
- browser refresh rebuilds the adapter from its default seed data and returns the console to `未配置`
- page components only consume the adapter through shared API or mock-boundary functions

Alternatives considered:
- Persist configured state in `localStorage`. Rejected because the user explicitly wants refresh to reset the console.
- Let each page own its own fake state. Rejected because it produces inconsistent data shapes and breaks later API replacement.

### Decision: Sequence implementation around shell primitives first, then page fidelity

This redesign touches many pages. To reduce churn and avoid page-by-page divergence, implementation should proceed in this order:

1. route ownership and root redirect
2. outer shell and sidebar primitives
3. focused shell and runtime shell primitives
4. shared mock adapter and scenario bundles
5. Console module
6. Workspaces flow
7. Assets, Strategies, and Accounts focused/list pages

This sequence ensures the highest-risk architectural pieces stabilize before visual polishing starts across all pages.

## Risks / Trade-offs

- [Risk] Route ownership changes can break legacy deep links or existing internal assumptions. → Mitigation: keep temporary redirects or aliases from legacy entry routes during the transition and update page-level navigation centrally.
- [Risk] Missing final production art assets can slow fidelity work. → Mitigation: explicitly allow screenshot-derived placeholders and keep asset replacement isolated from structural components.
- [Risk] The old shell implementation may bleed styles or behaviors into focused and runtime pages. → Mitigation: treat shell types as separate layout primitives instead of prop-driven variants of one monolithic shell.
- [Risk] Shared mock models may grow quickly because the redesign needs dense cards, runtime logs, and multiple visual states. → Mitigation: centralize mock domains, document scenario ownership, and forbid page-local fake data.
- [Risk] The current backend contracts do not cover the redesigned domains. → Mitigation: keep this change mock-only and record backend contract expansion as a separate follow-up when real integration begins.

## Migration Plan

1. Introduce the new route ownership and add temporary compatibility redirects from legacy entry points.
2. Replace the legacy outer shell with the new shell system and move Console to the root redirect.
3. Rebuild Console, OpenClaw configuration, and Workspaces using the new grouped references and shared mock adapter.
4. Rebuild Assets, Strategies, and Accounts list/focused pages on top of the stabilized shell primitives.
5. Remove obsolete shell assumptions and dead navigation paths once the new routes and pages are verified.

Rollback strategy:
- Restore the previous root redirect and legacy shell routing if the redesign blocks core page access.
- Keep shell migration changes isolated so the previous page implementations can be temporarily reattached if needed.

## Open Questions

- No blocking product questions remain for this change.
- Final production icons, avatars, and brand art may still be replaced later, but that does not change the route, shell, or mock-runtime decisions in this design.
