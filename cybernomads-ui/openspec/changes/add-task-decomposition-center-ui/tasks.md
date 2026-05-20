## 1. Contract Alignment

- [ ] 1.1 Confirm backend change `add-task-decomposition-center-runtime` has updated `../../docs/api/task-decomposition-runs.yaml` with the center-view endpoint and response schemas.
- [ ] 1.2 Confirm `../../docs/sql/task-decomposition-runs.sql` documents the storage contract and whether progress is derived or persisted.
- [ ] 1.3 Update or create frontend model types only from the documented backend API/SQL contracts.
- [ ] 1.4 Identify and record whether the temporary `/demo/task-decomposition-center` page should be removed during this implementation or kept isolated for review.

## 2. API And Model Layer

- [ ] 2.1 Add an entity API adapter for reading the decomposition center view.
- [ ] 2.2 Add API calls for confirming the current task plan and submitting feedback replanning through documented endpoints.
- [ ] 2.3 Add DTO-to-view mappers for progress, traffic work status summary, draft task graph, Review issues, report summary, and available actions.
- [ ] 2.4 Add user-facing error mapping for 400, 404, and 409 responses.

## 3. Route And Navigation

- [ ] 3.1 Add a Workspaces child route for `/workspaces/:workspaceId/decomposition`.
- [ ] 3.2 Update workspace create success navigation to enter the decomposition center.
- [ ] 3.3 Update workspace update success navigation to enter the decomposition center when replacement decomposition is expected.
- [ ] 3.4 Update workspace default routing so unprepared works surface the decomposition center while prepared works can enter the runtime execution page.

## 4. Page Implementation

- [ ] 4.1 Build the decomposition center page inside the approved workspace shell context.
- [ ] 4.2 Display traffic work lifecycle/context state separately from backend decomposition progress.
- [ ] 4.3 Render empty, running, draft-ready, failed, and committed states.
- [ ] 4.4 Render draft task graph nodes and dependency edges from the center view without calling the Tasks API.
- [ ] 4.5 Render selected draft task details including goal, expected outputs, input sources, dependencies, resources, and Skill references.
- [ ] 4.6 Render Review conclusion, issues, repair history, strategy coverage, and report summary.
- [ ] 4.7 Implement confirmation and feedback replanning actions with loading, success, failure, and conflict states.
- [ ] 4.8 Poll the center view using the existing polling helper and clean up polling on route leave/unmount.

## 5. Cleanup And Tests

- [ ] 5.1 Remove or isolate the temporary mock demo route so it cannot be mistaken for production navigation.
- [ ] 5.2 Add unit tests for DTO mappers and available action display mapping.
- [ ] 5.3 Add integration tests for post-create navigation into the decomposition center.
- [ ] 5.4 Add integration tests for draft graph rendering and selected task inspection.
- [ ] 5.5 Add integration tests for confirmation and feedback replanning actions using mocked documented API responses.

## 6. Verification

- [ ] 6.1 Run `npm run typecheck`.
- [ ] 6.2 Run `npm run lint`.
- [ ] 6.3 Run targeted frontend tests.
- [ ] 6.4 Run `npm run build`.
- [ ] 6.5 Verify the page visually in the browser across created, waiting, draft-ready, failed, and committed states.
