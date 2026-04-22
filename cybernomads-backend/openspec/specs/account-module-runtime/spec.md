# account-module-runtime Specification

## Purpose
Define the backend runtime behavior for the account module, including account management, authorization attempts, active credential switching, state evaluation, and controlled credential resolution.
## Requirements
### Requirement: Account runtime SHALL support stable account creation and profile management
The backend account runtime SHALL allow users to create a stable platform account object and update its management profile without changing its identity semantics.

#### Scenario: Create account successfully
- **WHEN** a valid account creation request is submitted
- **THEN** the system creates a stable platform account object identified by a system account identifier
- **AND** the created account SHALL remain queryable even if authorization has not yet completed

#### Scenario: Update account profile successfully
- **WHEN** a valid profile update request is submitted for an existing account
- **THEN** the system updates allowed management attributes such as remark, tags, or platform metadata
- **AND** subsequent detail reads SHALL reflect the updated management information without changing the account identity

### Requirement: Account runtime SHALL provide summary and sanitized detail reads
The backend account runtime SHALL provide an account list view for management and a sanitized account detail view for single-account inspection.

#### Scenario: List accounts returns summaries
- **WHEN** the account list behavior is invoked
- **THEN** the system returns account summary items suitable for management and selection
- **AND** the response SHALL avoid exposing raw active credential payloads

#### Scenario: Get account detail returns sanitized management view
- **WHEN** the account detail behavior is invoked for an existing account
- **THEN** the system returns the account's sanitized management information
- **AND** the returned detail SHALL include authorization attempt summary rather than raw authorization payload content

### Requirement: Account runtime SHALL manage authorization attempts separately from active credentials
The backend account runtime SHALL allow a pending authorization attempt to exist without replacing the currently active credential until verification succeeds.

#### Scenario: Start authorization attempt without switching current credential
- **WHEN** a valid authorization attempt is started for an account
- **THEN** the system records a pending authorization attempt for that account
- **AND** the system SHALL keep the current active credential unchanged during the pending period

#### Scenario: Successful verification switches active credential
- **WHEN** a pending authorization attempt is successfully verified
- **THEN** the system replaces the current active credential with the newly verified credential
- **AND** the system clears or closes the pending authorization attempt state

#### Scenario: Failed verification preserves current credential
- **WHEN** a pending authorization attempt fails verification
- **THEN** the system records the failed attempt result
- **AND** the system SHALL preserve the previously active credential unchanged

### Requirement: Account runtime SHALL enforce controlled active credential resolution
The backend account runtime SHALL expose active credential resolution only through a controlled runtime path rather than through ordinary detail reads.

#### Scenario: Resolve active credential for a consumable account
- **WHEN** an upper-layer trusted caller requests active credential resolution for an account that satisfies the minimum consumability rules
- **THEN** the runtime returns a controlled active credential result for internal consumption
- **AND** the caller SHALL NOT need to read raw credential payloads through ordinary account detail behavior

#### Scenario: Reject active credential resolution for a non-consumable account
- **WHEN** an upper-layer trusted caller requests active credential resolution for an account that does not satisfy the minimum consumability rules
- **THEN** the runtime rejects or denies the resolution request
- **AND** the runtime SHALL NOT pretend the account remains safely consumable

### Requirement: Account runtime SHALL evaluate consumability from three independent state dimensions
The backend account runtime SHALL maintain lifecycle, authorization, and availability state separately and SHALL use them together to determine whether an account is consumable.

#### Scenario: Deleted or disabled account remains readable but not consumable
- **WHEN** an account is in `deleted` or `disabled` lifecycle state
- **THEN** the account remains queryable for management purposes
- **AND** the runtime SHALL exclude it from the default consumable account set

#### Scenario: Unauthorized or unhealthy account is not consumable
- **WHEN** an account is not `authorized` or not `healthy`
- **THEN** the runtime SHALL keep the account visible for management
- **AND** the runtime SHALL NOT treat it as an executable account resource

### Requirement: Account runtime SHALL support logical deletion and restoration
The backend account runtime SHALL provide logical deletion and restoration behavior while preserving stable platform identity semantics.

#### Scenario: Soft delete account
- **WHEN** a valid soft delete request is submitted for an existing account
- **THEN** the runtime marks that account as logically deleted
- **AND** the account SHALL stop participating in the default active management and consumption set

#### Scenario: Restore previously deleted account
- **WHEN** the system restores a logically deleted account or reintroduces the same platform identity
- **THEN** the runtime restores the original account object
- **AND** the runtime SHALL NOT create a duplicate account object for the same `platform + platformAccountUid`

### Requirement: Account runtime SHALL support token-first onboarding before stable account creation
The backend account runtime SHALL support token onboarding through a dedicated onboarding session before a stable account object exists.

#### Scenario: Start onboarding session without platform account UID
- **WHEN** a user starts new-account token onboarding before knowing the `platformAccountUid`
- **THEN** the runtime SHALL create an onboarding session that records platform, onboarding method, and pending-resolution state
- **AND** the runtime SHALL NOT create an account object that lacks a stable platform identity

#### Scenario: Verified onboarding session records resolved identity
- **WHEN** the platform capability successfully resolves an onboarding session and returns platform identity, readable profile data, and candidate token material
- **THEN** the runtime SHALL persist the resolved result on the onboarding session
- **AND** the result SHALL remain pending final confirmation rather than immediately creating the account

### Requirement: Account runtime SHALL finalize verified onboarding sessions into stable account semantics
The backend account runtime SHALL finalize a verified onboarding session by deciding whether to create a new account, restore a soft-deleted account, or return an existing account reference while preventing duplicate identities.

#### Scenario: Finalize verified session creates or restores the stable account
- **WHEN** a verified onboarding session is finalized and the resolved platform identity maps to no active account or only to a logically deleted account
- **THEN** the runtime SHALL create a new account or restore the original account and switch the candidate token into the active token slot
- **AND** the runtime SHALL update authorization semantics so they align with the newly active token

#### Scenario: Finalize verified session returns existing account reference
- **WHEN** a verified onboarding session is finalized and the resolved platform identity already maps to an active account object
- **THEN** the runtime SHALL return that existing account reference instead of creating a duplicate account
- **AND** the runtime SHALL NOT use the new-account flow to implicitly replace that account's current active token

### Requirement: Account runtime SHALL align with published account contracts
The backend account runtime SHALL implement its behavior in alignment with the published account API and SQL contracts before exposing account functionality.

#### Scenario: Runtime behavior follows account contracts
- **WHEN** the account module implementation is prepared
- **THEN** the implementation SHALL use the published account API and SQL contracts as the source of truth
- **AND** the implementation SHALL update those top-level contracts first if runtime behavior requires contract changes

### Requirement: Account runtime SHALL delegate platform-specific authorization and availability work through account platform capability abstraction
The backend account runtime SHALL complete onboarding session start, onboarding token resolution, authorization start, authorization verification, and availability evaluation by invoking the provider-neutral account platform capability abstraction rather than embedding platform-specific script behavior in the account module itself.

#### Scenario: Onboarding resolution uses platform capability result
- **WHEN** the account runtime processes challenge retrieval or token resolution for a new-account onboarding session
- **THEN** it SHALL invoke the matching account platform capability implementation
- **AND** the runtime SHALL update onboarding-session state from the normalized platform result rather than from script-specific payload details

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
