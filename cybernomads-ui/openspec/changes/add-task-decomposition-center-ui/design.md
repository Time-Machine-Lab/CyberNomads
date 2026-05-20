## Context

The current workspace runtime page is designed for confirmed formal tasks. After the new Cybernomads Agent Runtime, a newly created or updated traffic work can have a meaningful task draft and Review report before any formal task records exist. Showing the execution console too early makes the user see an empty or ambiguous runtime, while hiding the draft keeps the task decomposition process black-box.

The approved UX direction is to add a workspace-internal task decomposition center between creation/update and execution:

```text
Create or update workspace
  -> Task decomposition center
  -> User confirms reviewed task plan
  -> Backend commits formal tasks
  -> Existing execution console
```

The frontend constitution requires API and SQL contracts to come from top-level docs. Therefore this UI change depends on the backend change updating `docs/api/task-decomposition-runs.yaml` and `docs/sql/task-decomposition-runs.sql` before production integration.

## Goals / Non-Goals

**Goals:**

- Add a real task decomposition center page under the Workspaces module.
- Route users there after workspace creation/update while the task plan is not confirmed.
- Display traffic work lifecycle/context status separately from decomposition progress.
- Render draft tasks and dependencies from the backend center-view response.
- Show Review issues, repair history, strategy coverage, and report summary.
- Provide confirmation and feedback replanning actions.
- Keep the existing execution console for prepared workspaces with formal tasks.

**Non-Goals:**

- Do not add a new top-level navigation module.
- Do not make the frontend invent API response shapes outside `docs/api`.
- Do not keep production behavior backed by page-local mock data.
- Do not implement manual task editing in the first version.
- Do not replace the existing task execution console.

## Decisions

### 1. The decomposition center is a Workspaces child route

The route should live under the workspace context, for example:

```text
/workspaces/:workspaceId/decomposition
```

It should use the runtime shell because the user is inside the work environment, but the page content should be planning/review oriented rather than execution oriented. It must not appear as a sixth top-level module.

### 2. Creation and update land in decomposition center

After `POST /api/traffic-works` or `PUT /api/traffic-works/{trafficWorkId}`, the frontend should navigate to the decomposition center route. The page then reads the backend decomposition center view and polls until the run reaches a terminal or user-actionable state.

If a user opens `/workspaces/:workspaceId/runtime` while the work is not prepared, the frontend can redirect to or strongly surface the decomposition center.

### 3. UI consumes a backend center-view projection

The page should consume a dedicated entity API adapter for the decomposition center view. It should not call generic artifact endpoints or parse markdown to derive task nodes. The API layer should map DTOs from `docs/api/task-decomposition-runs.yaml` into view models.

### 4. Progress is display-only

The page should visually display the backend `progress` object but must use backend-provided actions and statuses for button enablement. The progress percent should explain the process, not control business rules.

### 5. Keep the mock demo isolated until replaced

The temporary `/demo/task-decomposition-center` route can remain during design review, but implementation should either remove it or clearly keep it outside production navigation after the real route exists.

## Risks / Trade-offs

- [Risk] The user may confuse draft task nodes with formal executable tasks.  
  Mitigation: Label the graph as draft until confirmation and show formal task execution only in the runtime console.

- [Risk] Polling can feel stale during long model calls.  
  Mitigation: Use the existing polling helper, show last updated time, and provide readable stage descriptions.

- [Risk] Frontend starts before backend center-view contract is finalized.  
  Mitigation: Put backend top-level API/SQL/doc updates first and keep frontend API models aligned to them.

- [Risk] The page becomes a task editor by accident.  
  Mitigation: First version only supports confirm and feedback replan; manual editing remains out of scope.

## Migration Plan

1. Wait for backend top-level API and SQL docs to define the decomposition center view.
2. Add frontend types and API adapter aligned to `docs/api/task-decomposition-runs.yaml`.
3. Add the Workspaces child route and page.
4. Update create/update navigation.
5. Add polling and action handling.
6. Remove or isolate the mock demo.
7. Add tests for landing behavior, progress display, draft graph rendering, confirmation, and feedback.

## Open Questions

- Should `/workspaces/:workspaceId` redirect to decomposition or runtime based on backend center-view actions?
- Should the first version show full report markdown inline or a summary panel with a "view full report" action?
- Should feedback categories be structured in the UI now or remain free-text until backend contract expands?
