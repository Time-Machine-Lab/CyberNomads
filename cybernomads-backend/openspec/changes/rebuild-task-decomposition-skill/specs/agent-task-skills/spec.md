## MODIFIED Requirements

### Requirement: Agent task skills SHALL be created using the skill-creator workflow

The system SHALL provide product runtime Skill assets for task decomposition and task execution, and their implementation SHALL follow the `skill-creator` workflow. The task decomposition Skill SHALL be created or rebuilt as a formal runtime Skill asset rather than an ad-hoc markdown prompt.

#### Scenario: Initialize or rebuild the task decomposition Skill through skill-creator

- **WHEN** the task decomposition Skill is newly created or substantially rebuilt
- **THEN** the implementation SHALL use the `skill-creator` workflow to create or refresh the Skill directory
- **AND** the Skill folder SHALL contain a valid `SKILL.md`
- **AND** the Skill folder SHOULD contain `agents/openai.yaml`
- **AND** the implementation SHALL run Skill validation such as `quick_validate.py` or an equivalent validator

#### Scenario: Store as product runtime assets

- **WHEN** the Skill folders are created or rebuilt
- **THEN** they SHALL be stored as Cybernomads runtime assets by default
- **AND** they SHALL NOT require installation into a developer's personal Codex skill directory to be available to the product

#### Scenario: Task decomposition Skill uses Chinese as the primary instruction language

- **WHEN** the task decomposition Skill is authored or rebuilt
- **THEN** its primary guidance in `SKILL.md` and bundled references SHALL use Chinese
- **AND** the Skill SHALL express business semantics, process guidance, and operating constraints in Chinese unless a specific machine-facing file requires another language

### Requirement: Agent task skills SHALL provide task decomposition guidance

The system SHALL provide a task decomposition Skill that guides Agent-generated task sets and the surrounding work-context preparation process needed before later task execution.

#### Scenario: Understand traffic work context and available runtime resources

- **WHEN** Agent starts decomposing one traffic work
- **THEN** the Skill SHALL instruct the Agent to understand the traffic work context directory structure first
- **AND** it SHALL instruct the Agent to inspect the runtime agent resource catalog before deciding which reusable resources are needed

#### Scenario: Generate atomic tasks with explicit metadata and collaboration semantics

- **WHEN** Agent decomposes a traffic work into tasks
- **THEN** the Skill SHALL instruct the Agent to keep tasks atomic and context-bounded
- **AND** each task SHALL include task instruction, execution condition, input needs, context reference, document reference, and expected output guidance
- **AND** task collaboration SHALL be declared explicitly rather than left as implicit prose

#### Scenario: Prepare context assets for future subagents

- **WHEN** Agent decomposes a traffic work
- **THEN** the Skill SHALL instruct the Agent to plan which Skill assets, tools, knowledge files, and task data files must exist in the work context
- **AND** it SHALL distinguish shared knowledge, per-task data files, and executable tools by their intended directory roles

#### Scenario: Persist task set only through controlled save entry points

- **WHEN** Agent finishes preparing the decomposed task set
- **THEN** the Skill SHALL instruct the Agent to use controlled Cybernomads batch task save tools or APIs
- **AND** it SHALL NOT instruct the Agent to directly edit SQLite files or bypass the task module

## ADDED Requirements

### Requirement: Task decomposition Skill SHALL perform self-check before completion

The task decomposition Skill SHALL require a final self-check pass before the decomposition flow is considered complete.

#### Scenario: Verify task artifacts and task persistence intent

- **WHEN** Agent finishes decomposition planning
- **THEN** the Skill SHALL instruct it to verify that each task has a document reference, context reference, metadata completeness, and output/data plan
- **AND** it SHALL verify that required shared resources and per-task data artifacts have been considered

#### Scenario: Verify controlled persistence path

- **WHEN** Agent is ready to finish the decomposition flow
- **THEN** the Skill SHALL instruct it to confirm that task persistence will happen through the controlled batch task save entry point
- **AND** it SHALL avoid reporting success when task persistence requirements are still unresolved
