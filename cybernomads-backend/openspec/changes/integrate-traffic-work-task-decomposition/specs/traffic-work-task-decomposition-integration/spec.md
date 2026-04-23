# traffic-work-task-decomposition-integration Specification

## ADDED Requirements

### Requirement: Traffic work creation SHALL trigger Agent task decomposition

When a traffic work is created, the backend SHALL trigger Agent task decomposition before the work is considered prepared.

#### Scenario: Create traffic work and prepare tasks successfully

- **WHEN** a valid traffic work creation request is accepted
- **THEN** the backend SHALL create the traffic work identity and bindings
- **AND** it SHALL build a task decomposition input from product content, strategy content, object bindings, and work context reference
- **AND** it SHALL submit the decomposition request through the Agent service abstraction
- **AND** it SHALL persist the resulting task set through the task module
- **AND** it SHALL mark context preparation as `prepared` only after the task set is persisted

#### Scenario: Task decomposition fails during create

- **WHEN** Agent task decomposition or task set persistence fails during traffic work creation
- **THEN** the traffic work SHALL remain in `ready`
- **AND** context preparation status SHALL be marked `failed`
- **AND** the backend SHALL return failure feedback without marking the work runnable

### Requirement: Traffic work update SHALL rebuild task decomposition in place

When a non-running traffic work is updated, the backend SHALL trigger a new task decomposition for the same traffic work identity.

#### Scenario: Update traffic work and replace task set

- **WHEN** a traffic work outside `running` state is updated with valid bindings
- **THEN** the backend SHALL preserve the original traffic work identity
- **AND** it SHALL build a new task decomposition input from the updated snapshot
- **AND** it SHALL request Agent task decomposition using the existing work context ownership
- **AND** it SHALL replace the current task set for that traffic work through the task module
- **AND** it SHALL update context preparation status according to the full preparation result

#### Scenario: Prevent running work update decomposition

- **WHEN** a traffic work is in `running` state
- **THEN** the backend SHALL NOT trigger update-time task decomposition
- **AND** the caller SHALL be required to pause or otherwise leave running state before update

### Requirement: Task decomposition integration SHALL remain provider-neutral

The integration SHALL depend on the Agent service abstraction rather than provider-specific protocols.

#### Scenario: Submit decomposition through active Agent service

- **WHEN** the backend requests task decomposition
- **THEN** it SHALL use the configured Agent service abstraction
- **AND** it SHALL NOT call OpenClaw-specific endpoints directly from the traffic work module

#### Scenario: Agent cannot directly mutate storage

- **WHEN** Agent decomposition produces tasks or context assets
- **THEN** task metadata persistence SHALL happen through controlled Cybernomads task module tools or APIs
- **AND** Agent or subagent flows SHALL NOT directly edit SQLite files

### Requirement: Task decomposition integration SHALL preserve domain boundaries

The integration SHALL bridge traffic work, task, and Agent service domains without moving their internals into one module.

#### Scenario: Traffic work remains work-lifecycle scoped

- **WHEN** task decomposition is integrated into traffic work creation or update
- **THEN** the traffic work module SHALL orchestrate the preparation result
- **AND** it SHALL NOT implement task scheduling, task execution, platform scripts, or output data schemas

#### Scenario: Task module remains task-persistence scoped

- **WHEN** the decomposition result is persisted
- **THEN** the task module SHALL validate and store task records and output-tracking contracts
- **AND** it SHALL NOT call Agent providers or decide traffic work lifecycle transitions

