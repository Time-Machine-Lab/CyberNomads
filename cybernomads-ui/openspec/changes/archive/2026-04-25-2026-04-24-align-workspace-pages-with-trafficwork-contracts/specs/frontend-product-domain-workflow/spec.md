## MODIFIED Requirements

### Requirement: Frontend SHALL guide users through real product-domain prerequisites
The frontend SHALL guide users through real backend prerequisites before a traffic work can be created or started: a usable Agent service, at least one connected account, one product, and one strategy. Prerequisite checks MUST use backend APIs rather than mock scenario state.

#### Scenario: Work creation checks required resources
- **WHEN** a user opens the work creation flow
- **THEN** the frontend MUST load products from `GET /api/products`, strategies from `GET /api/strategies`, and connected accounts from `GET /api/accounts?onlyConnected=true`
- **AND** it MUST block creation with clear navigation if any required collection is empty

### Requirement: Frontend SHALL create traffic works from product, strategy, and object bindings
The Workspaces creation flow SHALL create backend TrafficWork records. A created work item MUST send `displayName`, `productId`, `strategyId`, and at least one account object binding to `POST /api/traffic-works`.

#### Scenario: User creates a traffic work
- **WHEN** a user submits the work creation flow with a selected product, selected strategy, and selected account
- **THEN** the frontend MUST call `POST /api/traffic-works`
- **AND** the request body MUST include `displayName`, `productId`, `strategyId`, and `objectBindings`
- **AND** the resulting `trafficWorkId` MUST become the route identity for the work detail/runtime page
- **AND** the first post-create view MUST reflect returned lifecycle and context-preparation state instead of assuming the work has already started

### Requirement: Frontend SHALL manage traffic work lifecycle through backend state
The Workspaces list and detail pages SHALL display and mutate TrafficWork lifecycle and context-preparation states using backend responses. The frontend MUST not invent lifecycle states outside `ready`, `running`, `ended`, `archived`, and `deleted`, nor context states outside `pending`, `prepared`, and `failed`.

#### Scenario: User starts a prepared traffic work
- **WHEN** a user starts a work item whose lifecycle status is `ready` and context preparation status is `prepared`
- **THEN** the frontend MUST call `POST /api/traffic-works/{trafficWorkId}/start`
- **AND** update the page from the returned `TrafficWorkDetail`

#### Scenario: User pauses a running traffic work
- **WHEN** a user pauses a work item whose lifecycle status is `running`
- **THEN** the frontend MUST call `POST /api/traffic-works/{trafficWorkId}/pause`
- **AND** update the page from the returned `TrafficWorkDetail`

#### Scenario: User opens a traffic work that is not startable
- **WHEN** a traffic work is not in a backend-supported startable state
- **THEN** the frontend MUST disable or explain the unavailable action based on `lifecycleStatus` and `contextPreparationStatus`

### Requirement: Frontend SHALL display task execution state from task contracts
The runtime page SHALL show task state, task details, and task outputs from `docs/api/tasks.yaml`. It MUST not display fake execution logs, fake live chat, or platform-script activity unless backed by documented task output records or a future backend execution-log contract.

#### Scenario: User enters runtime view for a traffic work
- **WHEN** a user opens `/workspaces/:workspaceId/runtime`
- **THEN** the frontend MUST interpret `workspaceId` as `trafficWorkId`
- **AND** request `GET /api/tasks?trafficWorkId=<trafficWorkId>` for task summaries
- **AND** show work lifecycle and preparation state from `GET /api/traffic-works/{trafficWorkId}`

#### Scenario: User opens task detail route
- **WHEN** a user opens a task-scoped route from the runtime view
- **THEN** the frontend MUST load task detail from `GET /api/tasks/{taskId}`
- **AND** load task outputs from `GET /api/tasks/{taskId}/outputs`
- **AND** present the page as task detail plus output records rather than as a live Agent control surface

#### Scenario: User records a task output note
- **WHEN** the task page supports submitting an execution observation or output note
- **THEN** the frontend MUST call `POST /api/tasks/{taskId}/outputs` with `description` and `dataLocation`
- **AND** MUST NOT send platform-specific output schemas not defined by `docs/api/tasks.yaml`
