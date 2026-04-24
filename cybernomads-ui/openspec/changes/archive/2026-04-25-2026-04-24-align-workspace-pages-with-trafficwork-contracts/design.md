## Context

The current Workspaces module sits in an awkward middle state. The frontend has already moved important data access to real entity adapters, but the workspace create, runtime, and task pages still encode prototype-era assumptions:

- create flow language suggests immediate execution
- runtime layout implies a real-time execution console with live logs
- task intervention language implies active Agent control

The backend contracts define a more constrained but stable runtime:

- `TrafficWork` is the main business object
- work lifecycle and context preparation are separate states
- work creation triggers preparation and task decomposition, but does not automatically start running work
- tasks expose summaries, details, statuses, and output records
- there is no documented execution-log or live-intervention API

This change should align the page model to those contracts without changing the route shell or inventing missing backend capabilities.

## Goals / Non-Goals

**Goals:**
- Make the Workspaces module accurately express `TrafficWork` lifecycle and preparation state.
- Separate "work created" from "work started" in the page flow and copy.
- Define a runtime view that is fully supportable by `TrafficWork` and `Task` contracts today.
- Define the task route as a task detail plus output-record page rather than a fake control surface.
- Keep `/workspaces/...` route compatibility while treating route ids as `trafficWorkId`.

**Non-Goals:**
- Do not add or change backend API contracts.
- Do not add frontend-only fake logs, fake progress streams, or optimistic control channels that the backend does not support.
- Do not rename top-level modules or rewrite the visual design system.
- Do not introduce a new execution-log data model in the frontend.

## Decisions

### Treat `TrafficWork` as the page-level aggregate for the Workspaces module

The frontend should treat the workspace list, create, and runtime pages as views over `TrafficWork`, not over a separate "team runtime" concept. This means:

- the list page shows `TrafficWork` summaries
- the create page submits `CreateTrafficWorkRequest`
- the runtime page first explains work state, then task state

Alternative considered: keep current workspace/team language as the main runtime model and only map ids internally. Rejected because it preserves confusion around what the user is actually creating and controlling.

### Work creation must not imply work start

After `POST /api/traffic-works`, the user should land in a post-create runtime/detail context that clearly communicates:

- lifecycle status
- context preparation status
- whether the work can be started

The UI may still route directly to `/workspaces/:workspaceId/runtime`, but that page must treat newly created work as a not-yet-running work unless `POST /start` succeeds later.

Alternative considered: auto-call `POST /start` after create. Rejected because it changes current product semantics, hides preparation failures, and couples two distinct backend operations.

### Runtime page should be a contract-backed runtime overview, not a fake execution console

The runtime page should preserve the approved shell but narrow its meaning to what the backend actually supports today:

- header: work identity, lifecycle state, context preparation state, supported lifecycle actions
- center: task graph or task list derived from `GET /api/tasks?trafficWorkId=...`
- side panel: selected task summary, instruction, input needs, state reason, output records

The page must not imply live execution logs unless those logs come from a future documented backend contract.

Alternative considered: keep the current execution-log panel as a UI-only affordance. Rejected because it would continue to imply unsupported runtime capabilities in production.

### Task route should be positioned as task detail plus output records

The route `/workspaces/:workspaceId/tasks/:taskId/intervention` can remain for compatibility, but the page semantics should be narrowed:

- load task detail
- load output records
- allow writing a new output note or observation through `POST /api/tasks/{taskId}/outputs`

The page must not claim to send control commands to an Agent service.

Alternative considered: rename the route immediately. Deferred to avoid mixing IA churn with runtime alignment.

### Lifecycle controls should be state-driven and explicit

The runtime page should use current backend rules:

- `start` only when lifecycle is `ready` and preparation is `prepared`
- `pause` only when lifecycle is `running`
- `end` and `archive` only when backend contract allows them

Unavailable actions should be disabled or explained from returned state rather than hidden behind prototype labels.

Alternative considered: preserve generic play/pause buttons without state explanation. Rejected because the backend state machine is now explicit and should be visible to users.

### Prerequisite account checks must align to `onlyConnected`

The current documented accounts contract uses `GET /api/accounts?onlyConnected=true`. Workspace prerequisites and empty states should use the documented filter instead of older terminology such as `onlyConsumable`.

Alternative considered: keep old prerequisite language in the spec because it is conceptually similar. Rejected because this change specifically aims to remove drift between specs, code, and documented API contracts.

## Risks / Trade-offs

- [Risk] Removing fake runtime affordances can make the runtime page feel less dynamic.
  - Mitigation: invest in stronger state messaging, task topology, and output-record presentation rather than simulated logs.
- [Risk] Users may expect create to immediately run because of existing copy.
  - Mitigation: update copy and supported actions so the state transition is explicit after creation.
- [Risk] The route name `intervention` may still over-promise behavior.
  - Mitigation: keep compatibility route now, but narrow page language and note future IA cleanup as a follow-up change if needed.
- [Risk] Task graph layout currently depends on frontend-generated positions rather than backend topology metadata.
  - Mitigation: treat layout as a view concern while deriving task relationships from task dependencies where possible.

## Migration Plan

1. Update OpenSpec capability deltas for work creation, runtime semantics, and task-page semantics.
2. Refactor page copy and controls to distinguish create from start.
3. Wire runtime controls to documented lifecycle endpoints.
4. Remove or replace unsupported fake runtime surfaces such as execution logs and chat-style intervention.
5. Update task-page language and behavior around output records.
6. Align prerequisite account queries and related empty states with `onlyConnected`.
7. Update integration tests to assert contract-backed runtime behavior instead of prototype assumptions.

## Open Questions

- Should the runtime page show both task graph and task list, or should one be primary for MVP clarity?
- Should the compatibility route label "任务干预" remain visible in the UI, or should the visible label change while the route path stays the same?
- Should a future change split the runtime page into a work overview route and a separate execution-observation route if execution-log APIs are later added?
