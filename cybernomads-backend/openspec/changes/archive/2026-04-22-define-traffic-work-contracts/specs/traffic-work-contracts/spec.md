## ADDED Requirements

### Requirement: Traffic work contracts SHALL define one stable traffic work aggregate view
The system SHALL define top-level contracts for a traffic work as one stable business object that binds exactly one product reference, one strategy reference, and one object binding set.

#### Scenario: Create traffic work with stable references
- **WHEN** the contracts define traffic work creation behavior
- **THEN** the contracts SHALL require one product reference and one strategy reference
- **AND** the contracts SHALL require an object binding set that satisfies the strategy object-slot requirement
- **AND** the contracts SHALL model the traffic work identity independently from its display name

### Requirement: Traffic work contracts SHALL separate lifecycle status from context preparation status
The system SHALL define top-level contracts that distinguish traffic work lifecycle state from context preparation state.

#### Scenario: Preparation fails while work remains not running
- **WHEN** the contracts express a traffic work whose context preparation did not succeed
- **THEN** the contracts SHALL allow the work lifecycle state to remain `ready`
- **AND** the contracts SHALL expose a distinct context preparation status of `failed`
- **AND** the contracts SHALL prevent the contract from implying the work is runnable

#### Scenario: Paused work returns to ready without implying re-preparation
- **WHEN** the contracts express a paused traffic work in MVP
- **THEN** the contracts SHALL model the work lifecycle state as returning to `ready`
- **AND** the contracts SHALL keep context preparation status as a separate state read

### Requirement: Traffic work contracts SHALL expose list and detail read semantics
The system SHALL define top-level contracts for traffic work summary reads and detail reads so upper layers can render stable work-management views.

#### Scenario: Read traffic work summary
- **WHEN** the contracts define traffic work list behavior
- **THEN** the contracts SHALL expose a summary view containing work identity, display name, main lifecycle state, and current context preparation state

#### Scenario: Read traffic work detail
- **WHEN** the contracts define traffic work detail behavior
- **THEN** the contracts SHALL expose product binding summary, strategy binding summary, object binding summary, and current context preparation status
- **AND** the contracts SHALL avoid exposing task-domain internals as traffic-work detail requirements

### Requirement: Traffic work contracts SHALL define lifecycle command semantics
The system SHALL define top-level contracts for creating, starting, pausing, updating, ending, archiving, and deleting a traffic work.

#### Scenario: Start prepared traffic work
- **WHEN** the contracts define traffic work start behavior
- **THEN** the contracts SHALL allow start only from `ready` traffic works whose context preparation status is `prepared`
- **AND** the started work SHALL become `running`

#### Scenario: Update paused traffic work
- **WHEN** the contracts define traffic work update behavior
- **THEN** the contracts SHALL require the work to be outside the `running` state
- **AND** the contracts SHALL preserve the original traffic work identity
- **AND** the contracts SHALL express that update triggers context re-preparation

#### Scenario: End, archive, or delete a traffic work
- **WHEN** the contracts define traffic work termination behavior
- **THEN** the contracts SHALL distinguish `ended`, `archived`, and `deleted` as different business semantics
- **AND** the contracts SHALL not imply any of these states remain scheduler-visible

### Requirement: Traffic work contracts SHALL exclude task scheduling and execution internals
The system SHALL keep traffic work contracts focused on work identity, binding, status, and context readiness and SHALL exclude task-domain execution details.

#### Scenario: Contract scope excludes task internals
- **WHEN** the API contract and SQL contract are created
- **THEN** they SHALL NOT define task-splitting logic, task execution conditions, log-line structures, or platform script internals as traffic-work requirements
