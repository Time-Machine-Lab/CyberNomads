# openclaw-adapter-runtime Specification

## Purpose
Define the runtime behavior for the OpenClaw provider adapter so Cybernomads can connect to its first real external agent service without leaking provider-specific semantics upward.

## Requirements

### Requirement: OpenClaw adapter SHALL verify provider connectivity
The OpenClaw adapter SHALL verify whether the configured OpenClaw gateway can be reached with the supplied endpoint and credentials.

#### Scenario: Connectivity verification succeeds
- **WHEN** the adapter checks a reachable OpenClaw gateway with valid access information
- **THEN** the adapter SHALL return a successful connectivity result through the unified provider abstraction
- **AND** the result SHALL be consumable by the agent access runtime as a connected state input

#### Scenario: Connectivity verification fails
- **WHEN** the adapter checks an unreachable or unauthorized OpenClaw gateway
- **THEN** the adapter SHALL return a unified provider failure result
- **AND** the failure SHALL NOT require upper layers to interpret OpenClaw-specific error payloads

### Requirement: OpenClaw adapter SHALL support session-oriented atomic capabilities
The OpenClaw adapter SHALL implement the minimum session-oriented atomic capabilities required by the agent access runtime.

#### Scenario: Create a provider session
- **WHEN** the runtime requests session creation through the unified provider abstraction
- **THEN** the adapter SHALL create an OpenClaw session or equivalent conversation context
- **AND** the adapter SHALL return a provider-neutral session reference

#### Scenario: Send a message within a session
- **WHEN** the runtime requests message submission for an existing provider session
- **THEN** the adapter SHALL send the message through OpenClaw
- **AND** the adapter SHALL return the provider result through unified response semantics

### Requirement: OpenClaw adapter SHALL support conversation history and subagent invocation
The OpenClaw adapter SHALL provide conversation history access and subagent invocation through the unified provider abstraction.

#### Scenario: Query conversation history
- **WHEN** the runtime requests conversation history for a provider session
- **THEN** the adapter SHALL query OpenClaw conversation records
- **AND** the adapter SHALL normalize the returned data into unified provider response semantics

#### Scenario: Invoke a subagent
- **WHEN** the runtime requests subagent execution through the provider abstraction
- **THEN** the adapter SHALL invoke the corresponding OpenClaw capability
- **AND** the adapter SHALL return a provider-neutral result to the caller

### Requirement: OpenClaw adapter SHALL support capability provisioning
The OpenClaw adapter SHALL support Cybernomads capability provisioning against OpenClaw and SHALL return a normalized readiness result.

#### Scenario: Capability provisioning succeeds
- **WHEN** the runtime requests capability provisioning for the current OpenClaw service
- **THEN** the adapter SHALL perform the provider interaction required to prepare Cybernomads capabilities
- **AND** the adapter SHALL return a success result that can be recorded as provisioning readiness

#### Scenario: Capability provisioning fails
- **WHEN** the provider interaction for capability provisioning does not complete successfully
- **THEN** the adapter SHALL return a unified failure result
- **AND** the adapter SHALL avoid exposing provider-specific installation semantics as business-level output

### Requirement: OpenClaw adapter SHALL isolate provider-specific semantics from upper layers
The OpenClaw adapter SHALL translate OpenClaw-specific requests, responses, and errors into the unified provider abstraction expected by the agent access runtime.

#### Scenario: Provider response is normalized
- **WHEN** OpenClaw returns provider-specific response structures
- **THEN** the adapter SHALL map them into provider-neutral output types
- **AND** upper layers SHALL NOT depend on raw OpenClaw payload schemas

#### Scenario: Provider errors are normalized
- **WHEN** OpenClaw returns provider-specific error conditions
- **THEN** the adapter SHALL map them into unified provider error semantics
- **AND** upper layers SHALL remain independent from OpenClaw-specific failure categories
