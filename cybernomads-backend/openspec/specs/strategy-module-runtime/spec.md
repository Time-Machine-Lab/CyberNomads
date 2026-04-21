# strategy-module-runtime Specification

## Purpose
Define the backend runtime behavior for the strategy module, including strategy CRUD, markdown content storage, summary fallback, and parameter placeholder parsing.

## Requirements

### Requirement: Strategy module SHALL support strategy creation with metadata and markdown content
The backend strategy module SHALL allow callers to create a strategy with a stable identifier, readable name, minimal metadata, and complete markdown content according to the published strategy contracts.

#### Scenario: Create strategy successfully with explicit summary
- **WHEN** a valid strategy creation request includes name, summary, tags, and markdown content
- **THEN** the system creates a new strategy identified by a stable strategy identifier
- **AND** the created strategy SHALL be retrievable as a detail object with the same markdown content and parsed placeholder declarations

#### Scenario: Create strategy derives summary when omitted
- **WHEN** a valid strategy creation request omits `summary`
- **THEN** the system SHALL derive a summary from the markdown content before persistence
- **AND** the created strategy SHALL remain listable through persisted summary metadata rather than through on-read regeneration

### Requirement: Strategy module SHALL support strategy updates while preserving stable identity
The backend strategy module SHALL allow callers to update an existing strategy's name, summary, tags, and markdown content while preserving it as the same strategy object.

#### Scenario: Update strategy successfully
- **WHEN** a valid strategy update request is submitted for an existing strategy
- **THEN** the system updates the strategy metadata and markdown content
- **AND** subsequent reads SHALL return the latest placeholder declarations and latest summary semantics for that same strategy identifier

### Requirement: Strategy module SHALL provide strategy summary listing
The backend strategy module SHALL provide a list view intended for selection and management, returning summary information rather than complete markdown content.

#### Scenario: List strategies returns summaries
- **WHEN** the strategy list behavior is invoked
- **THEN** the system returns a collection of strategy summary items
- **AND** each item SHALL be sufficient for selection and management without requiring complete markdown content

### Requirement: Strategy module SHALL provide full detail content with placeholder declarations
The backend strategy module SHALL provide a detail view that returns the complete markdown content together with the parsed parameter placeholder declarations derived from that content.

#### Scenario: Detail returns markdown and deduplicated placeholder declarations
- **WHEN** the strategy detail behavior is invoked for an existing strategy
- **THEN** the system returns the strategy's complete markdown content
- **AND** the detail response SHALL include the deduplicated placeholder declaration set defined by `type`, `key`, and `defaultValue`

### Requirement: Strategy module SHALL validate parameter placeholder syntax on write
The backend strategy module SHALL validate parameter placeholders during create and update so persisted strategy markdown always remains compatible with the published placeholder contract.

#### Scenario: Valid placeholder declarations are accepted
- **WHEN** strategy markdown uses supported placeholder syntax such as `{{string:title=\"默认标题\"}}` or `{{int:max_retry=3}}`
- **THEN** the system SHALL accept the strategy content
- **AND** the parsed placeholder declarations SHALL be available to detail consumers without additional manual registration

#### Scenario: Conflicting declarations for the same key are rejected
- **WHEN** a single strategy markdown body declares the same placeholder `key` more than once with different `type` or `defaultValue`
- **THEN** the system SHALL reject the write request as invalid
- **AND** the persisted strategy content SHALL remain unchanged

#### Scenario: Malformed placeholder declaration is rejected
- **WHEN** strategy markdown contains a placeholder that does not match the published parameter syntax
- **THEN** the system SHALL reject the write request as invalid
- **AND** the caller SHALL receive an error that indicates the markdown placeholder contract was violated

### Requirement: Strategy module SHALL preserve imported snapshot markers as markdown semantics
The backend strategy module SHALL treat imported snapshot markers as part of the markdown content and SHALL NOT elevate them into a separate runtime relation model in MVP.

#### Scenario: Detail preserves imported snapshot markers in markdown
- **WHEN** a stored strategy markdown body contains imported snapshot marker comments
- **THEN** the detail response SHALL return those markers as part of the raw markdown content
- **AND** the runtime SHALL NOT require a separate query or table to represent the snapshot source semantics

### Requirement: Strategy module SHALL exclude runtime binding and compilation behavior in MVP
The backend strategy module SHALL expose strategy templates and placeholder declarations without owning placeholder value binding or compiled-string generation behavior in MVP.

#### Scenario: Runtime scope excludes binding and compile endpoint
- **WHEN** the MVP strategy module is implemented
- **THEN** the runtime behavior SHALL include create, update, list, and detail capabilities
- **AND** the runtime behavior SHALL NOT include deletion, placeholder value submission, or a standalone compile endpoint

### Requirement: Strategy module implementation SHALL align with top-level strategy contracts
The backend strategy module SHALL implement runtime behavior in alignment with the published strategy API and SQL contracts before exposing strategy functionality.

#### Scenario: Runtime behavior follows updated contracts
- **WHEN** the strategy module implementation is prepared
- **THEN** the implementation SHALL use the published strategy API and SQL contracts as the source of truth
- **AND** the implementation SHALL update those top-level contracts first if runtime behavior requires contract changes
