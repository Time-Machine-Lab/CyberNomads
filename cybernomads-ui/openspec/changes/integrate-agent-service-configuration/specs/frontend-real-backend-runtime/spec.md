## MODIFIED Requirements

### Requirement: Frontend production runtime SHALL use documented backend APIs
The frontend production runtime SHALL load and mutate domain data only through entity API adapters backed by `docs/api/*.yaml`. Production page components MUST NOT import `shared/mocks/runtime`, `mockScenarioId`, scenario setters, or mock data helpers. Console and OpenClaw setup behavior MUST use `docs/api/agent-services.yaml` as the only production contract for current Agent service state.

#### Scenario: Production page loads domain data
- **WHEN** a production page loads product-domain data
- **THEN** the page MUST call an entity API adapter that maps to a documented backend endpoint
- **AND** MUST NOT read data directly from shared mock scenario state

#### Scenario: Console loads Agent service status
- **WHEN** the Console page loads Agent service readiness
- **THEN** the page MUST call an entity API adapter backed by `GET /api/agent-services/current/status`
- **AND** MUST NOT synthesize current Agent state from mock node fixtures

#### Scenario: Mock runtime import is removed from production pages
- **WHEN** source files under `src/pages` or `src/entities/*/api` are inspected
- **THEN** they MUST NOT import from `@/shared/mocks/runtime`

### Requirement: Frontend SHALL provide real API adapters for all MVP domains
The frontend SHALL provide entity API adapters and DTO mappers for Agent Services, Account Onboarding Sessions, Accounts, Products, Strategies, Traffic Works, and Tasks. Each adapter MUST align request paths, request bodies, response handling, and 404/409/400 behavior with the corresponding file under `docs/api`. The Agent Services adapter MUST map request and response DTOs without adding provider-private fields that are absent from `docs/api/agent-services.yaml`.

#### Scenario: Agent service pages use Agent Services API
- **WHEN** the Console or OpenClaw configuration flow needs current Agent service state
- **THEN** the frontend MUST use `GET /api/agent-services/current`, `POST /api/agent-services/current`, `PUT /api/agent-services/current`, `GET /api/agent-services/current/status`, `POST /api/agent-services/current/connection-verification`, and `POST /api/agent-services/current/capability-provisioning` according to `docs/api/agent-services.yaml`

#### Scenario: Agent service adapter submits documented configuration shape
- **WHEN** the OpenClaw page creates or updates the current Agent service
- **THEN** the adapter MUST submit only `providerCode`, `endpointUrl`, and `authentication` according to the documented create or update schema
- **AND** it MUST NOT submit install path, gateway URL, node name, notes, diagnostics logs, or parallel limit as Agent Services API fields

#### Scenario: Traffic work pages use Traffic Works API
- **WHEN** the Workspaces module lists, creates, opens, updates, starts, pauses, ends, archives, or deletes a work item
- **THEN** the frontend MUST call the corresponding `docs/api/traffic-works.yaml` endpoint and map `trafficWorkId` as the stable work identity

#### Scenario: Task pages use Tasks API
- **WHEN** a runtime or task intervention page displays task information for a work item
- **THEN** the frontend MUST call `GET /api/tasks` with `trafficWorkId`, `GET /api/tasks/{taskId}`, and task output endpoints as defined in `docs/api/tasks.yaml`
