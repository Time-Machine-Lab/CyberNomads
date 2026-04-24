## MODIFIED Requirements

### Requirement: Account runtime SHALL create wrapper accounts before login
The backend account runtime SHALL allow users to create and manage a wrapper account before any platform credential has been verified.

#### Scenario: Create wrapper account without resolved platform identity
- **WHEN** a valid wrapper-account creation request is submitted with platform, internal display name, tags, and remark
- **THEN** the runtime SHALL create a stable account object without requiring resolved platform identity
- **AND** the created account SHALL start in a `not_logged_in` connection state

### Requirement: Account runtime SHALL manage current credentials and access sessions separately
The backend account runtime SHALL keep the current active credential on the account object while managing in-flight login work through independent access sessions.

#### Scenario: Failed verification preserves the current active credential
- **WHEN** an access session fails verification
- **THEN** the runtime SHALL persist the failed session result and failure reason
- **AND** the runtime SHALL preserve the previously active credential on the account, if one exists

#### Scenario: Successful verification updates resolved profile and connection state
- **WHEN** an access session verifies successfully
- **THEN** the runtime SHALL write the validated credential as the account's current active credential
- **AND** it SHALL refresh the account's resolved platform profile fields and connection state

### Requirement: Account runtime SHALL treat availability as secondary diagnostic context
The backend account runtime SHALL preserve availability information as diagnostic state but SHALL NOT require a separate availability workflow to complete the primary token-access flow.

#### Scenario: Basic access flow completes without availability check
- **WHEN** a user starts an access session, resolves candidate credential material, and verifies it successfully
- **THEN** the runtime SHALL mark the account as connected and apply the credential
- **AND** it SHALL NOT require a follow-up availability-check action to consider the access flow complete

#### Scenario: Availability may still be refreshed later
- **WHEN** the runtime later executes optional diagnostic availability logic
- **THEN** that logic SHALL update only the account's diagnostic availability fields
- **AND** it SHALL NOT retroactively redefine the semantics of the access-session flow
