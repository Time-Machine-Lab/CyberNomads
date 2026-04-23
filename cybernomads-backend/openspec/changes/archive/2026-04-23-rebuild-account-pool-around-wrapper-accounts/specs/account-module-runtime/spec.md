## ADDED Requirements

### Requirement: Account runtime SHALL create wrapper accounts before login
The backend account runtime SHALL allow users to create and manage a wrapper account before any platform token has been validated.

#### Scenario: Create wrapper account without resolved platform identity
- **WHEN** a valid wrapper-account creation request is submitted with platform, internal display name, tags, and remark
- **THEN** the system SHALL create a stable account object without requiring resolved platform identity fields
- **AND** the created account SHALL start in a `not_logged_in` login state

#### Scenario: Update internal profile without overwriting resolved platform profile
- **WHEN** a valid account profile update request changes internal fields such as internal display name, remark, tags, or operator-managed platform metadata
- **THEN** the runtime SHALL persist those changes on the wrapper account
- **AND** the runtime SHALL leave resolved platform profile fields unchanged unless a connection validation succeeds

### Requirement: Account runtime SHALL manage account-bound connection attempts separately from active tokens
The backend account runtime SHALL model token connection as an independent attempt resource linked to an existing account and SHALL keep the currently active token unchanged until validation succeeds.

#### Scenario: Start connection attempt on an existing account
- **WHEN** a user submits a manual token or requests a QR login on an existing account
- **THEN** the runtime SHALL create a connection-attempt record linked to that account
- **AND** the runtime SHALL NOT mutate the current active token at attempt-creation time

#### Scenario: Failed connection attempt preserves active token
- **WHEN** a connection attempt ends in validation failure
- **THEN** the runtime SHALL store the failed result and failure reason on that attempt
- **AND** the runtime SHALL preserve the previously active token, if one existed

### Requirement: Account runtime SHALL apply validated tokens to the wrapper account and refresh resolved profile data
The backend account runtime SHALL use successful validation results to switch the current token and update the wrapper account's resolved platform profile snapshot.

#### Scenario: Validation success switches token and refreshes resolved platform data
- **WHEN** a connection attempt validates successfully and returns normalized platform profile data
- **THEN** the runtime SHALL write the validated token as the account's current active token
- **AND** the runtime SHALL refresh resolved platform fields such as platform UID, platform display name, avatar URL, and resolved profile metadata

#### Scenario: Internal profile remains authoritative after validation
- **WHEN** a validation succeeds and the platform returns a display name or other readable profile fields
- **THEN** the runtime SHALL update only the resolved platform profile section of the account
- **AND** the runtime SHALL NOT overwrite the operator-managed internal display name, tags, or remark

### Requirement: Account runtime SHALL evaluate consumability from lifecycle, login, availability, and active-token presence
The backend account runtime SHALL determine whether an account is consumable from lifecycle status, login status, availability status, and whether an active token currently exists.

#### Scenario: Not-logged-in account is readable but not consumable
- **WHEN** an account is active but its login status is `not_logged_in`
- **THEN** the runtime SHALL keep the account readable and editable
- **AND** the runtime SHALL exclude it from the default consumable account set

#### Scenario: Connected account still requires a healthy availability result
- **WHEN** an account has a connected login state and an active token
- **THEN** the runtime SHALL still require a healthy availability result before treating it as consumable
- **AND** the runtime SHALL NOT mark every connected account as automatically consumable

## REMOVED Requirements

### Requirement: Account runtime SHALL support stable account creation and profile management
**Reason**: The old requirement assumed a stable platform identity at creation time and did not distinguish internal profile fields from resolved platform profile fields.
**Migration**: Replace it with wrapper-account creation semantics that allow creation before login and explicitly separate internal and resolved profile sections.

### Requirement: Account runtime SHALL manage authorization attempts separately from active credentials
**Reason**: Authorization attempts are being replaced by account-bound connection attempts as the single login flow primitive.
**Migration**: Move token-input, QR, validation, and logs into the new connection-attempt runtime model.

### Requirement: Account runtime SHALL evaluate consumability from three independent state dimensions
**Reason**: The new model replaces authorization status with login status and introduces a first-class `not_logged_in` state.
**Migration**: Re-express consumability from lifecycle, login, availability, and active-token presence.

### Requirement: Account runtime SHALL support token-first onboarding before stable account creation
**Reason**: The new product flow creates the account first and performs token connection afterward.
**Migration**: Remove pre-account onboarding sessions and start connection attempts from existing account detail pages.

### Requirement: Account runtime SHALL finalize verified onboarding sessions into stable account semantics
**Reason**: There is no longer a separate onboarding-session finalize phase in the new model.
**Migration**: Apply validated tokens directly to the existing wrapper account after connection-attempt validation succeeds.

### Requirement: Account runtime SHALL preserve stable account identity during verification-based profile refresh
**Reason**: Resolved platform identity is no longer the account's stable business key.
**Migration**: Treat platform UID as resolved profile data and keep `accountId` as the only stable wrapper-account identity.

### Requirement: Account runtime SHALL preserve current authorization semantics while a replacement authorization attempt is pending
**Reason**: The new model uses login-state semantics and connection attempts instead of authorization-state semantics and authorization attempts.
**Migration**: Preserve the current active token while a connection attempt is pending, but rewrite status behavior around the new login-state model.
