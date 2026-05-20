## 1. Top-Level Documentation First

- [x] 1.1 Update `docs/design/Cybernomads架构设计文档.md` to describe the task decomposition center as the planning/review surface before formal task execution.
- [x] 1.2 Update `docs/design/Cybernomads Agent架构设计文档.md` to clarify Cybernomads Agent draft/review/report ownership and the backend center-view projection.
- [x] 1.3 Update `docs/design/domain/Cybernomads引流工作领域设计文档.md` to state that traffic work lifecycle/context status stays separate from decomposition progress.
- [x] 1.4 Update `docs/design/domain/Cybernomads任务领域设计文档.md` to clarify that draft tasks are not formal task records until user confirmation.
- [x] 1.5 Update `docs/api/task-decomposition-runs.yaml` with the decomposition center view endpoint, response schemas, progress object, draft graph projection, Review/report projection, and available actions.
- [x] 1.6 Review `docs/sql/task-decomposition-runs.sql`; document that progress is derived if no schema change is needed, or update the SQL contract before implementation if persisted fields are introduced.

## 2. Backend Center View Contract

- [x] 2.1 Add task decomposition center view types for progress, draft nodes, draft edges, Review projection, report projection, repair summary, and available actions.
- [x] 2.2 Implement progress derivation from decomposition run status/stage without mutating traffic work records.
- [x] 2.3 Implement draft task graph projection from the latest task plan draft or confirmation snapshot artifact.
- [x] 2.4 Implement Review issue and repair history projection from decomposition artifacts.
- [x] 2.5 Implement available action derivation for confirmation, feedback replanning, execution entry, and failure inspection.

## 3. API Integration

- [x] 3.1 Add the documented center-view route to the task decomposition runs controller.
- [x] 3.2 Ensure the center-view response redacts or excludes provider secrets, raw prompts, Authorization headers, and unfiltered artifact internals.
- [x] 3.3 Preserve existing report, confirmation, and feedback endpoints for compatibility.
- [x] 3.4 Ensure create/update traffic work preparation continues to leave traffic work status in existing lifecycle/context status values until confirmation commits formal tasks.

## 4. Tests

- [x] 4.1 Add unit tests for progress derivation across `context_ready`, `planning`, `reviewing`, `repairing`, `reporting`, `waiting_user_confirmation`, `committing`, `prepared`, and `failed`.
- [x] 4.2 Add unit tests for draft node and edge projection from task plan draft artifacts.
- [x] 4.3 Add unit tests for available action derivation across running, waiting confirmation, committed, and failed runs.
- [x] 4.4 Add integration tests for the center-view HTTP route.
- [x] 4.5 Add regression tests proving decomposition progress does not add or mutate traffic work lifecycle/context status values.

## 5. Verification

- [x] 5.1 Run backend typecheck or the repository's equivalent validation command.
- [x] 5.2 Run targeted task decomposition run tests.
- [x] 5.3 Run relevant traffic work integration tests.
- [x] 5.4 Run full backend test suite if local runtime cost is acceptable.
