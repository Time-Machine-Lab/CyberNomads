## MODIFIED Requirements

### Requirement: Agent task skills SHALL provide task decomposition guidance

The system SHALL provide a task decomposition Skill that guides Agent-generated task sets.

#### Scenario: Generate atomic task set

- **WHEN** Agent decomposes a traffic work into tasks
- **THEN** the Skill SHALL instruct the Agent to keep tasks atomic and context-bounded
- **AND** each task SHALL include task instruction, execution condition, execution input prompt, context reference, and expected output guidance

#### Scenario: Declare task collaboration explicitly

- **WHEN** a task depends on another task
- **THEN** the Skill SHALL instruct the Agent to declare both dependency condition and execution input prompt semantics
- **AND** the execution input prompt SHALL explain where downstream input comes from and how it should be consumed
- **AND** dependency relationships SHALL NOT rely only on implicit prose

#### Scenario: Prepare context assets

- **WHEN** Agent decomposes a traffic work
- **THEN** the Skill SHALL instruct the Agent to prepare or reference the work context assets needed by future subagents
- **AND** platform scripts or data files SHALL be referenced as context assets rather than embedded into task-domain contracts

### Requirement: Agent task skills SHALL provide task execution guidance

The system SHALL provide a task execution Skill that guides Agent execution of one task.

#### Scenario: Execute one task with context

- **WHEN** Agent executes a task
- **THEN** the Skill SHALL instruct the Agent to load the task detail, work context, execution input prompt, and available tools
- **AND** it SHALL treat the execution input prompt as the primary guide for locating upstream outputs, knowledge files, tools, or shared data
- **AND** it SHALL keep execution scoped to the submitted task rather than re-planning the entire traffic work

#### Scenario: Update task status after execution

- **WHEN** Agent finishes task execution
- **THEN** the Skill SHALL instruct the Agent to update task status to `completed` or `failed` through controlled tools
- **AND** it SHALL NOT invent additional task statuses outside `ready`, `running`, `completed`, and `failed`
