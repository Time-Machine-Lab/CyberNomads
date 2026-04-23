## ADDED Requirements

### Requirement: Account connection attempts SHALL be bound to an existing wrapper account
The system SHALL only create a connection attempt for an already existing account wrapper and SHALL treat that attempt as a short-lived process resource rather than as a second account object.

#### Scenario: Start manual-token connection attempt for an existing account
- **WHEN** a user opens an existing account detail page and submits a manual token
- **THEN** the system SHALL create a connection attempt linked to that account identifier
- **AND** the attempt SHALL record the connection method, the token input reference, and a status that indicates it is ready for validation

#### Scenario: Start QR connection attempt for an existing account
- **WHEN** a user opens an existing account detail page and requests QR login
- **THEN** the system SHALL create a connection attempt linked to that account identifier and return a provider-neutral challenge summary
- **AND** the attempt SHALL remain in a pending-resolution state until token material is resolved from the QR flow

### Requirement: Account connection attempts SHALL resolve token material before validation
The system SHALL allow a connection attempt to resolve or receive candidate token material before validation, regardless of whether that material came from direct input or from a QR flow.

#### Scenario: Manual token attempt becomes immediately validatable
- **WHEN** a manual token is submitted during connection-attempt creation
- **THEN** the system SHALL persist a candidate token reference for that attempt
- **AND** the attempt SHALL become directly available for validation without requiring a separate QR-resolution step

#### Scenario: QR attempt resolves candidate token after scan completion
- **WHEN** a QR-based connection attempt is resolved after the user scans and confirms the challenge
- **THEN** the system SHALL persist the resolved candidate token reference and platform session result on that attempt
- **AND** the attempt SHALL transition into a state that allows validation

### Requirement: Account connection attempts SHALL validate by calling platform profile retrieval and apply the token only on success
The system SHALL validate a connection attempt by invoking the platform capability that fetches user profile information from the candidate token, and SHALL only replace the current active token when that validation succeeds.

#### Scenario: Validation success applies token and updates resolved platform profile
- **WHEN** a connection attempt validates successfully and the platform returns profile information
- **THEN** the system SHALL write the candidate token as the account's current active token
- **AND** the system SHALL update the account's resolved platform profile fields from the normalized platform result

#### Scenario: Validation failure preserves the previously active token
- **WHEN** a connection attempt fails validation because the platform cannot retrieve valid user information from the candidate token
- **THEN** the system SHALL record the failed validation result and failure reason on that attempt
- **AND** the system SHALL keep the previously active token unchanged on the account

### Requirement: Account connection attempts SHALL expose current and recent logs through the attempt resource
The system SHALL persist logs as process artifacts of a connection attempt and SHALL make the current or most recent log output readable from the account detail workspace without merging log content into the account object itself.

#### Scenario: Detail page reads current attempt logs
- **WHEN** the frontend loads an account detail page with an active or recent connection attempt
- **THEN** the system SHALL provide a way to read that attempt's log output through the connection-attempt resource
- **AND** the account detail response SHALL only include attempt summary information rather than the full log stream payload

#### Scenario: Logs remain attached to the attempt after validation finishes
- **WHEN** a connection attempt completes with success or failure
- **THEN** the system SHALL retain the attempt log reference for later inspection
- **AND** the account object SHALL continue to expose only the latest attempt summary and account state
