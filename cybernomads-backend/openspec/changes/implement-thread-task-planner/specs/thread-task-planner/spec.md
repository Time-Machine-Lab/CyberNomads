# thread-task-planner Specification

## ADDED Requirements

### Requirement: Thread task planner SHALL have explicit lifecycle control
The system SHALL provide a thread task planner that can be explicitly started and stopped with the application lifecycle.

#### Scenario: Start planner on application startup
- **WHEN** the backend application starts and planner configuration is enabled
- **THEN** the planner SHALL start periodic scanning
- **AND** startup SHALL NOT require user interaction

#### Scenario: Stop planner on application shutdown
- **WHEN** the backend application is shutting down or tests request teardown
- **THEN** the planner SHALL stop its periodic scanning loop
- **AND** it SHALL NOT leave additional active timers behind

### Requirement: Thread task planner SHALL scan executable task candidates
The system SHALL provide a thread planner that periodically scans tasks under running traffic works.

#### Scenario: Scan running traffic works
- **WHEN** the planner ticks
- **THEN** it SHALL consider tasks that belong to running traffic works
- **AND** it SHALL ignore tasks under non-running traffic works

#### Scenario: Ignore non-ready tasks
- **WHEN** the planner evaluates task candidates
- **THEN** it SHALL only submit tasks whose status is `ready`
- **AND** it SHALL ignore tasks already in `running`, `completed`, or `failed`

### Requirement: Thread task planner SHALL evaluate MVP task conditions
The thread planner SHALL evaluate supported task conditions before submitting tasks.

#### Scenario: Evaluate cron condition
- **WHEN** a ready task declares a cron condition
- **THEN** the planner SHALL determine whether the task is due for execution according to the MVP cron evaluation rule

#### Scenario: Evaluate dependency condition
- **WHEN** a ready task declares `rely_on` dependencies
- **THEN** the planner SHALL determine whether dependency tasks have updated sufficiently to trigger execution

#### Scenario: Skip unsupported conditions safely
- **WHEN** a ready task declares an unsupported condition shape
- **THEN** the planner SHALL NOT submit the task blindly
- **AND** it SHALL surface or record enough feedback for later diagnosis

### Requirement: Thread task planner SHALL dispatch executable tasks to Agent service
The thread planner SHALL submit executable tasks through the Agent service abstraction.

#### Scenario: Dispatch executable task
- **WHEN** a ready task satisfies its conditions
- **THEN** the planner SHALL mark the task as `running`
- **AND** it SHALL submit task execution instructions to the Agent service abstraction
- **AND** the request SHALL reference the task execution Skill or equivalent runtime capability

#### Scenario: Continue scanning after accepted submission
- **WHEN** a task execution request is accepted for submission
- **THEN** the planner SHALL continue scanning without waiting for final Agent execution output

#### Scenario: Handle submission failure without retry
- **WHEN** the planner cannot submit a selected task to Agent service
- **THEN** the planner SHALL NOT perform automatic retry in MVP
- **AND** it SHALL avoid leaving an unobservable intermediate state

### Requirement: Thread task planner SHALL avoid MVP out-of-scope behavior
The thread planner SHALL not implement Agent planning, retries, manual recovery, or platform execution internals.

#### Scenario: Planner remains MVP scoped
- **WHEN** the planner is implemented
- **THEN** it SHALL provide thread decision behavior only
- **AND** it SHALL NOT implement Agent autonomous planning or retry workflows

