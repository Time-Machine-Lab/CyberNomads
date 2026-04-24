## MODIFIED Requirements

### Requirement: Bilibili web API skill SHALL expose machine-consumable outputs for backend provider integration
The skill SHALL provide deterministic JSON outputs and exit behavior suitable for invocation from a backend platform access provider.

#### Scenario: QR login commands return stable machine-readable fields
- **WHEN** a backend provider invokes `auth qr-start` or `auth qr-poll`
- **THEN** the command SHALL return a stable JSON envelope with command identity and normalized data fields
- **AND** `auth qr-poll` SHALL distinguish waiting, expired, and success states without requiring the caller to parse provider-specific raw payloads

#### Scenario: Account self-get returns normalized platform identity fields
- **WHEN** a backend provider invokes `account self-get`
- **THEN** the command SHALL return normalized fields sufficient to map into account resolved profile data
- **AND** the output SHALL include a stable platform UID, display name, avatar, and other key profile fields needed for verification

### Requirement: Bilibili web API skill SHALL remain caller-managed for login state even under backend-provider use
The skill SHALL continue returning login outputs directly to the caller and SHALL NOT persist local account session state even when used by a backend platform provider.

#### Scenario: QR success returns reusable credential material without local persistence
- **WHEN** `auth qr-poll` succeeds
- **THEN** the command SHALL return the reusable cookie string, refresh token, and current user info directly
- **AND** it SHALL NOT write session files or recover prior login state from local storage
