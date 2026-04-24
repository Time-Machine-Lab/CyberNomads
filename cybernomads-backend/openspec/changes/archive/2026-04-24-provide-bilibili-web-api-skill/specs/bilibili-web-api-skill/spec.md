# bilibili-web-api-skill Specification

## ADDED Requirements

### Requirement: Bilibili web API skill SHALL be provided as a runtime script asset

The system SHALL provide a product runtime Skill named `bilibili-web-api` under `runtime-assets/skills/` for calling Bilibili Web APIs through executable scripts.

#### Scenario: Create standard skill asset structure

- **WHEN** the skill is implemented
- **THEN** the implementation SHALL create a standard Skill folder under `runtime-assets/skills/bilibili-web-api/`
- **AND** the folder SHALL contain a valid `SKILL.md`
- **AND** the folder SHOULD contain `agents/openai.yaml`
- **AND** the folder SHALL include executable scripts, references, tests, and package metadata needed by the Skill

#### Scenario: Keep the skill as a product asset

- **WHEN** the skill is packaged
- **THEN** it SHALL be delivered as a Cybernomads product runtime asset
- **AND** it SHALL NOT require installation into a developer's personal Codex skills directory to exist as product content
- **AND** it SHALL NOT require automatic injection into the current Agent access flow for this capability to be valid

### Requirement: Bilibili web API skill SHALL expose core Bilibili Web API commands

The skill SHALL provide executable commands for core Bilibili Web API capabilities.

#### Scenario: Support core command groups

- **WHEN** the skill is implemented
- **THEN** it SHALL expose command groups for `auth`, `account`, `video`, `comment`, `notification`, and `dm`
- **AND** it SHALL support commands covering:
  - QR login start
  - QR login poll
  - Cookie refresh check
  - Cookie refresh
  - Current account info
  - Video search
  - Video detail
  - Comment list
  - Comment main-stream scan
  - Comment send
  - Notification unread summary
  - Reply notification list
  - DM session list
  - DM message list
  - DM send

#### Scenario: Keep helper functions internal

- **WHEN** helper abilities such as `oid` resolution or WBI signing are needed
- **THEN** the implementation SHALL keep them as internal library functions
- **AND** it SHALL NOT require separate top-level CLI commands for every internal helper

### Requirement: Bilibili web API skill SHALL keep caller-managed authentication state

The skill SHALL accept authentication state from the caller and SHALL NOT persist account state locally.

#### Scenario: Accept explicit cookie inputs

- **WHEN** a command requires Cookie input
- **THEN** the implementation SHALL support direct value input, environment-variable indirection, and file-based input
- **AND** the documentation SHALL recommend environment-variable or file-based input for sensitive values

#### Scenario: Avoid local session persistence

- **WHEN** the skill executes login, refresh, or write operations
- **THEN** it SHALL NOT write local session files, account snapshots, or runtime-owned authentication state
- **AND** it SHALL NOT depend on a pre-initialized runtime root, SQLite database, or session store

### Requirement: Bilibili web API skill SHALL preserve login and refresh as pure API capabilities

The skill SHALL keep QR login and Cookie refresh in the API surface, but return results directly to the caller.

#### Scenario: Start QR login

- **WHEN** the caller runs QR login start
- **THEN** the command SHALL return at least `qrcodeKey` and `loginUrl`
- **AND** it MAY return terminal QR output when the required dependency is available

#### Scenario: Poll QR login result

- **WHEN** the caller runs QR login poll with a `qrcodeKey`
- **THEN** the command SHALL return login status information
- **AND** on success it SHALL return the reusable Cookie string, refresh token, user info, and other key login outputs needed by the caller
- **AND** it SHALL NOT recover `qrcodeKey` from a previous local session file

#### Scenario: Refresh cookie

- **WHEN** the caller runs Cookie refresh with Cookie and refresh token inputs
- **THEN** the command SHALL perform refresh-related Web API calls
- **AND** it SHALL return the refreshed Cookie and refreshed token outputs directly
- **AND** it SHALL NOT persist the refreshed state locally

### Requirement: Bilibili web API skill SHALL use anonymous-first search fallback

The skill SHALL prefer anonymous search for video discovery and fall back to Cookie-backed search only on explicit anonymous failure.

#### Scenario: Run video search

- **WHEN** the caller runs `video search`
- **THEN** the implementation SHALL first attempt anonymous search
- **AND** it SHALL fall back to explicit Cookie-backed search only when anonymous mode fails with request, permission, or risk-control errors

#### Scenario: Do not treat empty result as anonymous failure

- **WHEN** anonymous search returns no matching results
- **THEN** the implementation SHALL treat that as a valid search outcome
- **AND** it SHALL NOT automatically retry with Cookie-backed search only because the result set is empty

### Requirement: Bilibili web API skill SHALL default to minimal outputs

The skill SHALL default to returning a small set of key fields and support optional expanded output.

#### Scenario: Return minimal output by default

- **WHEN** the caller runs a command without debug options
- **THEN** the command SHALL return only key fields needed for normal consumption
- **AND** it SHALL NOT include full raw responses by default

#### Scenario: Support raw and verbose modes

- **WHEN** the caller explicitly enables `raw` or `verbose`
- **THEN** the command SHALL include raw API payloads and/or execution detail according to the documented output contract

### Requirement: Bilibili web API skill SHALL not include growth-ops business semantics

The skill SHALL remain a pure Bilibili Web API layer rather than a growth-ops workflow layer.

#### Scenario: Exclude business orchestration concepts

- **WHEN** the skill is implemented
- **THEN** it SHALL NOT depend on or expose task stages, product facts, strategy templates, review flows, cooldown checks, dedupe checks, or operation record writes
- **AND** it SHALL NOT import SQLite facts, runtime bootstrap, workflow modules, or session-store modules from the old growth-ops Skill

#### Scenario: Keep write operations as pure API sends

- **WHEN** the caller sends comments, replies, or DMs
- **THEN** the implementation SHALL perform the corresponding Web API call
- **AND** it SHALL NOT enforce business throttling, deduplication, or approval logic inside the script layer

### Requirement: Bilibili web API skill SHALL declare runtime dependencies clearly

The skill SHALL document its runtime requirements and dependency usage.

#### Scenario: Declare Node and package dependencies

- **WHEN** the skill is delivered
- **THEN** `package.json` SHALL declare the Node runtime requirement and npm dependencies needed by the scripts
- **AND** the Skill documentation SHALL explain what each dependency is used for

#### Scenario: Explain dependency-sensitive behavior

- **WHEN** some commands depend on optional or environment-sensitive packages such as QR code rendering
- **THEN** the Skill documentation SHALL state which commands rely on them
- **AND** the implementation SHALL return a clear error or documented fallback behavior when such dependencies are unavailable
