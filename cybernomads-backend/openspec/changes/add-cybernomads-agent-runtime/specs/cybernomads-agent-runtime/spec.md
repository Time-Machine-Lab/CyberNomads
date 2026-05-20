## ADDED Requirements

### Requirement: Cybernomads Agent Runtime SHALL support GPT-backed planning

The system SHALL provide a Cybernomads Agent Runtime that can call a GPT-compatible model provider to generate task decomposition drafts for one traffic work.

#### Scenario: Generate a structured task plan draft

- **WHEN** a traffic work enters task decomposition planning
- **THEN** the runtime SHALL call the configured GPT-compatible provider
- **AND** it SHALL return a structured task plan draft instead of directly saving formal tasks
- **AND** the draft SHALL include task goals, expected outputs, input source declarations, dependencies, resource needs, and strategy coverage summaries

#### Scenario: Reject malformed model output

- **WHEN** the model response does not satisfy the required structured output contract
- **THEN** the runtime SHALL reject the draft
- **AND** it SHALL expose a validation failure that can be recorded on the decomposition run

### Requirement: Cybernomads Agent Runtime SHALL provide Agent Review quality gates

The system SHALL use an Agent Review step to judge whether a task plan draft is acceptable before user confirmation or formal task persistence.

#### Scenario: Review task plan quality

- **WHEN** a task plan draft is produced
- **THEN** Review Agent SHALL evaluate task granularity, duplicated tasks, clear outputs, strategy goal coverage, input sources, dependency relationships, resource readiness, and execution feasibility
- **AND** it SHALL return a pass, fix-required, or failed conclusion with a readable issue list

#### Scenario: Review does not require all inputs to come from upstream tasks

- **WHEN** a task input comes from user-provided material, product content, strategy content, platform data, runtime tool output, knowledge files, or other external sources
- **THEN** Review Agent SHALL accept the input source type if it is explicitly declared and obtainable
- **AND** it SHALL flag the input only when the source type, acquisition method, or missing-data behavior is unclear

### Requirement: Cybernomads Agent Runtime SHALL support bounded repair loops

The system SHALL allow task plan drafts to be repaired based on Review Agent issues, while bounding the number of repair attempts.

#### Scenario: Repair a fixable draft

- **WHEN** Review Agent returns fix-required with actionable issues
- **THEN** Repair Agent SHALL receive the draft and issue list
- **AND** it SHALL produce a revised structured draft
- **AND** the revised draft SHALL go through Review again

#### Scenario: Stop after maximum repair attempts

- **WHEN** the repair loop reaches the configured maximum attempt count without a passing Review
- **THEN** the decomposition run SHALL be marked failed or awaiting user feedback
- **AND** no formal task set SHALL be persisted

### Requirement: Cybernomads Agent Runtime SHALL expose Skill and Tool capabilities safely

The runtime SHALL support Skill discovery and controlled tool usage without giving Agent unrestricted database or filesystem access.

#### Scenario: Agent discovers available Skills

- **WHEN** Task Planner needs execution resources for a task plan
- **THEN** the runtime SHALL provide a Skill Registry view of available Cybernomads Skills
- **AND** the resulting draft SHALL record which Skills are required or recommended for each task

#### Scenario: Agent can use read-only and draft tools

- **WHEN** Agent needs context, resources, prior feedback, or draft persistence
- **THEN** it MAY call controlled read-only or draft tools
- **AND** tool inputs and outputs SHALL be schema-validated and logged with secret redaction

#### Scenario: Agent cannot directly commit formal tasks

- **WHEN** Agent produces a task plan draft
- **THEN** it SHALL NOT directly mutate task storage
- **AND** formal task persistence SHALL be performed only by Cybernomads system orchestration after user confirmation

### Requirement: Cybernomads Agent Runtime SHALL preserve secret safety

The runtime SHALL prevent provider credentials and authorization material from leaking into persisted artifacts, task files, or logs.

#### Scenario: Configure provider with API key

- **WHEN** the user configures Cybernomads Agent provider with an API Key
- **THEN** the secret SHALL be stored through the credential store or equivalent secret storage
- **AND** status reads, logs, drafts, Review reports, and task files SHALL NOT expose the raw secret

#### Scenario: Log model and tool interactions

- **WHEN** the runtime records Agent interaction events
- **THEN** it SHALL include provider code, model, stage, tool names, and concise outputs where useful
- **AND** it SHALL redact API keys, Authorization headers, bearer tokens, and credential-like values

