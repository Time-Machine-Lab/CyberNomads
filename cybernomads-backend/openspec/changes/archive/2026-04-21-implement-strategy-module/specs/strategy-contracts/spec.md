## ADDED Requirements

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

## MODIFIED Requirements

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
