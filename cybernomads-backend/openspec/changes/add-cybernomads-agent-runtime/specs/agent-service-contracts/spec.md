## ADDED Requirements

### Requirement: Agent service contracts SHALL support Cybernomads Agent provider configuration

The system SHALL define configuration contracts for a Cybernomads Agent provider that supports GPT-compatible model access in the first version.

#### Scenario: Configure Cybernomads Agent provider

- **WHEN** the user configures Cybernomads Agent as an Agent provider
- **THEN** the configuration SHALL require a service address, model, reasoning strength, and API Key
- **AND** the API Key SHALL be stored as a secret rather than as visible provider metadata

#### Scenario: Expose safe configuration summary

- **WHEN** the system returns configured Cybernomads Agent provider status
- **THEN** it SHALL include non-secret configuration such as provider code, service address, model, reasoning strength, connection status, and capability status
- **AND** it SHALL NOT include the raw API Key

#### Scenario: Validate GPT provider reachability

- **WHEN** the user verifies Cybernomads Agent provider connection
- **THEN** the system SHALL validate that the configured service address, model, reasoning strength, and API Key can be used for a GPT-compatible request
- **AND** it SHALL return a provider-neutral success or failure reason

### Requirement: Agent service contracts SHALL distinguish planning and execution provider purposes

The system SHALL distinguish Agent provider usage by purpose so task decomposition and task execution can be assigned to different providers.

#### Scenario: Use Cybernomads Agent for planning

- **WHEN** traffic work task decomposition is requested
- **THEN** the system SHALL use the configured planning provider
- **AND** Cybernomads Agent SHALL be a valid planning provider

#### Scenario: Use OpenClaw for execution

- **WHEN** a confirmed task is dispatched for execution
- **THEN** the system SHALL use the configured execution provider
- **AND** OpenClaw SHALL remain a valid execution provider

#### Scenario: Avoid provider-purpose confusion

- **WHEN** a provider is configured only for planning
- **THEN** the system SHALL NOT assume it can execute tasks
- **AND** when a provider is configured only for execution, the system SHALL NOT assume it can decompose an entire traffic work

