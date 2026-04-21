## 1. Routing and shell architecture

- [x] 1.1 Replace the legacy top-level route ownership with the approved module entry structure and redirect the application root to `/console`
- [x] 1.2 Add temporary compatibility redirects or aliases for legacy entry paths that would otherwise break during the shell migration
- [x] 1.3 Implement separate outer, focused, and runtime layout primitives instead of a single monolithic application shell
- [x] 1.4 Build the unified outer sidebar with CyberNomads branding, Chinese navigation labels, secondary support entries, and collapse behavior

## 2. Shared mock runtime

- [x] 2.1 Centralize shared mock domain models and scenario seeds for console, workspaces, assets, strategies, accounts, runtime nodes, and intervention records
- [x] 2.2 Implement a session-scoped console setup mock adapter that starts in `未配置`, transitions to `已配置` after mock setup, and resets on browser refresh
- [x] 2.3 Route page data reads and mock actions through shared API or adapter boundaries instead of page-local fake data and local persistence

## 3. Console and workspace flows

- [x] 3.1 Rebuild the Console entry page for both the unconfigured and configured high-fidelity states using the grouped `code.html` references
- [x] 3.2 Rebuild the OpenClaw configuration page as a focused shell and wire its save path back to the configured Console state
- [x] 3.3 Rebuild the workspace list and team-creation flow so that confirming creation enters the runtime environment directly
- [x] 3.4 Rebuild the workspace runtime and task-intervention pages with the immersive execution shell, dense logs, node interactions, and prompt-editing surface

## 4. Resource module fidelity

- [x] 4.1 Rebuild the assets list and asset editor pages to match the approved focused-shell and content-panel patterns
- [x] 4.2 Rebuild the strategies list and strategy editor pages to match the approved focused-shell and content-panel patterns
- [x] 4.3 Rebuild the accounts list and account detail or configuration pages to match the approved focused-shell and content-panel patterns

## 5. Verification and follow-up

- [x] 5.1 Verify route context, shell assignment, and sidebar collapse behavior across all outer, focused, and runtime pages
- [x] 5.2 Compare implemented pages against the grouped `code.html` references and fix remaining high-fidelity gaps in panel hierarchy, spacing, and placeholders
- [x] 5.3 Record any real backend contract gaps discovered during implementation as `【依赖后端更新】` follow-ups without modifying `docs/api/*.yaml` or `docs/sql/*.sql`
