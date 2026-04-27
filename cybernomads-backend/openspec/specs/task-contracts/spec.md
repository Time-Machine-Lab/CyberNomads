# task-contracts Specification

## Purpose

Define the top-level API, SQL, and OpenSpec contracts for the task domain so later task runtime, traffic-work task decomposition, planners, and Agent task skills share one stable source of truth for task identity, ownership, lightweight status, execution prerequisites, execution input prompts, controlled task-set writes, and abstract output records.

## Requirements

### Requirement: Task contracts SHALL define task aggregate identity and ownership

The system SHALL define task contracts around one stable task aggregate that belongs to exactly one traffic work.

#### Scenario: Define task ownership

- **WHEN** task contracts are created
- **THEN** each task SHALL reference one owning traffic work
- **AND** tasks SHALL NOT be modeled as standalone objects outside a traffic work

#### Scenario: Define task identity

- **WHEN** a task is represented in API or SQL contracts
- **THEN** it SHALL expose a stable task identifier independent from its display name

### Requirement: Task contracts SHALL define controlled task set creation and replacement

The system SHALL define controlled contracts for creating or replacing a task set under one traffic work.

#### Scenario: Create task set for traffic work

- **WHEN** Agent task decomposition produces a task set for a traffic work
- **THEN** the task contract SHALL allow the backend to persist multiple tasks for that traffic work in one controlled operation
- **AND** each task SHALL satisfy task identity, ownership, status, condition, execution input prompt, and context reference contracts

#### Scenario: Replace task set for traffic work

- **WHEN** a traffic work update triggers task re-decomposition
- **THEN** the task contract SHALL allow the backend to replace the current task set for that traffic work
- **AND** replacement SHALL be represented as a task-module operation rather than direct database mutation

#### Scenario: Reject direct storage mutation

- **WHEN** Agent or subagent flows need to create or replace tasks
- **THEN** the contracts SHALL require controlled Cybernomads API, tool, or service entry points
- **AND** the contracts SHALL NOT allow direct SQLite file edits as an integration contract

### Requirement: Task contracts SHALL define list and detail read semantics

The system SHALL define task list and detail read contracts so upper layers can render task flows, execution consoles, and planner inputs without depending on storage internals.

#### Scenario: Read task summary list

- **WHEN** task contracts define list behavior
- **THEN** they SHALL expose task identity, traffic-work ownership, name, lightweight status, condition summary, execution input prompt, and update time
- **AND** the list contract MAY support filtering by traffic work, status, or keyword

#### Scenario: Read task detail

- **WHEN** task contracts define detail behavior
- **THEN** they SHALL expose task instruction, document reference, context reference, conditions, execution input prompt, status, status reason, and timestamps
- **AND** they SHALL NOT expose provider-specific execution protocol details as task detail requirements

### Requirement: Task contracts SHALL define lightweight task status

The system SHALL define a minimal task status model with only `ready`, `running`, `completed`, and `failed`.

#### Scenario: Ready task is not necessarily executable

- **WHEN** a task status is `ready`
- **THEN** the contracts SHALL allow it to be considered by a planner
- **AND** the contracts SHALL NOT imply it is executable without evaluating conditions

#### Scenario: Running task cannot be submitted again

- **WHEN** a task status is `running`
- **THEN** the contracts SHALL represent that the task has already been submitted for execution
- **AND** duplicate submission semantics SHALL remain outside the task contract

#### Scenario: Update task status through controlled contract

- **WHEN** an Agent, tool, or backend flow updates task status
- **THEN** the contracts SHALL use a controlled task status update entry point
- **AND** the contracts SHALL NOT require direct storage edits for status transitions

### Requirement: Task contracts SHALL define task conditions and execution input prompts

The system SHALL define task condition and execution input prompt contracts so planners and Agents can understand execution prerequisites.

#### Scenario: Define cron condition

- **WHEN** a task declares a cron condition
- **THEN** the contract SHALL express the time-based execution consideration
- **AND** the contract SHALL NOT define the concrete scheduler algorithm

#### Scenario: Define dependency condition

- **WHEN** a task declares a dependency condition
- **THEN** the contract SHALL identify upstream tasks that must be considered before execution
- **AND** the contract SHALL support dependency-driven collaboration between tasks

#### Scenario: Define execution input prompt

- **WHEN** a task requires upstream data
- **THEN** the contract SHALL allow the task to describe, as prompt text, what input is needed and how the Agent should locate, understand, and consume it
- **AND** the persisted field MAY keep the legacy name `input_needs_json` for compatibility while exposing prompt-oriented semantics

### Requirement: Task contracts SHALL define output records without defining output data schemas

The system SHALL define task output records as abstract trace records and SHALL NOT define concrete output data schemas in the task contract.

#### Scenario: Record task output

- **WHEN** a task produces data during execution
- **THEN** the contract SHALL allow recording a task output record with task identity, description, data location, and creation time

#### Scenario: Query task output records

- **WHEN** a caller needs to observe or consume a task's produced artifacts
- **THEN** the contract SHALL allow querying output records for that task
- **AND** each record SHALL expose description, data location, and creation time

#### Scenario: Avoid output schema ownership

- **WHEN** the task output is a video list, comment record, private message, image, or article
- **THEN** the task contract SHALL NOT require task-domain SQL fields for the output data body

### Requirement: Task contracts SHALL align with traffic work task decomposition integration

The system SHALL keep task-set creation and replacement semantics aligned with traffic work creation/update preparation flows.

#### Scenario: Traffic work creation persists decomposed task set

- **WHEN** traffic work creation triggers Agent task decomposition
- **THEN** the resulting task set SHALL be persisted through the task module's controlled task-set creation contract
- **AND** the traffic work SHALL NOT be considered prepared solely because Agent returned a decomposition result

#### Scenario: Traffic work update replaces current task set

- **WHEN** traffic work update triggers Agent task re-decomposition
- **THEN** the resulting task set SHALL replace the current task set for the same traffic work through the task module's controlled replacement contract
- **AND** replacement SHALL preserve the traffic work identity

### Requirement: Task contracts SHALL exclude planner, Agent provider, and platform implementation internals

The system SHALL keep task contracts focused on task identity, status, conditions, execution input prompts, and output records.

#### Scenario: Exclude scheduler internals

- **WHEN** task contracts are reviewed
- **THEN** they SHALL NOT define polling intervals, concurrency control, retry policies, or thread implementation details

#### Scenario: Exclude provider and platform internals

- **WHEN** task contracts are reviewed
- **THEN** they SHALL NOT define OpenClaw-specific APIs, subagent protocols, Bilibili scripts, or platform action internals
