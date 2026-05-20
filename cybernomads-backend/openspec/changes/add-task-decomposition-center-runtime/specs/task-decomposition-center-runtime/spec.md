## ADDED Requirements

### Requirement: Backend SHALL expose a task decomposition center view
The backend SHALL expose a safe, frontend-ready task decomposition center view for the latest decomposition run of one traffic work. The view SHALL be documented in `docs/api/task-decomposition-runs.yaml` and served by the task decomposition runs controller.

#### Scenario: Read center view for an active decomposition run
- **WHEN** the frontend requests the decomposition center view for a traffic work with a latest decomposition run
- **THEN** the backend SHALL return the run identity, traffic work identity, run status, run stage, display progress, draft task graph projection, Review projection, report summary, and available actions
- **AND** the response SHALL NOT expose raw provider secrets, API keys, Authorization headers, raw prompts, or unfiltered internal artifact bodies

#### Scenario: Read center view when no run exists
- **WHEN** the frontend requests the decomposition center view for a traffic work without any decomposition run
- **THEN** the backend SHALL return a documented not-found response or an empty state response according to `docs/api/task-decomposition-runs.yaml`
- **AND** the response SHALL NOT synthesize formal tasks as draft data

### Requirement: Backend SHALL provide display-only decomposition progress
The backend SHALL derive a `progress` object from decomposition run status and stage for display purposes. The progress object SHALL include a numeric percent, a readable label, a readable description, and an update timestamp.

#### Scenario: Derive progress from running stage
- **WHEN** the latest decomposition run is in `planning`, `reviewing`, `repairing`, `reporting`, `waiting_user_confirmation`, `committing`, or `prepared`
- **THEN** the backend SHALL return a progress object that describes the current decomposition stage
- **AND** business decisions SHALL continue to use run status, run stage, traffic work status, and available actions rather than the numeric percent

#### Scenario: Progress does not mutate traffic work status
- **WHEN** decomposition progress changes from one display percent to another
- **THEN** the backend SHALL NOT change `traffic_works.lifecycle_status` because of the progress value
- **AND** it SHALL NOT introduce a new `traffic_works.context_preparation_status` value for progress display

### Requirement: Backend SHALL project draft task graph before formal task persistence
The center view SHALL project draft task nodes and dependency edges from the latest task plan draft artifact before formal tasks are persisted.

#### Scenario: Draft exists before confirmation
- **WHEN** a task plan draft artifact exists and the run is waiting for user confirmation
- **THEN** the center view SHALL include draft task nodes with task key, name, goal, expected outputs, input sources, dependencies, resources, strategy coverage, and skill references
- **AND** it SHALL include dependency edges derived from draft dependencies
- **AND** it SHALL NOT require matching formal task records in the task table

#### Scenario: Formal tasks are already committed
- **WHEN** the decomposition run has been committed
- **THEN** the center view SHALL still be able to show the confirmed snapshot or latest draft summary for audit
- **AND** it SHALL indicate that execution should use the formal task runtime view

### Requirement: Backend SHALL derive user actions for the center view
The backend SHALL derive available actions for the decomposition center so the frontend does not duplicate confirmation and replanning rules.

#### Scenario: Run waits for confirmation
- **WHEN** a decomposition run status is `waiting_user_confirmation`
- **THEN** the center view SHALL indicate that confirmation and feedback replanning are available
- **AND** it SHALL indicate that execution is not yet available until formal task persistence succeeds

#### Scenario: Run is committed
- **WHEN** a decomposition run status is `committed`
- **THEN** the center view SHALL indicate that entering execution is available
- **AND** it SHALL indicate that confirmation is no longer available for the already committed run

#### Scenario: Run failed
- **WHEN** a decomposition run status is `failed`
- **THEN** the center view SHALL expose failure summary and feedback replanning availability when feedback can start a replacement run
