## ADDED Requirements

### Requirement: Frontend SHALL provide a workspace task decomposition center
The frontend SHALL provide a Workspaces child page for task decomposition center review before formal task execution. The page SHALL consume the backend task decomposition center API documented in `../../docs/api/task-decomposition-runs.yaml`.

#### Scenario: User enters decomposition center after workspace creation
- **WHEN** a user creates a traffic work through the workspace creation flow
- **THEN** the frontend SHALL navigate to the task decomposition center for the returned `trafficWorkId`
- **AND** it SHALL display traffic work lifecycle/context state separately from decomposition progress
- **AND** it SHALL NOT imply that formal tasks are executable before backend confirmation succeeds

#### Scenario: User enters decomposition center after workspace update
- **WHEN** a user updates a traffic work and the update triggers replacement decomposition
- **THEN** the frontend SHALL navigate to the task decomposition center for the same `trafficWorkId`
- **AND** it SHALL show that the new task plan is a replacement draft until confirmed

### Requirement: Frontend SHALL display decomposition progress as a separate display field
The frontend SHALL display the backend-provided decomposition progress object as user-facing progress while preserving traffic work status semantics.

#### Scenario: Progress updates while traffic work remains pending
- **WHEN** the center view returns traffic work context preparation status `pending` and decomposition progress at any percentage
- **THEN** the page SHALL show both values separately
- **AND** the page SHALL NOT convert progress percentage into a lifecycle or context-preparation status

#### Scenario: Progress reaches confirmation
- **WHEN** the center view reports `waiting_user_confirmation` and progress near completion
- **THEN** the page SHALL show that the task plan is ready for user confirmation
- **AND** it SHALL still show that formal task execution is unavailable until confirmation commits tasks

### Requirement: Frontend SHALL render draft task graph and inspection details
The decomposition center SHALL render draft task nodes, dependency edges, task details, input sources, expected outputs, resources, and Skill references from the backend center-view response.

#### Scenario: Draft tasks are available before confirmation
- **WHEN** the backend center view returns draft tasks
- **THEN** the page SHALL render a draft graph without requiring `GET /api/tasks`
- **AND** selecting a draft node SHALL show its task goal, inputs, outputs, dependencies, resources, and Skill references

#### Scenario: No draft tasks are available yet
- **WHEN** the backend center view does not yet include draft tasks
- **THEN** the page SHALL show a planning empty state and current progress description
- **AND** it SHALL continue polling according to the existing frontend polling convention

### Requirement: Frontend SHALL expose Review report and user decisions
The decomposition center SHALL show Review conclusion, issue list, repair history, report summary, and user actions from the backend center view.

#### Scenario: Review requires attention
- **WHEN** the center view includes Review issues
- **THEN** the page SHALL group or list the issues with category, severity, task reference when present, and suggested action

#### Scenario: User confirms a passing plan
- **WHEN** the center view indicates confirmation is available and the user confirms
- **THEN** the frontend SHALL call the documented confirmation endpoint
- **AND** after success it SHALL refresh the center view or navigate to the execution console according to available actions

#### Scenario: User submits feedback for replanning
- **WHEN** the user submits feedback from the decomposition center
- **THEN** the frontend SHALL call the documented feedback endpoint
- **AND** it SHALL show the new replacement decomposition run state returned by the backend
