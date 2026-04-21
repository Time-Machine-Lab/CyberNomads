# strategy-contracts Specification

## Purpose
Define the top-level API and SQL contracts for the strategy module so later implementation work has a stable source of truth.

## Requirements

### Requirement: Strategy contracts SHALL define creation and update behavior
The system SHALL define top-level API and SQL contracts for creating and updating strategies. A strategy contract MUST treat strategy name as a readable business attribute rather than a uniqueness key, and SHALL allow summary metadata to be explicitly provided or omitted.

#### Scenario: Strategy creation contract allows non-unique names
- **WHEN** strategy contracts are defined for strategy creation
- **THEN** the contracts SHALL require a stable strategy identifier independent from strategy name
- **AND** the contracts SHALL NOT require strategy name uniqueness as a validation rule

#### Scenario: Strategy create and update contracts support summary fallback
- **WHEN** strategy create or update contracts are defined
- **THEN** the contracts SHALL allow `summary` to be omitted from the request model
- **AND** the contracts SHALL preserve the rule that runtime behavior may derive summary content from markdown when `summary` is absent

#### Scenario: Strategy update contract preserves stable strategy identity
- **WHEN** strategy contracts are defined for updating an existing strategy
- **THEN** the contracts SHALL allow updating strategy name, summary, tags, and markdown content
- **AND** the updated strategy SHALL remain a single stable strategy object identified by its strategy identifier

### Requirement: Strategy contracts SHALL separate summary and detail views
The system SHALL define strategy list behavior as a summary view and strategy detail behavior as a full-content view with high-value derived metadata.

#### Scenario: Strategy list returns summary information
- **WHEN** strategy list contracts are defined
- **THEN** the contracts SHALL require the list response to return summary information sufficient for selection and display
- **AND** the list response SHALL NOT require complete markdown content for every strategy

#### Scenario: Strategy detail returns full markdown and placeholder information
- **WHEN** strategy detail contracts are defined
- **THEN** the contracts SHALL require the detail response to return the complete strategy markdown content
- **AND** the detail response SHALL include parsed placeholder information derived from that markdown content

### Requirement: Strategy contracts SHALL keep snapshot insertion as markdown semantics rather than a dedicated endpoint
The system SHALL express imported strategy snapshots through markdown content and SHALL NOT require a dedicated top-level API endpoint for snapshot insertion behavior in MVP.

#### Scenario: API contract excludes standalone snapshot insertion endpoint
- **WHEN** the strategy API contract is created for MVP
- **THEN** the published API contract SHALL include create, update, list, and detail behavior
- **AND** the published API contract SHALL NOT include a dedicated endpoint whose sole purpose is inserting another strategy snapshot into the current one

#### Scenario: SQL contract does not create import relation tables
- **WHEN** the strategy SQL contract is created
- **THEN** the SQL contract SHALL treat imported snapshot markers as part of markdown content rather than as a separate relational model
- **AND** the SQL contract SHALL NOT introduce a dedicated table solely for tracking strategy-to-strategy snapshot insertion relationships

### Requirement: Strategy contracts SHALL expose placeholder declarations without runtime value binding
The system SHALL define strategy placeholders as template parameter declarations and SHALL NOT require strategy CRUD contracts to collect, store, or return runtime-bound values.

#### Scenario: Detail contract returns declaration set rather than filled values
- **WHEN** the strategy detail contract describes parsed placeholders
- **THEN** it SHALL expose each placeholder using declaration fields such as `type`, `key`, and `defaultValue`
- **AND** the contract SHALL NOT require the detail response to include a runtime-filled placeholder value set

#### Scenario: Create and update contracts preserve markdown as the single template source
- **WHEN** strategy create or update contracts are defined
- **THEN** they SHALL accept the full markdown template as request content
- **AND** they SHALL NOT require callers to register placeholders through a second dedicated request structure

### Requirement: Strategy contracts SHALL align with strategy domain semantics
The system SHALL ensure strategy top-level contracts reflect the current strategy domain design, where a strategy is an independent markdown asset with minimal structured metadata, inline snapshot markers, and typed parameter placeholder declarations.

#### Scenario: SQL contract matches thin strategy domain
- **WHEN** the SQL contract is created
- **THEN** it SHALL define only the minimal data structure needed for strategy identity, summary metadata, tag metadata, and full content association
- **AND** it SHALL NOT introduce deletion, draft, publish, archive, version-chain, experiment, runtime binding, or performance semantics

#### Scenario: API contract fixes typed parameter placeholder syntax
- **WHEN** the API contract is created
- **THEN** it SHALL describe placeholder syntax using stable parameter forms such as `{{string:title=\"默认标题\"}}` and `{{int:max_retry=3}}`
- **AND** it SHALL define the structured placeholder contract with `type`, `key`, and `defaultValue` rather than `objectType` and `objectKey`
