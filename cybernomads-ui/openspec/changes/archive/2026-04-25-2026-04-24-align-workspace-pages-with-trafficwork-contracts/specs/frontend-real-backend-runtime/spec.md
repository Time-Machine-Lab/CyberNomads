## MODIFIED Requirements

### Requirement: Frontend production runtime SHALL use documented backend APIs
The frontend production runtime SHALL load and mutate domain data only through entity API adapters backed by `docs/api/*.yaml`. Production page components MUST NOT import `shared/mocks/runtime`, `mockScenarioId`, scenario setters, or mock data helpers. Console and OpenClaw setup behavior MUST use `docs/api/agent-services.yaml` as the only production contract for current Agent service state.

#### Scenario: Workspace runtime page loads contract-backed runtime data
- **WHEN** a production workspace runtime page loads a work item
- **THEN** it MUST read work state from the Traffic Works API and task state from the Tasks API
- **AND** it MUST NOT synthesize execution logs, intervention chat, or task execution streams from mock runtime helpers

### Requirement: Frontend SHALL provide real API adapters for all MVP domains
The frontend SHALL provide entity API adapters and DTO mappers for Agent Services, Account Onboarding Sessions, Accounts, Products, Strategies, Traffic Works, and Tasks. Each adapter MUST align request paths, request bodies, response handling, and 404/409/400 behavior with the corresponding file under `docs/api`. The Agent Services adapter MUST map request and response DTOs without adding provider-private fields that are absent from `docs/api/agent-services.yaml`.

#### Scenario: Traffic work pages use Traffic Works API
- **WHEN** the Workspaces module lists, creates, opens, updates, starts, pauses, ends, archives, or deletes a work item
- **THEN** the frontend MUST call the corresponding `docs/api/traffic-works.yaml` endpoint and map `trafficWorkId` as the stable work identity
- **AND** runtime actions MUST remain within the lifecycle operations explicitly defined by the Traffic Works contract

#### Scenario: Task pages use Tasks API
- **WHEN** a runtime or task detail page displays task information for a work item
- **THEN** the frontend MUST call `GET /api/tasks` with `trafficWorkId`, `GET /api/tasks/{taskId}`, and task output endpoints as defined in `docs/api/tasks.yaml`
- **AND** any write from the task detail page MUST remain within documented task output-record contracts unless a future API adds more capabilities
