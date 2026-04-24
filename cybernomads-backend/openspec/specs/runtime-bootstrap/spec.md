# runtime-bootstrap Specification

## Purpose
TBD - created by archiving change initialize-runtime-foundation. Update Purpose after archive.
## Requirements
### Requirement: Backend SHALL initialize the runtime root on startup
The backend SHALL, during startup, treat the current working directory plus `cybernomads/` as the default runtime root and ensure the runtime root structure is available before the application enters ready state.

#### Scenario: Missing runtime root is created
- **WHEN** the backend starts and the current working directory does not contain `cybernomads/`
- **THEN** the system creates the `cybernomads/` runtime root
- **AND** the system creates the fixed child directories `agent/`, `agent/skills/`, `agent/knowledge/`, `product/`, `strategy/`, and `work/`

#### Scenario: Existing runtime root does not skip follow-up checks
- **WHEN** the backend starts and the current working directory already contains `cybernomads/`
- **THEN** the system skips only the runtime root creation action
- **AND** the system continues checking fixed runtime directories, Agent runtime asset synchronization, SQLite availability, and runtime SQL execution

### Requirement: Backend SHALL prepare the fixed runtime directory structure
The backend SHALL ensure that the runtime root contains the fixed directories required by the MVP runtime layout: `agent/`, `agent/skills/`, `agent/knowledge/`, `product/`, `strategy/`, and `work/`.

#### Scenario: Missing fixed child directory is created
- **WHEN** the runtime root exists but one or more fixed child directories are missing
- **THEN** the system creates each missing fixed child directory before startup completes

#### Scenario: Existing fixed child directories are preserved
- **WHEN** the runtime root and all fixed child directories already exist
- **THEN** the system leaves the existing directories intact
- **AND** the system does not remove or recreate them unnecessarily

### Requirement: Backend SHALL initialize the SQLite runtime database
The backend SHALL create or open the SQLite runtime database file during startup and SHALL require the database to be available before the application enters ready state.

#### Scenario: Missing SQLite file is created
- **WHEN** the backend starts and the SQLite runtime database file does not exist
- **THEN** the system creates the SQLite file
- **AND** the system continues with runtime SQL execution

#### Scenario: Existing SQLite file is reused
- **WHEN** the backend starts and the SQLite runtime database file already exists
- **THEN** the system opens the existing SQLite file
- **AND** the system continues with runtime SQL execution

### Requirement: Backend SHALL execute bundled runtime SQL assets
The backend SHALL load SQL scripts from bundled runtime SQL assets and SHALL execute them against the SQLite runtime database through an idempotent mechanism. The runtime SQL source MUST be independent from `docs/sql/`.

#### Scenario: First startup executes bootstrap SQL
- **WHEN** the backend starts against a SQLite file that has not recorded prior runtime SQL execution
- **THEN** the system executes the bundled runtime SQL scripts
- **AND** the system creates only system-level initialization state required by the bootstrap mechanism

#### Scenario: Repeated startup does not reapply executed scripts
- **WHEN** the backend starts and the bundled runtime SQL scripts have already been applied
- **THEN** the system skips reapplying the previously executed scripts
- **AND** the startup remains successful without duplicating initialization state

### Requirement: Backend SHALL not create business runtime content during bootstrap
The backend SHALL limit startup initialization to runtime foundation concerns and bundled Agent runtime asset synchronization and MUST NOT create concrete work instance directories, default product files, default strategy files, or other business seed content.

#### Scenario: Bootstrap does not create concrete work directories
- **WHEN** the backend completes startup initialization
- **THEN** the runtime root contains `work/`
- **AND** the system does not create any `work/<specific-work>/` directory by default

#### Scenario: Bootstrap does not create default markdown content
- **WHEN** the backend completes startup initialization
- **THEN** the system does not create default product markdown files
- **AND** the system does not create default strategy markdown files

### Requirement: Backend SHALL synchronize bundled Agent runtime assets into the runtime root
The backend SHALL synchronize bundled Agent runtime assets from the packaged runtime asset source into `cybernomads/agent/skills/` and `cybernomads/agent/knowledge/` during startup so runtime-facing Agent paths remain stable.

#### Scenario: First startup copies bundled Agent assets
- **WHEN** the backend starts against a runtime root that does not yet contain bundled Agent runtime assets
- **THEN** the system copies the bundled `skills/` assets into `cybernomads/agent/skills/`
- **AND** the system copies the bundled `knowledge/` assets into `cybernomads/agent/knowledge/`

#### Scenario: Repeated startup refreshes managed Agent assets without deleting unrelated files
- **WHEN** the backend starts and the runtime root already contains Agent runtime assets
- **THEN** the system rechecks the bundled Agent asset source and refreshes managed files as needed
- **AND** the system does not delete unrelated runtime files that are outside the bundled managed set

### Requirement: Backend SHALL fail startup clearly when bootstrap cannot complete
The backend SHALL stop startup and return an explicit failure when the runtime root cannot be prepared, the SQLite database cannot be opened or created, or bundled runtime SQL execution fails.

#### Scenario: SQLite creation failure stops startup
- **WHEN** the backend cannot create or open the SQLite runtime database
- **THEN** the startup fails
- **AND** the system returns an explicit bootstrap error instead of silently continuing

#### Scenario: Runtime SQL execution failure stops startup
- **WHEN** a bundled runtime SQL script cannot be loaded or executed successfully
- **THEN** the startup fails
- **AND** the system returns an explicit bootstrap error instead of entering ready state
