## MODIFIED Requirements

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
