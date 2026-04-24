## ADDED Requirements

### Requirement: Task decomposition support tools SHALL provide controlled runtime resource copy

The system SHALL provide a controlled runtime resource copy tool for task decomposition so Agent can prepare work-context resources without direct unrestricted file-system access.

#### Scenario: Copy one runtime Skill asset into the traffic work context

- **WHEN** Agent requests to copy one reusable runtime Skill asset for a traffic work
- **THEN** the tool SHALL allow copying from the runtime `cybernomads/agent/skills/` area into the target traffic work context directory
- **AND** it SHALL return the copied target location or an explicit failure reason

#### Scenario: Copy one runtime knowledge asset into the traffic work context

- **WHEN** Agent requests to copy one reusable runtime knowledge asset for a traffic work
- **THEN** the tool SHALL allow copying from the runtime `cybernomads/agent/knowledge/` area into the target traffic work context directory
- **AND** it SHALL return the copied target location or an explicit failure reason

#### Scenario: Reject paths outside controlled runtime boundaries

- **WHEN** Agent requests a source path or target path outside the allowed runtime agent or traffic work context boundaries
- **THEN** the tool SHALL reject the request
- **AND** it SHALL return an explicit boundary violation reason

### Requirement: Task decomposition support tools SHALL provide controlled batch task save

The system SHALL provide a controlled batch task save tool for task decomposition so Agent can persist one decomposed task set under one traffic work without directly mutating storage.

#### Scenario: Save one task array under one traffic work

- **WHEN** Agent submits one traffic work identifier together with one task array
- **THEN** the tool SHALL validate the request through Cybernomads controlled task-module semantics
- **AND** it SHALL return a success result containing the affected traffic work and saved task identities

#### Scenario: Return explicit validation failure details

- **WHEN** batch task save fails because one or more tasks violate required metadata, ownership, or contract rules
- **THEN** the tool SHALL reject the whole batch
- **AND** it SHALL return an explicit failure reason that identifies the validation problem

#### Scenario: Do not allow direct database mutation

- **WHEN** Agent needs to persist the decomposed task set
- **THEN** it SHALL use the controlled batch task save tool
- **AND** the tool contract SHALL not require Agent to directly edit SQLite files
