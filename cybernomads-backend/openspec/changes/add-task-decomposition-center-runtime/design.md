## Context

Cybernomads Agent Runtime now generates structured task plan drafts, performs Agent Review, runs bounded repair, renders reports, stores decomposition artifacts, and commits formal tasks only after user confirmation. The missing layer is a backend-facing product projection for the task decomposition center: the frontend needs one stable response that explains progress, draft content, Review quality, report summary, and available user actions without exposing raw prompts, secrets, or database-shaped internals.

The important domain distinction is:

- Traffic work lifecycle status answers whether the work itself is ready, running, ended, archived, or deleted.
- Traffic work context-preparation status answers whether the confirmed context and task set are prepared, pending, or failed.
- Decomposition progress answers where the current task plan draft/review/confirmation flow is for display purposes.

These must remain separate so "progress 58%" does not become a new traffic work state.

## Goals / Non-Goals

**Goals:**

- Add a task decomposition center projection for the latest decomposition run of one traffic work.
- Return a display-only `progress` object derived from decomposition run stage/status.
- Return draft task graph data before formal tasks are persisted.
- Return Review issues, repair history, report summary, and available actions in one safe response.
- Preserve existing traffic work lifecycle and context-preparation statuses.
- Prioritize top-level docs updates before code changes.

**Non-Goals:**

- Do not add a new traffic work lifecycle status for decomposition progress.
- Do not make progress drive backend business decisions.
- Do not expose raw model prompts, raw tool outputs, provider secrets, or unfiltered artifact bodies.
- Do not implement manual task editing in this change.
- Do not change OpenClaw execution boundaries.
- Do not replace the existing confirmation and feedback endpoints unless the top-level API contract explicitly deprecates them.

## Decisions

### 1. Add a center-view endpoint rather than forcing the frontend to assemble artifacts

The backend should expose a single decomposition center view, for example under `docs/api/task-decomposition-runs.yaml`:

```text
GET /api/traffic-works/{trafficWorkId}/decomposition-run/center-view
```

This response should include run summary, progress, draft tasks, draft edges, Review projection, report summary, and available actions. The alternative is to expose generic artifact reads and let the frontend stitch together drafts, Review reports, repairs, reports, and confirmation state. That would leak storage shape into the UI and make later artifact changes painful.

### 2. Progress is derived, not stored as business state

The `progress` object should be computed from `TaskDecompositionRunRecord.status`, `stage`, and known stage mapping:

- `context_ready`: 10-15%
- `planning`: 25-35%
- `reviewing`: 50-60%
- `repairing`: 65-75%
- `reporting`: 80-85%
- `waiting_user_confirmation`: 90%
- `committing`: 95%
- `prepared`: 100%
- `failed`: stable terminal display with the last useful percent or a failure label

The progress object can include `percent`, `label`, `description`, and `updatedAt`. It should not be written back to `traffic_works`.

### 3. Draft graph comes from the latest task plan draft artifact

The center view should read the latest `task_plan_draft` artifact and convert `tasks[].dependsOn` / `condition.relyOnTaskKeys` into graph edges. This allows users to see the future task set before it enters the formal task table.

### 4. Review and report are projected for users

The center view should include:

- `review.conclusion`
- grouped Review issues
- repair summaries from `repair_history`
- report summary/markdown excerpt or report metadata
- strategy coverage summary

Raw artifact JSON can remain internal. The UI should receive a curated view.

### 5. Available actions are server-derived

The response should explicitly say whether the current user can:

- confirm the plan
- submit feedback and replan
- enter execution
- retry or inspect failure

This prevents the frontend from duplicating business rules based only on string comparisons.

## Risks / Trade-offs

- [Risk] Center view duplicates some information already available in report/artifacts.  
  Mitigation: Treat it as a read model/projection, not a second source of truth.

- [Risk] Progress percentages look more precise than they are.  
  Mitigation: Label the field as display-only and base business logic only on `status`, `stage`, and available actions.

- [Risk] Existing create/update flow may still wait synchronously for Agent completion.  
  Mitigation: Keep this change scoped to the center contract, but document that a later optimization may split run creation from background stage advancement.

- [Risk] Top-level docs and implemented runtime drift.  
  Mitigation: Make docs/api, docs/sql, architecture, and domain documents the first implementation tasks before code changes.

## Migration Plan

1. Update top-level architecture and domain docs to define task decomposition center semantics.
2. Update `docs/api/task-decomposition-runs.yaml` with the center-view response contract.
3. Update `docs/sql/task-decomposition-runs.sql` if any persisted fields are added; prefer derived progress without schema changes.
4. Implement the center-view projection in the task decomposition runs module.
5. Keep existing report/confirmation/feedback endpoints stable for backwards compatibility.
6. Add targeted tests for status/progress separation, draft graph projection, and action derivation.

## Open Questions

- Should failed runs show the last reached progress percent, or a fixed failed progress value such as 100% terminal failure?
- Should the center-view response include full report markdown or only summary plus a link to the existing report endpoint?
- Should feedback type be structured in the backend contract now, or remain a free-text first version?
