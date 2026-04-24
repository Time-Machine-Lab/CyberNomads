# task-domain-edge-case-tests Specification

## ADDED Requirements

### Requirement: Task edge-case tests SHALL cover preparation failure boundaries

The test suite SHALL verify that traffic work preparation failures remain visible and do not make a work runnable.

#### Scenario: Agent service is not configured

- **WHEN** a traffic work is created without a configured current Agent service
- **THEN** context preparation SHALL become `failed`
- **AND** the traffic work SHALL NOT be startable

#### Scenario: Agent decomposition returns invalid payload

- **WHEN** Agent decomposition returns non-JSON or an invalid task set
- **THEN** context preparation SHALL become `failed`
- **AND** task-set persistence SHALL NOT silently succeed

### Requirement: Task edge-case tests SHALL cover task-set write constraints

The test suite SHALL verify controlled task-set creation and replacement constraints.

#### Scenario: Duplicate task set creation is rejected

- **WHEN** a traffic work already has a current task set
- **THEN** another create task-set operation SHALL be rejected

#### Scenario: Running traffic work task-set replacement is rejected

- **WHEN** a traffic work is `running`
- **THEN** task-set replacement SHALL be rejected

#### Scenario: Invalid task dependency is rejected

- **WHEN** a task set references a dependency task key that does not exist
- **THEN** the task set SHALL be rejected with a visible validation failure

### Requirement: Task edge-case tests SHALL cover planner filtering and conditions

The test suite SHALL verify thread planner filtering, cron, and rely_on behavior.

#### Scenario: Planner ignores non-running works

- **WHEN** ready tasks belong to non-running traffic works
- **THEN** planner tick SHALL NOT submit those tasks

#### Scenario: Planner ignores non-ready tasks

- **WHEN** tasks are `running`, `completed`, or `failed`
- **THEN** planner tick SHALL NOT submit those tasks again

#### Scenario: Planner evaluates cron

- **WHEN** a ready task declares a supported cron condition
- **THEN** planner tick SHALL submit it only when the condition is due

#### Scenario: Planner evaluates rely_on dependencies

- **WHEN** a ready task declares dependency conditions
- **THEN** planner tick SHALL submit it only after dependencies are completed and sufficiently updated

#### Scenario: Planner diagnoses unsupported conditions

- **WHEN** a task condition shape or cron syntax is unsupported
- **THEN** planner tick SHALL NOT submit the task blindly
- **AND** the resulting state or diagnostics SHALL be observable

### Requirement: Task edge-case tests SHALL cover execution feedback and output traceability

The test suite SHALL verify Agent submission failure, status update validation, and output record behavior.

#### Scenario: Agent execution submission fails

- **WHEN** planner cannot submit a selected task to Agent service
- **THEN** the task SHALL become observable as failed or diagnosable
- **AND** planner SHALL NOT automatically retry in MVP

#### Scenario: Unknown task status is rejected

- **WHEN** a caller attempts to update a task to an unknown status
- **THEN** the task module SHALL reject the update

#### Scenario: Output record remains abstract

- **WHEN** a task output record is created
- **THEN** it SHALL be queryable by task ID
- **AND** the test SHALL NOT require a universal output data body schema

