# agent-task-skills Specification

## Purpose

Define product runtime Agent Skill assets for Cybernomads task decomposition and task execution, including creation workflow, runtime asset storage, task-set guidance, task execution guidance, output-record rules, and system boundary constraints.

## Requirements

### Requirement: Agent task skills SHALL be created using the skill-creator workflow

The system SHALL provide product runtime Skill assets for task decomposition and task execution, and their implementation SHALL follow the skill-creator workflow.

#### Scenario: Initialize standard skill directories

- **WHEN** task Skills are implemented
- **THEN** the implementation SHALL create standard Skill folders for task decomposition and task execution
- **AND** each Skill folder SHALL contain a valid `SKILL.md`
- **AND** each Skill folder SHOULD contain `agents/openai.yaml`
- **AND** the implementation SHALL run Skill validation such as `quick_validate.py` or an equivalent validator

#### Scenario: Store as product runtime assets

- **WHEN** the Skill folders are created
- **THEN** they SHALL be stored as Cybernomads runtime assets by default
- **AND** they SHALL NOT require installation into a developer's personal Codex skill directory to be available to the product

### Requirement: Agent task skills SHALL provide task decomposition guidance

The system SHALL provide a task decomposition Skill that guides Agent-generated task sets.

#### Scenario: Generate atomic task set

- **WHEN** Agent decomposes a traffic work into tasks
- **THEN** the Skill SHALL instruct the Agent to keep tasks atomic and context-bounded
- **AND** each task SHALL include task instruction, execution condition, execution input prompt, context reference, and expected output guidance

#### Scenario: Declare task collaboration explicitly

- **WHEN** a task depends on another task
- **THEN** the Skill SHALL instruct the Agent to declare both dependency condition and execution input prompt semantics
- **AND** dependency relationships SHALL NOT rely only on implicit prose

#### Scenario: Treat execution input prompt as database input guidance

- **WHEN** Agent decomposes a task that needs upstream output, external material, or generated input
- **THEN** the Skill SHALL instruct the Agent to fill the task-set `inputPrompt` field with concrete acquisition and consumption guidance
- **AND** the Skill SHALL explain that `inputPrompt` is persisted as `input_needs_json`
- **AND** the Skill MAY allow an empty `inputPrompt` only when the task truly needs no prior input

#### Scenario: Prepare context assets

- **WHEN** Agent decomposes a traffic work
- **THEN** the Skill SHALL instruct the Agent to prepare or reference the work context assets needed by future subagents
- **AND** platform scripts or data files SHALL be referenced as context assets rather than embedded into task-domain contracts

### Requirement: Agent task skills SHALL provide task execution guidance

The system SHALL provide a task execution Skill that guides Agent execution of one task.

#### Scenario: Execute one task with context

- **WHEN** Agent executes a task
- **THEN** the Skill SHALL instruct the Agent to load the task detail, work context, execution input prompt, and available tools
- **AND** it SHALL keep execution scoped to the submitted task rather than re-planning the entire traffic work

#### Scenario: Update task status after execution

- **WHEN** Agent finishes task execution
- **THEN** the Skill SHALL instruct the Agent to update task status to `completed` or `failed` through controlled tools
- **AND** it SHALL NOT invent additional task statuses outside `ready`, `running`, `completed`, and `failed`

### Requirement: Agent task skills SHALL require output record creation

The task execution Skill SHALL require Agent to create output records when task execution produces data.

#### Scenario: Record produced data

- **WHEN** Agent produces data during task execution
- **THEN** the Skill SHALL instruct the Agent to create a task output record with task identity, description, data location, and creation time
- **AND** the actual output data body MAY remain in the task data area or another referenced artifact location

#### Scenario: Avoid universal output schema

- **WHEN** output data is platform-specific or task-specific
- **THEN** the Skill SHALL NOT require one universal output data schema for all outputs

### Requirement: Agent task skills SHALL preserve system boundaries

The Agent task Skills SHALL not instruct Agent to directly mutate SQLite or rely on provider-specific protocols.

#### Scenario: Use controlled Cybernomads tools

- **WHEN** Agent needs to create tasks, update task state, or create output records
- **THEN** the Skill SHALL instruct it to call Cybernomads controlled tools or APIs
- **AND** it SHALL NOT directly edit database files

#### Scenario: Avoid provider lock-in

- **WHEN** Skills describe task decomposition or execution behavior
- **THEN** they SHALL avoid OpenClaw-specific protocol requirements
- **AND** provider-specific session, subagent, or message details SHALL remain in Agent adapter implementation
