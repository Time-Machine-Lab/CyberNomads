# traffic-work-runtime Specification

## Purpose

Define the backend runtime behavior for the traffic work domain so the system can manage traffic work lifecycle state, expose stable reads, and orchestrate work-level context preparation without crossing into task-domain internals.

## Requirements

### Requirement: Traffic work runtime SHALL manage traffic work lifecycle state transitions

The backend traffic work runtime SHALL manage create, start, pause, update, end, archive, and delete behaviors according to the traffic work domain rules.

#### Scenario: Create traffic work successfully

- **WHEN** a valid traffic work creation request is submitted
- **THEN** the runtime SHALL create one stable traffic work identity
- **AND** the runtime SHALL persist the bound product reference, strategy reference, and object binding set
- **AND** the runtime SHALL expose the initial lifecycle state and current context preparation state

#### Scenario: Start prepared traffic work

- **WHEN** a traffic work is in `ready` state and its context preparation status is `prepared`
- **THEN** the runtime SHALL allow the work to transition to `running`

#### Scenario: Pause running traffic work

- **WHEN** a traffic work is in `running` state and a pause request is submitted
- **THEN** the runtime SHALL transition the work back to `ready`
- **AND** the runtime SHALL preserve the existing binding information

#### Scenario: Update paused traffic work

- **WHEN** a traffic work is outside the `running` state and a valid update request is submitted
- **THEN** the runtime SHALL preserve the existing traffic work identity
- **AND** the runtime SHALL update the bound references and object binding set
- **AND** the runtime SHALL trigger context re-preparation semantics

### Requirement: Traffic work runtime SHALL expose summary and detail reads

The backend traffic work runtime SHALL provide stable summary and detail reads for traffic work management views.

#### Scenario: Read traffic work list

- **WHEN** a caller requests the traffic work list
- **THEN** the runtime SHALL return traffic work summaries containing identity, display name, lifecycle state, and context preparation state

#### Scenario: Read traffic work detail

- **WHEN** a caller requests traffic work detail
- **THEN** the runtime SHALL return product binding summary, strategy binding summary, object binding summary, and current context preparation status

### Requirement: Traffic work runtime SHALL orchestrate work-level context preparation

The backend traffic work runtime SHALL orchestrate work-level context preparation during traffic work creation and update by first ensuring a standard work context skeleton exists and then invoking the configured Agent service for work-level preparation without taking ownership of task-domain execution internals.

#### Scenario: Context preparation seeds work context during create

- **WHEN** the runtime accepts a valid traffic work creation request
- **THEN** it SHALL create or reserve the work-level context ownership for that traffic work
- **AND** it SHALL ensure the standard work context skeleton exists before invoking the configured Agent service
- **AND** it SHALL pass the prepared work context reference into the Agent preparation request

#### Scenario: Context preparation succeeds during create or update

- **WHEN** the runtime invokes the configured Agent service for work-level preparation and the preparation succeeds
- **THEN** the runtime SHALL record the context preparation status as `prepared`
- **AND** the traffic work SHALL remain in or return to `ready` until explicitly started

#### Scenario: Context preparation fails during create or update

- **WHEN** the runtime invokes the configured Agent service for work-level preparation and the preparation fails
- **THEN** the runtime SHALL record the context preparation status as `failed`
- **AND** the runtime SHALL NOT mark the traffic work as `running`
- **AND** the prepared work context ownership SHALL remain bound to the same traffic work identity

#### Scenario: Update reuses the existing work context ownership

- **WHEN** a non-running traffic work is updated
- **THEN** the runtime SHALL preserve the existing traffic work identity
- **AND** it SHALL reuse the same work context ownership instead of allocating a second work context root
- **AND** it SHALL ensure the standard work context skeleton still exists before re-invoking Agent preparation

### Requirement: Traffic work runtime SHALL create a standard work context skeleton

The backend traffic work runtime SHALL create a standard work context skeleton for each traffic work so later Agent decomposition and task execution can rely on predictable directory semantics.

#### Scenario: Create fixed work context directories

- **WHEN** a traffic work context is created or refreshed
- **THEN** the runtime SHALL ensure the work root contains `skills/`, `tools/`, `knowledge/`, and `data/`
- **AND** it SHALL treat those directories as the minimum work-level context skeleton

#### Scenario: Runtime does not precreate task markdown files

- **WHEN** the runtime prepares the work context skeleton
- **THEN** it SHALL NOT prewrite `task.md` or `task*.md` placeholder files
- **AND** task markdown authoring SHALL remain downstream Agent decomposition responsibility

### Requirement: Traffic work runtime SHALL preserve task-domain boundaries

The backend traffic work runtime SHALL not implement task scheduling, task retry, log-detail management, or platform-script execution as part of the traffic work module.

#### Scenario: Runtime scope remains work-level

- **WHEN** the traffic work module is implemented
- **THEN** the module SHALL stop at work identity, binding, state transition, and context preparation concerns
- **AND** task scheduling and execution internals SHALL remain outside the module scope
