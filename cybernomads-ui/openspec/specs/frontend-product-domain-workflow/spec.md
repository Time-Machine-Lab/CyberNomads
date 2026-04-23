## Purpose
Define the real product-domain workflow that connects products, strategies, accounts, traffic works, and tasks.

## Requirements

### Requirement: Frontend SHALL guide users through real product-domain prerequisites
The frontend SHALL guide users through real backend prerequisites before a traffic work can be created or started: a usable Agent service, at least one consumable account, one product, and one strategy. Prerequisite checks MUST use backend APIs rather than mock scenario state.

#### Scenario: Console shows Agent service prerequisite
- **WHEN** no current Agent service exists or it is not usable
- **THEN** the Console module MUST guide the user to configure and verify the current Agent service through `docs/api/agent-services.yaml`

#### Scenario: Work creation checks required resources
- **WHEN** a user opens the work creation flow
- **THEN** the frontend MUST load products from `GET /api/products`, strategies from `GET /api/strategies`, and consumable accounts from `GET /api/accounts?onlyConsumable=true`
- **AND** it MUST block creation with clear navigation if any required collection is empty

### Requirement: Frontend SHALL create traffic works from product, strategy, and object bindings
The Workspaces creation flow SHALL create backend TrafficWork records. A created work item MUST send `displayName`, `productId`, `strategyId`, and at least one account object binding to `POST /api/traffic-works`.

#### Scenario: User creates a traffic work
- **WHEN** a user submits the work creation flow with a selected product, selected strategy, and selected account
- **THEN** the frontend MUST call `POST /api/traffic-works`
- **AND** the request body MUST include `displayName`, `productId`, `strategyId`, and `objectBindings`
- **AND** the resulting `trafficWorkId` MUST become the route identity for the work detail/runtime page

#### Scenario: Object bindings map accounts to strategy slots
- **WHEN** selected accounts are converted to `objectBindings`
- **THEN** each binding MUST include `objectType`, `objectKey`, `resourceId`, and `resourceLabel` as defined in `docs/api/traffic-works.yaml`

### Requirement: Frontend SHALL manage traffic work lifecycle through backend state
The Workspaces list and detail pages SHALL display and mutate TrafficWork lifecycle and context-preparation states using backend responses. The frontend MUST not invent lifecycle states outside `ready`, `running`, `ended`, `archived`, and `deleted`, nor context states outside `pending`, `prepared`, and `failed`.

#### Scenario: User starts a prepared traffic work
- **WHEN** a user starts a work item whose lifecycle status is `ready` and context preparation status is `prepared`
- **THEN** the frontend MUST call `POST /api/traffic-works/{trafficWorkId}/start`
- **AND** update the page from the returned `TrafficWorkDetail`

#### Scenario: User opens a traffic work that is not startable
- **WHEN** a traffic work is not in a backend-supported startable state
- **THEN** the frontend MUST disable or explain the unavailable action based on `lifecycleStatus` and `contextPreparationStatus`

### Requirement: Frontend SHALL display task execution state from task contracts
The runtime page SHALL show task state, task details, and task outputs from `docs/api/tasks.yaml`. It MUST not display fake execution logs or platform-script activity unless backed by documented task output records or a future backend execution-log contract.

#### Scenario: User enters runtime view for a traffic work
- **WHEN** a user opens `/workspaces/:workspaceId/runtime`
- **THEN** the frontend MUST interpret `workspaceId` as `trafficWorkId`
- **AND** request `GET /api/tasks?trafficWorkId=<trafficWorkId>` for task summaries

#### Scenario: User opens task intervention page
- **WHEN** a user opens a task-scoped intervention route
- **THEN** the frontend MUST load task detail from `GET /api/tasks/{taskId}`
- **AND** load task outputs from `GET /api/tasks/{taskId}/outputs`

#### Scenario: User records a task output note
- **WHEN** the intervention page supports submitting an execution observation or output note
- **THEN** the frontend MUST call `POST /api/tasks/{taskId}/outputs` with `description` and `dataLocation`
- **AND** MUST NOT send platform-specific output schemas not defined by `docs/api/tasks.yaml`
