## ADDED Requirements

### Requirement: Account runtime SHALL delegate platform-specific authorization and availability work through account platform capability abstraction
The backend account runtime SHALL complete authorization start, authorization verification, and availability evaluation by invoking the provider-neutral account platform capability abstraction rather than embedding platform-specific script behavior in the account module itself.

#### Scenario: Authorization verification uses platform capability result
- **WHEN** the account runtime verifies a pending authorization attempt
- **THEN** it SHALL invoke the matching account platform capability implementation for the account's platform
- **AND** the runtime SHALL derive credential switching and status updates from the normalized verification result rather than from platform-specific script payload rules

#### Scenario: Availability check uses platform capability result
- **WHEN** the account runtime performs an account availability check
- **THEN** it SHALL invoke the matching account platform capability implementation
- **AND** the runtime SHALL persist the resulting availability outcome and reason summary to the account state

### Requirement: Account runtime SHALL preserve stable account identity during verification-based profile refresh
The backend account runtime SHALL allow successful authorization verification to refresh readable management information from platform results while preserving the stable platform identity of the account object.

#### Scenario: Verification success refreshes display information without changing identity
- **WHEN** an authorization attempt is verified successfully and the platform result includes readable account profile information
- **THEN** the runtime SHALL be allowed to update fields such as `displayName` and `platformMetadata`
- **AND** the runtime SHALL keep the existing `platform + platformAccountUid` business identity unchanged

#### Scenario: Verification fails on platform identity mismatch
- **WHEN** an authorization verification result resolves to a different stable platform identity than the current account object
- **THEN** the runtime SHALL reject that verification as an identity mismatch
- **AND** the runtime SHALL NOT replace the current active credential or mutate the account's stable identity

### Requirement: Account runtime SHALL preserve current authorization semantics while a replacement authorization attempt is pending
The backend account runtime SHALL allow an already authorized account to start a new authorization attempt without automatically degrading the current authorization semantics before verification succeeds.

#### Scenario: Authorized account starts replacement authorization attempt
- **WHEN** an account with a current active credential starts a new authorization attempt
- **THEN** the runtime SHALL record the new pending authorization attempt separately
- **AND** the runtime SHALL keep the current authorization semantics aligned with the still-active credential until the new attempt is verified

#### Scenario: Unauthorized account starts first authorization attempt
- **WHEN** an account without a current active credential starts its first authorization attempt
- **THEN** the runtime SHALL be allowed to transition the account into an `authorizing` authorization state
- **AND** the runtime SHALL still preserve the separation between pending attempt state and current active credential state
