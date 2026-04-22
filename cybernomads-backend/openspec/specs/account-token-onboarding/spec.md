# account-token-onboarding Specification

## Purpose
Define the dedicated onboarding-session behavior used to resolve platform identity and candidate token material before a stable account object is created or restored.

## Requirements

### Requirement: Account token onboarding SHALL manage a pre-account onboarding session
The system SHALL maintain a dedicated onboarding session before stable account creation to carry platform selection, onboarding method, challenge summary, pending input references, and current session state.

#### Scenario: Start onboarding session for manual token input
- **WHEN** the user selects a platform and starts new-account onboarding with manual token input
- **THEN** the system SHALL create a new onboarding session that records platform, onboarding method, and pending input references
- **AND** the returned session summary SHALL remain sanitized and SHALL NOT echo the raw token content

#### Scenario: Start onboarding session for QR access
- **WHEN** the user selects a platform and starts new-account onboarding with QR access
- **THEN** the system SHALL create a new onboarding session and return a provider-neutral challenge summary for frontend rendering
- **AND** the session SHALL remain pending until token resolution succeeds

### Requirement: Account token onboarding SHALL resolve platform identity and candidate token before account creation
The system SHALL allow platform capabilities to resolve platform identity, readable profile information, and candidate token material before a stable account object exists and SHALL record that result on the onboarding session.

#### Scenario: Resolve onboarding session successfully
- **WHEN** a platform capability successfully resolves an onboarding session and validates the submitted input
- **THEN** the system SHALL record the resolved `platform + platformAccountUid`, readable profile summary, and candidate token reference on the session
- **AND** the system SHALL NOT automatically create an account or treat the candidate token as the current active credential yet

#### Scenario: Resolve onboarding session fails
- **WHEN** the platform capability cannot resolve a valid token or a valid platform identity from the onboarding session
- **THEN** the system SHALL record a failed session state and failure reason
- **AND** the system SHALL NOT create, restore, or mutate any stable account object

### Requirement: Account token onboarding SHALL finalize only from a verified onboarding session
The system SHALL only allow final account creation, restoration, or existing-account redirection from an onboarding session that has already been verified successfully.

#### Scenario: Finalize creates or restores account
- **WHEN** the user finalizes a verified onboarding session and the resolved platform identity maps to no active account or only to a logically deleted account
- **THEN** the system SHALL create a new account or restore the original account and write the candidate token as that account's active token
- **AND** the onboarding session SHALL be marked as consumed

#### Scenario: Finalize does not create duplicate account
- **WHEN** the user finalizes a verified onboarding session and the resolved platform identity already maps to an existing active account
- **THEN** the system SHALL return the existing account identifier instead of creating a duplicate account
- **AND** the system SHALL NOT use the new-account flow to implicitly replace the existing account's active token
