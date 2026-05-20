## Why

Cybernomads Agent Runtime has already moved task decomposition into a structured draft, Review, repair, report, and confirmation flow, but the backend still lacks a product-facing "task decomposition center" contract that cleanly separates traffic work status from decomposition progress. This change makes the decomposition center a first-class runtime surface so users can understand progress, inspect drafts, confirm task plans, and feed problems into replanning without overloading traffic work lifecycle states.

## What Changes

- Add a backend task decomposition center view that returns a safe, display-ready projection of the latest decomposition run.
- Add a display-only `progress` field for decomposition progress; it MUST NOT replace or mutate traffic work lifecycle or context-preparation state semantics.
- Expose draft task nodes, dependency edges, Review issues, repair summaries, report summary, available user actions, and progress in one frontend-ready response.
- Preserve existing traffic work statuses:
  - lifecycle status: `ready`, `running`, `ended`, `archived`, `deleted`
  - context preparation status: `pending`, `prepared`, `failed`
- Clarify create/update navigation semantics: after traffic work creation or update triggers decomposition, the traffic work remains `ready` and `pending` until user confirmation commits formal tasks.
- Keep formal task persistence under system orchestration after user confirmation; Cybernomads Agent continues to output draft artifacts only.
- Update top-level docs first: architecture, Agent architecture, traffic work domain, task domain, task decomposition run API, and task decomposition run SQL.

## Capabilities

### New Capabilities

- `task-decomposition-center-runtime`: Backend runtime contract for the decomposition center view, display-only progress, draft visualization payload, Review/report projection, confirmation readiness, and feedback replanning entry points.

### Modified Capabilities

- `traffic-work-task-decomposition-integration`: Clarifies that decomposition progress is separate from traffic work status and that create/update flows should surface the decomposition center before formal task persistence.
- `traffic-work-contracts`: Clarifies traffic work status semantics and prevents decomposition progress from being modeled as a traffic work lifecycle or context-preparation state.

## Impact

- Top-level documentation:
  - `docs/design/Cybernomads架构设计文档.md`
  - `docs/design/Cybernomads Agent架构设计文档.md`
  - `docs/design/domain/Cybernomads引流工作领域设计文档.md`
  - `docs/design/domain/Cybernomads任务领域设计文档.md`
  - `docs/api/task-decomposition-runs.yaml`
  - `docs/sql/task-decomposition-runs.sql`
- Backend modules:
  - `task-decomposition-runs` service/controller/types
  - `traffic-works` creation/update context preparation orchestration
  - Cybernomads Agent Runtime report/projection usage
- Frontend dependency:
  - The UI change `add-task-decomposition-center-ui` depends on this backend contract before replacing the mock demo with real API calls.
