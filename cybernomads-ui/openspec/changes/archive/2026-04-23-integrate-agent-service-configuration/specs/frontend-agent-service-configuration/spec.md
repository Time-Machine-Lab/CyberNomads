## ADDED Requirements

### Requirement: Frontend SHALL guide current Agent service configuration as a staged business flow
The frontend SHALL present OpenClaw setup as a staged current Agent service flow using the documented Agent Services API state model: configuration, connection verification, and capability provisioning. The flow MUST NOT treat saving form values as equivalent to a usable or capability-ready Agent service.

#### Scenario: User opens OpenClaw setup without a configured service
- **WHEN** a user opens `/console/openclaw` and `GET /api/agent-services/current/status` returns `hasCurrentService = false`
- **THEN** the page MUST show an unconfigured state with an empty endpoint, authentication kind, and secret input
- **AND** the page MUST make save configuration the first required action

#### Scenario: User saves a new OpenClaw service
- **WHEN** a user submits a valid new OpenClaw configuration
- **THEN** the frontend MUST call `POST /api/agent-services/current` with `providerCode = "openclaw"`, `endpointUrl`, and `authentication.kind` plus `authentication.secret`
- **AND** the page MUST render the returned current service as waiting for explicit connection verification when the backend returns `pending_verification`

#### Scenario: User updates the current OpenClaw service
- **WHEN** a current Agent service exists and the user submits updated OpenClaw connection inputs
- **THEN** the frontend MUST call `PUT /api/agent-services/current` with the documented update request body
- **AND** the page MUST render the returned current service as requiring renewed verification and capability preparation according to the response statuses

#### Scenario: User verifies connection after saving
- **WHEN** a configured service is present and the user activates connection verification
- **THEN** the frontend MUST call `POST /api/agent-services/current/connection-verification`
- **AND** the page MUST display `connectionStatus`, `isUsable`, `verifiedAt`, and any returned reason from the verification result

#### Scenario: User prepares capabilities after connection succeeds
- **WHEN** the current service has `isUsable = true` and the user activates capability preparation
- **THEN** the frontend MUST call `POST /api/agent-services/current/capability-provisioning`
- **AND** the page MUST display `capabilityStatus`, `connectionStatus`, `isUsable`, `preparedAt`, and any returned reason from the provisioning result

### Requirement: Frontend SHALL protect Agent service credentials in the UI
The frontend SHALL treat Agent service credentials as write-only inputs. It MUST NOT populate, log, reuse, or submit placeholder secrets as if they were real stored credentials.

#### Scenario: Existing service has stored credential
- **WHEN** the backend returns a current service with `hasCredential = true`
- **THEN** the frontend MUST indicate that credentials are already stored
- **AND** the secret input MUST remain a replacement input rather than being populated from the response

#### Scenario: User creates a new service without secret
- **WHEN** no current service exists and the user tries to save without `authentication.secret`
- **THEN** the frontend MUST block submission locally and explain that a secret is required for the documented create request

#### Scenario: User updates credentials
- **WHEN** the user chooses to replace credentials for the current service
- **THEN** the frontend MUST submit only the newly entered secret in `authentication.secret`
- **AND** it MUST NOT submit masked placeholder text such as `********`

### Requirement: Frontend SHALL surface recoverable Agent service errors
The frontend SHALL keep Agent service setup failures recoverable in the Console or OpenClaw page and MUST NOT silently fall back to mock data.

#### Scenario: Create conflicts with an existing current service
- **WHEN** `POST /api/agent-services/current` returns 409
- **THEN** the frontend MUST refresh current service status and guide the user into update mode

#### Scenario: Backend rejects connection input
- **WHEN** `POST /api/agent-services/current` or `PUT /api/agent-services/current` returns 400
- **THEN** the frontend MUST show a field-level or form-level error without marking the service as configured

#### Scenario: Connection verification fails
- **WHEN** connection verification returns `connectionStatus = connection_failed` or `isUsable = false`
- **THEN** the frontend MUST keep the user on the OpenClaw setup page with a retry action and the returned reason when available

#### Scenario: Capability provisioning fails
- **WHEN** capability provisioning returns `capabilityStatus = prepare_failed`
- **THEN** the frontend MUST keep the service connection visible as usable when `isUsable = true`
- **AND** it MUST show capability preparation as failed with a retry action
