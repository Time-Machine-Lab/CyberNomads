# agent-service-contracts Specification

## Purpose
Define the top-level API and SQL contracts for the agent service access domain so later runtime implementation and provider adapters have a stable source of truth.

## Requirements

### Requirement: Agent service contracts SHALL define a single active external service model
The system SHALL define top-level contracts around one current active external agent service in MVP rather than a multi-service routing model.

#### Scenario: Configure current active service
- **WHEN** the top-level contracts define agent service configuration behavior
- **THEN** the contracts SHALL describe one current active agent service object
- **AND** the contracts SHALL NOT require concurrent activation of multiple external agent services

#### Scenario: Update current active service
- **WHEN** the top-level contracts define agent service update behavior
- **THEN** the contracts SHALL preserve the semantics that the system uses only one active service at a time
- **AND** the contracts SHALL make service replacement an explicit change of the current active connection

### Requirement: Agent service contracts SHALL define connection verification and status behavior
The system SHALL define top-level contracts for verifying whether the configured agent service can be reached and for exposing the current connection state.

#### Scenario: Verify configured service connection
- **WHEN** the connection verification contract is defined
- **THEN** the contracts SHALL require the system to validate reachability of the configured external agent service
- **AND** the verification result SHALL be expressible as current connection status

#### Scenario: Connected state is sufficient for MVP availability
- **WHEN** the connection status contract is defined
- **THEN** the contracts SHALL treat successful connection as the usable MVP state
- **AND** the contracts SHALL NOT require an additional user-facing executable state

### Requirement: Agent service contracts SHALL define capability provisioning behavior
The system SHALL define top-level contracts for triggering and tracking capability provisioning required by Cybernomads.

#### Scenario: Capability provisioning is exposed as business state
- **WHEN** the capability provisioning contract is defined
- **THEN** the contracts SHALL express whether required capabilities are prepared for the current active service
- **AND** the contracts SHALL avoid exposing provider-specific installation actions as top-level business semantics

#### Scenario: Capability provisioning depends on active connection context
- **WHEN** the system defines capability provisioning behavior
- **THEN** the contracts SHALL relate capability provisioning to the current configured service
- **AND** the contracts SHALL make the provisioning result visible through service status reads

### Requirement: Agent service contracts SHALL remain provider-agnostic
The system SHALL define top-level contracts that do not bind upper-layer behavior to OpenClaw-specific fields or lifecycle semantics.

#### Scenario: Provider-specific details stay out of top-level API contracts
- **WHEN** the API contract is created
- **THEN** the contract SHALL use provider-neutral connection and status semantics
- **AND** the contract SHALL NOT require OpenClaw-specific request or response fields as business-level requirements

#### Scenario: SQL contract preserves provider substitution
- **WHEN** the SQL contract is created
- **THEN** the contract SHALL store only the minimum provider-identifying and connection-related state needed by the domain
- **AND** the contract SHALL avoid persistence semantics that prevent later provider replacement

### Requirement: Agent service contracts SHALL exclude resilience and multi-service routing in MVP
The system SHALL keep the first agent service contracts focused on basic connection and readiness behavior and SHALL exclude failover, retries, and multi-service routing concerns.

#### Scenario: No failover contract is published
- **WHEN** the MVP contracts are defined
- **THEN** the contracts SHALL include configuration, verification, status, and capability provisioning behavior
- **AND** the contracts SHALL NOT include automatic failover or retry semantics

#### Scenario: No multi-service routing contract is published
- **WHEN** the MVP contracts are defined
- **THEN** the contracts SHALL model only one active service
- **AND** the contracts SHALL NOT define service selection or route-by-provider behavior
