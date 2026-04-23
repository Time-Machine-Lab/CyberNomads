## Purpose
Define the real backend-backed first-entry and workspace execution workflows for the CyberNomads frontend.

## Requirements

### Requirement: Frontend SHALL support the first-entry setup workflow
The system SHALL land first-time users on the Console module and guide them through the required current Agent service setup flow when no usable Agent service is configured. The workflow SHALL present real backend configuration state from `docs/api/agent-services.yaml`, open a focused OpenClaw configuration flow from the Console primary action, and guide the user through configuration save, explicit connection verification, and capability preparation as separate business steps before presenting setup as complete.

#### Scenario: User first enters the product without a configured agent service
- **WHEN** a user opens the product and `GET /api/agent-services/current/status` indicates no current usable service
- **THEN** the frontend MUST render the unconfigured Console module as the default landing experience
- **AND** the primary Console action MUST send the user to `/console/openclaw`

#### Scenario: User saves Agent service configuration from the console flow
- **WHEN** a user enters the Agent service configuration flow from the Console module and saves a new or updated OpenClaw service
- **THEN** the frontend MUST update the setup flow from the returned `CurrentAgentService`
- **AND** the frontend MUST show connection verification as the next required step rather than returning to Console as if setup were complete

#### Scenario: User completes connection verification and capability preparation
- **WHEN** a user verifies the current Agent service connection and prepares required capabilities successfully
- **THEN** the frontend MUST refresh Console state from `GET /api/agent-services/current/status`
- **AND** the Console MUST distinguish connection usability from capability readiness

#### Scenario: Missing account blocks traffic work creation path
- **WHEN** a user attempts to create or prepare a traffic work without an account returned by `GET /api/accounts?onlyConsumable=true`
- **THEN** the frontend MUST provide a clear path to the Accounts module so the user can complete account onboarding and return

### Requirement: Frontend SHALL support the workspace execution workflow
The system SHALL allow a user to enter the Workspaces module as the TrafficWork management surface, launch the create-work flow, bind a product, strategy, and account object binding, create a backend TrafficWork, enter the runtime view, inspect task state, inspect task output records, and open a full-page task intervention view. The execution experience SHALL preserve the approved runtime shell while displaying only backend contract-backed TrafficWork and Task data.

#### Scenario: User creates a traffic work from prepared resources
- **WHEN** a user completes product, strategy, and account binding selection and confirms creation
- **THEN** the frontend MUST create a TrafficWork through `POST /api/traffic-works`
- **AND** send the user to the TrafficWork runtime or detail context using the returned `trafficWorkId`

#### Scenario: User inspects task state in the runtime environment
- **WHEN** a user enters a TrafficWork runtime environment
- **THEN** the frontend MUST show current task state from `GET /api/tasks?trafficWorkId=<trafficWorkId>`
- **AND** MUST NOT show mock-only execution logs as real runtime data

#### Scenario: User opens a full-page task intervention view
- **WHEN** a user selects a task node or intervention entry point from the runtime environment
- **THEN** the frontend MUST navigate to a dedicated task intervention page that loads task detail and output records from the Tasks API
