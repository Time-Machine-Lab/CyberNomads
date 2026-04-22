# account-platform-capability-runtime Specification

## Purpose
TBD - created by archiving change implement-account-module-runtime. Update Purpose after archive.
## Requirements
### Requirement: Account platform capability runtime SHALL expose provider-neutral platform access for the account module
The backend account platform capability runtime SHALL expose a unified platform abstraction so the account module can request authorization and availability behaviors without depending on platform-specific JS script names or call conventions.

#### Scenario: Account module selects platform capability by platform code
- **WHEN** the account runtime needs to perform authorization or availability work for a specific platform
- **THEN** it SHALL resolve a platform capability implementation through a provider-neutral account platform abstraction
- **AND** the account module SHALL NOT call concrete platform script functions directly

### Requirement: Account platform capability runtime SHALL support onboarding without an existing account snapshot
The backend account platform capability runtime SHALL support token onboarding before a stable account exists so the account module can obtain challenge data and resolve platform identity without an existing account snapshot.

#### Scenario: Onboarding start returns a provider-neutral challenge
- **WHEN** the account module starts an interactive new-account onboarding action such as QR login
- **THEN** the platform capability SHALL return a provider-neutral challenge result
- **AND** the result SHALL be sufficient for the account module and frontend to render the challenge without leaking script-specific return shapes

#### Scenario: Onboarding resolution returns normalized identity and candidate token
- **WHEN** the platform capability resolves onboarding input without an existing account snapshot
- **THEN** it SHALL return normalized platform identity, readable profile information, and candidate token material
- **AND** the account module SHALL NOT need to know whether the underlying script used token, cookie, or any other provider-specific payload shape

### Requirement: Account platform capability runtime SHALL support authorization start and verification semantics
The backend account platform capability runtime SHALL provide a unified way to start an authorization-related platform action and to verify an authorization attempt result for different authorization methods while keeping existing-account token replacement aligned with the same normalized credential semantics used by onboarding.

#### Scenario: Interactive authorization start returns a provider-neutral challenge result
- **WHEN** the account runtime starts an interactive authorization attempt such as `qr_authorization`
- **THEN** the platform capability SHALL return a provider-neutral start result that can describe any required challenge or next-step material
- **AND** the returned result SHALL avoid leaking platform script implementation details into the account service layer

#### Scenario: Existing-account token verification returns normalized account material
- **WHEN** the account runtime verifies an authorization attempt created for replacing an existing account's token
- **THEN** the platform capability SHALL return a normalized verification result containing verification outcome, resolved account identity information, and candidate credential material
- **AND** the account runtime SHALL NOT need direct knowledge of script-specific payload structures

### Requirement: Account platform capability runtime SHALL support provider-neutral account availability evaluation
The backend account platform capability runtime SHALL allow the account module to evaluate account availability through a unified platform result model.

#### Scenario: Availability check returns normalized platform status
- **WHEN** the account runtime triggers an availability check for an account's current active credential
- **THEN** the platform capability SHALL return a normalized availability result with status outcome and reason summary
- **AND** the returned result SHALL be sufficient for the account module to update `availabilityStatus` without embedding platform-specific rule logic in the module itself

### Requirement: Account platform capability runtime SHALL allow stub adapters before real script integration
The backend account platform capability runtime SHALL allow the first account module implementation to bind a stub platform adapter while preserving the same abstraction used by future real JS script adapters.

#### Scenario: Runtime uses stub adapter in first implementation
- **WHEN** the account module is first implemented without a real platform script
- **THEN** the runtime SHALL be able to use a stub platform capability adapter through the same provider-neutral abstraction
- **AND** later real platform script adapters SHALL be attachable without rewriting the account module service boundary
