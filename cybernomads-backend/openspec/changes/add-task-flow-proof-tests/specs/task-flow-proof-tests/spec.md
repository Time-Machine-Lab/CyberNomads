# task-flow-proof-tests Specification

## ADDED Requirements

### Requirement: Task flow proof tests SHALL cover the full happy path

The test suite SHALL include a deterministic integration test that proves the task-domain flow from traffic work creation to task execution tracking.

#### Scenario: Prove traffic work creation creates prepared task set

- **WHEN** the proof test creates product, strategy, Agent service configuration, and a traffic work
- **THEN** the traffic work SHALL become `ready`
- **AND** context preparation SHALL become `prepared`
- **AND** Agent task decomposition SHALL have been requested
- **AND** the decomposed task set SHALL be persisted under the traffic work

#### Scenario: Prove running traffic work tasks can be planned

- **WHEN** the proof test starts the prepared traffic work
- **THEN** the traffic work SHALL become `running`
- **AND** a controlled planner tick SHALL scan the running work
- **AND** at least one ready task SHALL be submitted for Agent execution
- **AND** the submitted task SHALL become `running`

#### Scenario: Prove task completion and output traceability

- **WHEN** the proof test simulates Agent task completion through controlled task APIs
- **THEN** the task SHALL become `completed`
- **AND** at least one output record SHALL be created for the task
- **AND** the output record SHALL be queryable by task ID

### Requirement: Task flow proof tests SHALL produce visible evidence artifacts

The proof test SHALL produce clear artifacts that explain what was tested and why the result is trusted.

#### Scenario: Write human-readable report

- **WHEN** the proof test finishes
- **THEN** it SHALL write a `report.md` artifact
- **AND** the report SHALL include created IDs, major state transitions, planner results, Agent message summary, output records, and final conclusion

#### Scenario: Write structured evidence

- **WHEN** the proof test finishes
- **THEN** it SHALL write `evidence.json`
- **AND** the evidence SHALL include machine-readable proof flags for Agent decomposition, task-set persistence, planner submission, status updates, and output record creation

#### Scenario: Preserve diagnostic traces

- **WHEN** the proof test interacts with Agent service, planner, HTTP APIs, or runtime files
- **THEN** it SHOULD write diagnostic artifacts such as `agent-messages.json`, `planner-ticks.json`, `http-transcript.json`, `final-state.json`, or `runtime-tree.txt`

### Requirement: Task flow proof tests SHALL use deterministic infrastructure

The proof test SHALL avoid nondeterministic external dependencies while still using real Cybernomads runtime infrastructure.

#### Scenario: Use fake Agent provider

- **WHEN** the proof test needs Agent decomposition or execution behavior
- **THEN** it SHALL use a deterministic Fake Agent Provider
- **AND** it SHALL NOT require a real OpenClaw gateway

#### Scenario: Use real local runtime stores

- **WHEN** the proof test runs
- **THEN** it SHALL use a temporary working directory with real SQLite and local file-system runtime paths
- **AND** it SHALL avoid mutating the developer's normal runtime data

