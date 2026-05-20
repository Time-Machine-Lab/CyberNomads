## Why

After Cybernomads Agent produces task drafts and Review reports, users still need a clear product surface between "workspace created" and "tasks are ready to execute." This change adds a task decomposition center UI so users can see decomposition progress, inspect draft tasks, understand Review quality gates, provide feedback, and confirm before formal tasks enter the execution console.

## What Changes

- Add a task decomposition center route/page for traffic works whose task plan has not yet been confirmed.
- After workspace creation or update, navigate users to the decomposition center instead of showing an empty execution console.
- Display traffic work status separately from decomposition progress:
  - traffic work lifecycle/context status remains backend-owned and unchanged
  - decomposition progress is shown as a display-only progress object from the backend center view
- Render draft task nodes and dependency edges before formal tasks are persisted.
- Show Review conclusion, Review issues, repair history, strategy coverage, input source/resource summaries, and report summary.
- Provide user actions for confirmation and feedback-based replanning.
- Keep the current execution console as the post-confirmation runtime surface for formal tasks.
- Remove or isolate the temporary mock demo once the real center page is implemented.

## Capabilities

### New Capabilities

- `frontend-task-decomposition-center`: User-facing decomposition center workflow covering create/update landing, progress display, draft graph, Review/report inspection, confirmation, and feedback replanning.

### Modified Capabilities

- `frontend-core-workflows`: Changes the post-create workspace flow from direct runtime landing to decomposition-center landing until tasks are confirmed.
- `frontend-real-backend-runtime`: Adds real backend integration requirements for the decomposition center API while preserving the existing execution console for confirmed formal tasks.
- `frontend-information-architecture`: Adds the decomposition center as an internal workspace route, not as a new top-level navigation module.

## Impact

- Frontend pages/routes:
  - Add a workspace decomposition center route.
  - Adjust workspace create/update navigation.
  - Keep runtime execution page behavior for prepared workspaces.
- Frontend entities/API:
  - Add task decomposition center API calls only after backend top-level `docs/api/task-decomposition-runs.yaml` is updated.
  - Keep data models aligned with `docs/sql/task-decomposition-runs.sql`.
- Visual and interaction design:
  - Use the existing runtime shell language.
  - Keep the UI operational and dense, with stage progress, graph inspection, Review/report panels, and explicit actions.
- Existing temporary demo:
  - The mock demo route can be used as reference, but the implementation should either replace it with the real route or keep it clearly isolated until removed.
