# task-module-runtime Specification

## Purpose

Define the backend task module runtime that persists and exposes task records, task sets, lightweight task status, task conditions, execution input prompts, and abstract task output records while preserving planner, Agent provider, and platform execution boundaries.

## Requirements

### Requirement: Task module runtime SHALL manage task records

The backend task module SHALL create, persist, read, and update task records according to task contracts.

#### Scenario: List tasks by traffic work

- **WHEN** a caller requests tasks for a traffic work
- **THEN** the runtime SHALL return tasks belonging to that traffic work
- **AND** each task SHALL expose identity, name, status, condition summary, and updated time

#### Scenario: Read task detail

- **WHEN** a caller requests task detail
- **THEN** the runtime SHALL return task instruction reference, conditions, execution input prompt, context reference, and current status

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

### Requirement: Task module runtime SHALL preserve compatibility for historical input-need arrays

The backend task module SHALL write prompt-oriented task input values while safely reading historical array-shaped values.

#### Scenario: Write prompt text for new task data

- **WHEN** the runtime persists newly created or replaced tasks
- **THEN** it SHALL store the execution input contract as prompt text
- **AND** it SHALL NOT require new writes to follow the historical array-of-objects structure

#### Scenario: Read historical array-shaped values

- **WHEN** the runtime reads a stored task whose legacy `input_needs_json` value is still an array-shaped payload
- **THEN** it SHALL convert that historical value into a safe execution input prompt representation
- **AND** task reads SHALL remain available without forcing immediate manual data migration

### Requirement: Task module runtime SHALL support controlled status updates

The backend task module SHALL allow controlled task status updates using the lightweight status model.

#### Scenario: Mark task running

- **WHEN** a planner submits a ready task for execution
- **THEN** the runtime SHALL allow the task to be marked `running`

#### Scenario: Mark task completed or failed

- **WHEN** an Agent execution flow finishes a task
- **THEN** the runtime SHALL allow the task to be marked `completed` or `failed`

#### Scenario: Reject unknown status

- **WHEN** a caller attempts to update a task to a status outside `ready`, `running`, `completed`, or `failed`
- **THEN** the runtime SHALL reject the update

### Requirement: Task module runtime SHALL manage task output records

The backend task module SHALL allow task executions to create and query abstract output records.

#### Scenario: Create output record

- **WHEN** a task produces output data
- **THEN** the runtime SHALL store an output record containing task identity, description, data location, and creation time

#### Scenario: Query output records

- **WHEN** a caller requests output records for a task
- **THEN** the runtime SHALL return records for that task without requiring the output data body

### Requirement: Task module runtime SHALL preserve domain boundaries

The backend task module SHALL not implement task polling, provider-specific execution, platform scripts, or output data schemas.

#### Scenario: Runtime remains task-domain scoped

- **WHEN** the task module is implemented
- **THEN** it SHALL stop at task records, task-set persistence, status, conditions, execution input prompts, and output records
- **AND** planner and Agent provider behavior SHALL remain outside this module
