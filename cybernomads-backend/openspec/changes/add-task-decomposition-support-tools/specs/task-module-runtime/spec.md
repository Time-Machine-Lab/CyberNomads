## MODIFIED Requirements

### Requirement: Task module runtime SHALL manage task sets by traffic work

The backend task module SHALL provide controlled operations for creating and replacing the current task set of one traffic work, and these operations SHALL be suitable for use behind Agent-facing batch task save tools.

#### Scenario: Create task set from decomposition result

- **WHEN** the traffic work decomposition integration or a controlled batch task save tool submits a valid task set for a traffic work
- **THEN** the runtime SHALL persist all tasks in that task set under the traffic work
- **AND** created tasks SHALL start in `ready` unless explicitly rejected by validation
- **AND** the runtime SHALL return a success result that identifies the affected traffic work and saved task identities

#### Scenario: Replace current task set for traffic work

- **WHEN** a traffic work update or a controlled batch task save tool requests task-set replacement for one traffic work
- **THEN** the runtime SHALL replace the current task set for that traffic work through one controlled service operation
- **AND** the runtime SHALL NOT require Agent or subagent flows to directly mutate storage

#### Scenario: Reject invalid task set with explicit failure reason

- **WHEN** a task set misses required task identity, name, instruction reference, condition, input need, or context reference semantics
- **THEN** the runtime SHALL reject the whole task set write
- **AND** it SHALL return an explicit validation error reason suitable for upstream tool feedback
