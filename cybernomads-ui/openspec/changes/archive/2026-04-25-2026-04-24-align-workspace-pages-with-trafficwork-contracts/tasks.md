## 1. Spec Alignment

- [x] 1.1 Update workspace-related frontend capability deltas so they explicitly model create-versus-start, runtime state semantics, and task output semantics
- [x] 1.2 Confirm every referenced frontend API call matches current `docs/api/traffic-works.yaml`, `docs/api/tasks.yaml`, and `docs/api/accounts.yaml`

## 2. Workspace Create And State Flow

- [x] 2.1 Update workspace creation copy and page flow so `POST /api/traffic-works` is presented as create-and-prepare, not create-and-start
- [x] 2.2 Ensure the post-create route state clearly shows returned lifecycle status and context-preparation status
- [x] 2.3 Align prerequisite account checks and empty states to `GET /api/accounts?onlyConnected=true`

## 3. Runtime Page Realignment

- [x] 3.1 Refactor the runtime page header to show `TrafficWork` identity, lifecycle status, and context-preparation status
- [x] 3.2 Wire start, pause, and other supported lifecycle controls to the documented Traffic Works endpoints with state-based enablement
- [x] 3.3 Replace fake execution-log presentation with contract-backed task/work state surfaces
- [x] 3.4 Make task topology and selection derive from task contracts rather than simple prototype ordering where possible
- [x] 3.5 Show selected task detail, instruction, input needs, status reason, and output records inside the runtime context

## 4. Task Page Realignment

- [x] 4.1 Update the task route UI language so it behaves as task detail plus output-record management, not a live Agent control console
- [x] 4.2 Keep output-note creation aligned to `POST /api/tasks/{taskId}/outputs` with only `description` and `dataLocation`
- [x] 4.3 Review route labels and breadcrumbs so compatibility paths do not over-promise unsupported capabilities

## 5. Verification

- [x] 5.1 Update or add integration tests for create -> runtime -> start/pause -> task detail/output-record flows
- [x] 5.2 Verify no workspace page presents unsupported execution-log or intervention behavior as real backend capability
- [x] 5.3 Run frontend typecheck, lint, and relevant integration tests after implementation
