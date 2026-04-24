## MODIFIED Requirements

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
- **AND** the traffic work SHALL NOT mark the traffic work as `running`
- **AND** the prepared work context ownership SHALL remain bound to the same traffic work identity

#### Scenario: Update reuses the existing work context ownership

- **WHEN** a non-running traffic work is updated
- **THEN** the runtime SHALL preserve the existing traffic work identity
- **AND** it SHALL reuse the same work context ownership instead of allocating a second work context root
- **AND** it SHALL ensure the standard work context skeleton still exists before re-invoking Agent preparation

## ADDED Requirements

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
