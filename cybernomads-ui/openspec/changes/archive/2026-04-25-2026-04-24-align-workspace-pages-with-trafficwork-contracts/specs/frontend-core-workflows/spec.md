## MODIFIED Requirements

### Requirement: Frontend SHALL support the first-entry setup workflow
The system SHALL land first-time users on the Console module and guide them through the required current Agent service setup flow when no usable Agent service is configured. The workflow SHALL present real backend configuration state from `docs/api/agent-services.yaml`, open a focused OpenClaw configuration flow from the Console primary action, and guide the user through configuration save, explicit connection verification, and capability preparation as separate business steps before presenting setup as complete.

#### Scenario: Missing connected account blocks traffic work creation path
- **WHEN** a user attempts to create or prepare a traffic work without an account returned by `GET /api/accounts?onlyConnected=true`
- **THEN** the frontend MUST provide a clear path to the Accounts module so the user can complete account setup and return

### Requirement: Frontend SHALL support the workspace execution workflow
The system SHALL allow a user to enter the Workspaces module as the TrafficWork management surface, launch the create-work flow, bind a product, strategy, and account object binding, create a backend TrafficWork, inspect its returned lifecycle and context-preparation state, enter the runtime view, inspect task state, inspect task output records, and open a full-page task detail route. The execution experience SHALL preserve the approved runtime shell while displaying only backend contract-backed TrafficWork and Task data.

#### Scenario: User creates a traffic work and lands in a post-create runtime state
- **WHEN** a user completes product, strategy, and account binding selection and confirms creation
- **THEN** the frontend MUST create a TrafficWork through `POST /api/traffic-works`
- **AND** send the user to the TrafficWork runtime or detail context using the returned `trafficWorkId`
- **AND** MUST NOT imply that the work is already running unless a later `POST /api/traffic-works/{trafficWorkId}/start` succeeds

#### Scenario: User inspects task state in the runtime environment
- **WHEN** a user enters a TrafficWork runtime environment
- **THEN** the frontend MUST show current work lifecycle state and context-preparation state from the Traffic Works API
- **AND** the frontend MUST show current task state from `GET /api/tasks?trafficWorkId=<trafficWorkId>`
- **AND** MUST NOT show mock-only execution logs as real runtime data

#### Scenario: User opens a full-page task detail route from the runtime environment
- **WHEN** a user selects a task node or task detail entry point from the runtime environment
- **THEN** the frontend MUST navigate to a dedicated task-scoped page that loads task detail and output records from the Tasks API
- **AND** the page MUST behave as a task detail and output-record surface unless a future backend contract adds true intervention behavior
