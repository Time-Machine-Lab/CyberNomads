## MODIFIED Requirements

### Requirement: Task module runtime SHALL manage task records

The backend task module SHALL create, persist, read, and update task records according to task contracts.

#### Scenario: List tasks by traffic work

- **WHEN** a caller requests tasks for a traffic work
- **THEN** the runtime SHALL return tasks belonging to that traffic work
- **AND** each task SHALL expose identity, name, status, condition summary, execution input prompt semantics, and updated time

#### Scenario: Read task detail

- **WHEN** a caller requests task detail
- **THEN** the runtime SHALL return task instruction reference, conditions, execution input prompt, context reference, and current status
- **AND** the execution input field SHALL be returned as prompt text rather than a structured object array

### Requirement: Task module runtime SHALL manage task sets by traffic work

The backend task module SHALL provide controlled operations for creating and replacing the current task set of one traffic work.

#### Scenario: Create task set from decomposition result

- **WHEN** the traffic work decomposition integration submits a valid task set for a traffic work
- **THEN** the runtime SHALL persist all tasks in that task set under the traffic work
- **AND** created tasks SHALL start in `ready` unless explicitly rejected by validation

#### Scenario: Replace current task set for traffic work

- **WHEN** a traffic work update triggers task re-decomposition
- **THEN** the runtime SHALL replace the current task set for that traffic work through one controlled service operation
- **AND** the runtime SHALL NOT require Agent or subagent flows to directly mutate storage

#### Scenario: Reject invalid task set

- **WHEN** a task set misses required task identity, name, instruction reference, condition, execution input prompt, or context reference semantics
- **THEN** the runtime SHALL reject the task set and return a validation error
- **AND** the runtime SHALL require the execution input field to be a non-empty prompt string

#### Scenario: Read historical array data safely

- **WHEN** persisted historical task data still stores the old structured input-needs array shape
- **THEN** the runtime SHALL provide a compatibility read path that converts the legacy value into execution input prompt text for callers
- **AND** new writes SHALL use the prompt-oriented model

### Requirement: Task module runtime SHALL preserve domain boundaries

The backend task module SHALL not implement task polling, provider-specific execution, platform scripts, or output data schemas.

#### Scenario: Runtime remains task-domain scoped

- **WHEN** the task module is implemented
- **THEN** it SHALL stop at task records, task-set persistence, status, conditions, execution input prompt handling, and output records
- **AND** planner and Agent provider behavior SHALL remain outside this module
