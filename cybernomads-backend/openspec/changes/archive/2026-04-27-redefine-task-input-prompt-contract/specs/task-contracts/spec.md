## MODIFIED Requirements

### Requirement: Task contracts SHALL define list and detail read semantics

The system SHALL define task list and detail read contracts so upper layers can render task flows, execution consoles, and planner inputs without depending on storage internals.

#### Scenario: Read task summary list

- **WHEN** task contracts define list behavior
- **THEN** they SHALL expose task identity, traffic-work ownership, name, lightweight status, condition summary, execution input prompt semantics, and update time
- **AND** the list contract MAY support filtering by traffic work, status, or keyword

#### Scenario: Read task detail

- **WHEN** task contracts define detail behavior
- **THEN** they SHALL expose task instruction, document reference, context reference, conditions, execution input prompt, status, status reason, and timestamps
- **AND** the execution input field SHALL be modeled as Agent-consumable prompt text rather than a structured object array
- **AND** they SHALL NOT expose provider-specific execution protocol details as task detail requirements

### Requirement: Task contracts SHALL define task conditions and input needs

The system SHALL define task condition contracts and task execution input prompt contracts so planners and Agents can understand execution prerequisites.

#### Scenario: Define cron condition

- **WHEN** a task declares a cron condition
- **THEN** the contract SHALL express the time-based execution consideration
- **AND** the contract SHALL NOT define the concrete scheduler algorithm

#### Scenario: Define dependency condition

- **WHEN** a task declares a dependency condition
- **THEN** the contract SHALL identify upstream tasks that must be considered before execution
- **AND** the contract SHALL support dependency-driven collaboration between tasks

#### Scenario: Define execution input prompt

- **WHEN** a task requires upstream data or work-context assets
- **THEN** the contract SHALL allow the task to store one execution input prompt describing what input is needed and how the Agent should locate and consume it
- **AND** that field SHALL be produced by the decomposition Agent and consumed by the execution Agent
- **AND** the contract SHALL NOT require the input prompt to be decomposed into fixed `name` / `description` / `source` object items

#### Scenario: Preserve prompt-oriented compatibility

- **WHEN** a task contract is represented in API or SQL documentation
- **THEN** the execution input field semantics SHALL be documented as prompt text even if an existing field name or column name is temporarily retained for compatibility
