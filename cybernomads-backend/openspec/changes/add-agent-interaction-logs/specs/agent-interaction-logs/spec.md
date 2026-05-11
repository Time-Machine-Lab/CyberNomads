## ADDED Requirements

### Requirement: Agent interaction logs SHALL be persisted as local log files

The backend SHALL persist Agent interaction traces as readable `.logs` files under the backend logs directory.

#### Scenario: Task decomposition submission creates a traffic work log entry
- **WHEN** the backend submits a task decomposition request for a traffic work
- **THEN** the system SHALL append a log entry associated with that traffic work
- **AND** the entry SHALL include the traffic work identity, provider session identity when available, submitted prompt summary, and task decomposition Skill reference

#### Scenario: Task execution creates a task log entry
- **WHEN** the backend submits a task execution request for a task
- **THEN** the system SHALL append a log entry associated with that task
- **AND** the entry SHALL include the task identity, provider session identity when available, submitted instruction summary, and task execution Skill reference

### Requirement: Agent interaction logs SHALL preserve key observable conversation flow

The backend SHALL write log content that lets developers and AI inspect the meaningful flow of an Agent interaction without requiring provider-specific tooling.

#### Scenario: Observable conversation data is logged
- **WHEN** observable Agent conversation data is available
- **THEN** the log SHALL include input, output, normalized provider messages, tool-call summaries, skill references, and concise reasoning or decision summaries

#### Scenario: Provider history is not immediately available
- **WHEN** a fire-and-forget Agent request does not yet have provider history available
- **THEN** the log SHALL still include the accepted submission event and later backend-observed controlled tool events when those events occur

### Requirement: Agent interaction logging SHALL be non-blocking

The backend SHALL treat log writing as best-effort diagnostic behavior rather than part of the business transaction.

#### Scenario: Log write fails during Agent submission
- **WHEN** the backend successfully submits an Agent request but fails to write the corresponding log entry
- **THEN** the Agent submission SHALL remain successful
- **AND** the logging failure SHALL NOT change task status, traffic work status, or provider response handling

#### Scenario: Log write fails during controlled tool handling
- **WHEN** an Agent-controlled backend tool succeeds but its log event cannot be written
- **THEN** the tool result SHALL remain successful
- **AND** the logging failure SHALL NOT be returned as the tool failure reason

### Requirement: Agent interaction logging SHALL be configurable

The backend SHALL allow Agent interaction logging to be turned off by configuration while keeping local development logging enabled by default.

#### Scenario: Logging is enabled locally
- **WHEN** the backend runs without an explicit Agent log disable setting
- **THEN** Agent interaction logging SHALL be enabled for local runtime use

#### Scenario: Logging is disabled by configuration
- **WHEN** the configured Agent interaction logging switch is disabled
- **THEN** the backend SHALL skip writing Agent interaction log files
- **AND** Agent decomposition, execution, and controlled tool flows SHALL continue normally

### Requirement: Agent interaction logs SHALL avoid unsafe or misleading content

The backend SHALL sanitize sensitive values and SHALL avoid representing hidden model reasoning as if it were a captured provider artifact.

#### Scenario: Sensitive values are present in log payloads
- **WHEN** a log payload contains credential-like, authorization-like, or bearer-token-like values
- **THEN** the persisted log SHALL mask those values before writing to disk

#### Scenario: Raw internal reasoning is not exposed
- **WHEN** the system records an Agent reasoning-related event
- **THEN** it SHALL persist only observable assistant text, explicit provider-visible reasoning summaries, or backend decision notes
- **AND** it SHALL NOT require access to hidden model chain-of-thought
