# account-contracts Specification

## Purpose
Define the top-level API and SQL contracts for the account module so later runtime implementation has a stable source of truth aligned with the account domain design.

## Requirements

### Requirement: Account contracts SHALL define a stable platform account identity model
The system SHALL define top-level contracts around a stable platform account object identified by a system account identifier and a platform-scoped account identity rather than by display name.

#### Scenario: Account creation contract uses stable identity
- **WHEN** account creation contracts are defined
- **THEN** the contracts SHALL require a stable account identifier independent from display name
- **AND** the contracts SHALL treat `platform + platformAccountUid` as the business identity for the platform account

#### Scenario: Display name is not a uniqueness key
- **WHEN** account profile contracts are defined
- **THEN** the contracts SHALL treat display name as a readable management attribute
- **AND** the contracts SHALL NOT require display name uniqueness as a validation rule

### Requirement: Account contracts SHALL separate summary, detail, and credential consumption semantics
The system SHALL define account list behavior as a summary view and account detail behavior as a sanitized management view, while excluding raw credential payloads from ordinary detail reads.

#### Scenario: Account list returns summary information
- **WHEN** account list contracts are defined
- **THEN** the contracts SHALL require summary information sufficient for management and selection
- **AND** the list response SHALL NOT require raw credential payloads or full authorization attempt payloads

#### Scenario: Account detail remains sanitized
- **WHEN** account detail contracts are defined
- **THEN** the contracts SHALL return a sanitized management view of the account
- **AND** the detail response SHALL NOT expose raw active credential payload data

### Requirement: Account contracts SHALL separate active credentials from authorization attempts
The system SHALL define top-level contracts that distinguish the current active credential from any pending authorization attempt.

#### Scenario: Active credential stays stable during verification
- **WHEN** a new authorization attempt is created for an account
- **THEN** the contracts SHALL model that attempt separately from the current active credential
- **AND** the contracts SHALL preserve the semantics that the old active credential remains current until verification succeeds

#### Scenario: QR authorization is modeled as an authorization method
- **WHEN** authorization contracts are defined
- **THEN** the contracts SHALL model QR authorization as an authorization attempt method rather than as the current active credential type
- **AND** the contracts SHALL avoid requiring pending QR data to be stored as the active credential

### Requirement: Account contracts SHALL define status dimensions and minimum consumability semantics
The system SHALL define independent lifecycle, authorization, and availability status dimensions together with the minimum semantics required for account consumability.

#### Scenario: Status dimensions remain independent in contracts
- **WHEN** account contracts are defined
- **THEN** the contracts SHALL represent lifecycle, authorization, and availability state as separate business semantics
- **AND** the contracts SHALL NOT collapse them into a single top-level status field

#### Scenario: Consumability depends on explicit state conditions
- **WHEN** contracts define account consumption semantics
- **THEN** the contracts SHALL state that only accounts meeting the minimum consumability conditions can be treated as executable resources
- **AND** the contracts SHALL avoid treating every readable account as automatically consumable

### Requirement: Account contracts SHALL define soft deletion and restoration semantics
The system SHALL define account lifecycle behavior using logical deletion and restoration rather than physical deletion in MVP.

#### Scenario: No physical delete contract is published
- **WHEN** the MVP account contracts are created
- **THEN** the published API contracts SHALL include logical deletion and restoration behavior
- **AND** the published contracts SHALL NOT require physical account deletion behavior

#### Scenario: Restored account preserves original identity
- **WHEN** contracts define restoration behavior for a logically deleted account
- **THEN** the contracts SHALL restore the original account object identified by the same platform identity
- **AND** the contracts SHALL NOT require creating a duplicate account object for the same platform identity

### Requirement: Account SQL contracts SHALL preserve minimal structured state and reference semantics
The system SHALL define SQL contracts that store account metadata, status, and reference semantics while avoiding direct persistence of raw sensitive payloads as top-level contract requirements.

#### Scenario: SQL contract stores structured account state
- **WHEN** the SQL contract is created
- **THEN** it SHALL define the minimum fields needed for account identity, profile, state, and reference metadata
- **AND** it SHALL support summary and detail query requirements without embedding broader downstream workflow semantics

#### Scenario: SQL contract uses references for sensitive payloads
- **WHEN** the SQL contract is created
- **THEN** it SHALL represent active credential payloads and authorization attempt payloads through stable reference semantics
- **AND** it SHALL NOT require raw secret payloads to be modeled as ordinary structured account fields
