## Why

The frontend already has real API adapters for Traffic Works and Tasks, but the workspace pages still carry high-fidelity prototype assumptions that do not match the current backend contracts. The biggest mismatches are:

- work creation visually implies "create and start" even though `POST /api/traffic-works` only creates a work and returns preparation state
- the runtime page presents fake real-time logs and chat-like intervention affordances that are not backed by current backend contracts
- the task page behaves like an intervention console even though the documented backend capability is task detail plus output-record reads and writes

We need to realign the workspace pages around the actual `TrafficWork` and `Task` contracts so the frontend expresses the real product behavior instead of a prototype narrative.

## What Changes

- Reframe the Workspaces module around `TrafficWork` lifecycle and context-preparation semantics instead of "team runtime" prototype language.
- Make work creation explicitly land in a contract-backed post-create state where the user can see `ready` plus `prepared` or `failed`, rather than implying the work is already running.
- Redefine the runtime page as a `TrafficWork` runtime overview that shows contract-backed work state, task state, and task outputs without fake execution logs.
- Redefine the task intervention route as a task detail and output-record surface backed only by `GET /api/tasks/{taskId}` and `GET/POST /api/tasks/{taskId}/outputs`.
- Align workspace prerequisite checks, controls, and empty states with current documented backend contracts, including `GET /api/accounts?onlyConnected=true`.
- Keep routes stable under `/workspaces/...` while clarifying that route identity and runtime semantics map to backend `trafficWorkId`.

## Capabilities

### Modified Capabilities
- `frontend-core-workflows`: Clarify that work creation does not imply work start, and that runtime/task pages must reflect current backend-supported runtime behavior.
- `frontend-product-domain-workflow`: Clarify prerequisites, post-create behavior, lifecycle controls, runtime semantics, and task-output semantics around `TrafficWork` and `Task`.
- `frontend-real-backend-runtime`: Clarify that workspace runtime pages may only render contract-backed work/task data and must not invent real-time execution logs or intervention channels.

## Impact

- Affected pages:
  - `src/pages/workspaces/list/ui/WorkspacesListPage.vue`
  - `src/pages/workspaces/create/ui/WorkspaceCreatePage.vue`
  - `src/pages/workspaces/detail/ui/WorkspaceExecutionPage.vue`
  - `src/pages/workspaces/intervention/ui/TaskInterventionPage.vue`
- Affected entity services:
  - `src/entities/workspace/api/workspace-service.ts`
  - `src/entities/task-run/api/task-service.ts`
  - `src/entities/intervention-record/api/intervention-service.ts`
  - any prerequisite account lookups that still assume obsolete account-filter semantics
- API dependencies:
  - `docs/api/traffic-works.yaml`
  - `docs/api/tasks.yaml`
  - `docs/api/accounts.yaml`
- UI impact:
  - runtime visuals may become less "live console" oriented, but they will accurately reflect currently supported backend behavior
- Backend dependency:
  - if the product still wants live execution logs or true Agent intervention actions, that must be proposed as a separate backend contract change rather than invented in the frontend
