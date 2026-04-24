## ADDED Requirements

### Requirement: Account access sessions SHALL be account-bound short-lived access resources
The system SHALL model login and token-connection work as a short-lived access-session resource attached to an existing wrapper account rather than as part of the account object itself.

#### Scenario: Start a manual-token access session for an existing account
- **WHEN** a user submits a token for an existing account wrapper
- **THEN** the system SHALL create an access session linked to that account
- **AND** the session SHALL move directly into a state that can be verified

#### Scenario: Start a QR access session for an existing account
- **WHEN** a user requests QR login for an existing account wrapper
- **THEN** the system SHALL create an access session linked to that account and return a QR challenge summary
- **AND** the session SHALL remain pending until a later poll resolves candidate credential material

### Requirement: Account access sessions SHALL allow at most one non-terminal session per account
The system SHALL keep the account detail workspace centered on a single current session and SHALL cancel older unfinished sessions when a newer one is started.

#### Scenario: Starting a new session cancels an older unfinished session
- **WHEN** an account already has a non-terminal access session and the user starts a new session
- **THEN** the older session SHALL be marked as canceled
- **AND** the newly created session SHALL become the current working session for that account

### Requirement: Account access sessions SHALL support QR polling and token verification as separate actions
The system SHALL treat QR progress polling and token verification as separate user actions so the frontend can present a natural “scan -> poll -> verify” flow.

#### Scenario: Poll QR session before verification
- **WHEN** a user polls a QR-based access session after scanning or confirming on the platform app
- **THEN** the system SHALL update the session with the latest QR progress or resolved candidate credential material
- **AND** the session SHALL only become ready for verification after a candidate credential exists

#### Scenario: Verify a session applies the token only on success
- **WHEN** a user verifies an access session and the provider successfully resolves platform profile data from the candidate credential
- **THEN** the system SHALL write that credential as the account's current active credential
- **AND** the session SHALL record that the credential was applied

### Requirement: Account access sessions SHALL own structured access logs
The system SHALL persist logs as access-session artifacts and SHALL expose them through a session-scoped log endpoint instead of embedding them in the account object.

#### Scenario: Account detail reads logs from a session-scoped endpoint
- **WHEN** the frontend needs to render logs for the current session
- **THEN** it SHALL request logs through a session-scoped endpoint
- **AND** the account detail response SHALL contain at most a light summary of the current session
