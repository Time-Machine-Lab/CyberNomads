# agent-runtime-resource-catalog Specification

## Purpose
TBD - created by archiving change add-agent-runtime-resource-catalog. Update Purpose after archive.
## Requirements
### Requirement: Runtime agent knowledge SHALL include an Agent resource catalog

The system SHALL provide an `Agent资源清单.md` file under the runtime agent knowledge assets so Agent and developers have one readable index of reusable runtime resources.

#### Scenario: Bundle the catalog as runtime knowledge

- **WHEN** Cybernomads runtime agent assets are prepared
- **THEN** the packaged runtime knowledge assets SHALL include `Agent资源清单.md`
- **AND** the catalog SHALL be stored under the runtime agent knowledge area

#### Scenario: Catalog is readable by task decomposition flows

- **WHEN** a task decomposition flow needs to decide which reusable runtime resources are available
- **THEN** it SHALL be able to read `Agent资源清单.md`
- **AND** the catalog SHALL serve as the primary human-readable inventory of available runtime Skill assets

### Requirement: Agent resource catalog SHALL list runtime Skills in a stable markdown table

The runtime Agent resource catalog SHALL list the available runtime Skills using a stable markdown table structure.

#### Scenario: Catalog contains required Skill columns

- **WHEN** `Agent资源清单.md` is authored or updated
- **THEN** it SHALL use a markdown table for runtime Skill entries
- **AND** the table SHALL contain the columns `id`, `skill文件夹名称`, and `skill作用`

#### Scenario: Catalog records each bundled runtime Skill

- **WHEN** one runtime Skill is considered available for Agent reuse
- **THEN** the catalog SHALL include one corresponding entry for that Skill
- **AND** the entry SHALL allow Agent or developers to identify the Skill folder and its purpose

