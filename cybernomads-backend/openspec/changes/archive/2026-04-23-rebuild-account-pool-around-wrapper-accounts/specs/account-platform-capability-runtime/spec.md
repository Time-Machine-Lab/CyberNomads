## ADDED Requirements

### Requirement: Account platform capability runtime SHALL drive account-bound connection attempts
The backend account platform capability runtime SHALL expose provider-neutral operations that start, resolve, and validate a connection attempt for an existing wrapper account.

#### Scenario: Start connection attempt returns challenge or token-processing context
- **WHEN** the account runtime starts a connection attempt for manual token input or QR login
- **THEN** the platform capability SHALL return a provider-neutral result containing any challenge summary or processing context needed for the next step
- **AND** the runtime SHALL NOT need to know platform-specific script names or payload shapes

#### Scenario: Resolve connection attempt returns candidate token material
- **WHEN** the account runtime resolves a QR-based connection attempt after user interaction completes
- **THEN** the platform capability SHALL return provider-neutral candidate token material and any updated session context
- **AND** the runtime SHALL remain independent from script-specific QR ticket or polling details

### Requirement: Account platform capability runtime SHALL validate candidate tokens by fetching normalized platform profile data
The backend account platform capability runtime SHALL validate candidate token material by invoking platform logic that retrieves normalized platform profile data and structured logs.

#### Scenario: Validation returns normalized resolved profile
- **WHEN** the account runtime validates a connection attempt
- **THEN** the platform capability SHALL return validation outcome, resolved platform UID, resolved display name, avatar URL, and resolved profile metadata
- **AND** the result SHALL be sufficient for the account runtime to refresh the account's resolved profile without platform-specific branching

#### Scenario: Validation returns structured logs
- **WHEN** the account runtime validates a connection attempt
- **THEN** the platform capability SHALL return structured or normalized log output describing the validation process
- **AND** the runtime SHALL be able to persist that log output on the connection attempt without understanding script-internal logging formats

## REMOVED Requirements

### Requirement: Account platform capability runtime SHALL support onboarding without an existing account snapshot
**Reason**: The new model always creates the wrapper account before any token connection flow starts.
**Migration**: Replace onboarding-without-account behavior with account-bound connection-attempt operations.

### Requirement: Account platform capability runtime SHALL support authorization start and verification semantics
**Reason**: The old split between authorization start and authorization verification is being replaced by connection-attempt start, resolution, and validation semantics.
**Migration**: Rewrite platform adapters around provider-neutral connection-attempt APIs that return candidate token material, normalized profile data, and logs.
