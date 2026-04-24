## MODIFIED Requirements

### Requirement: Account platform capability runtime SHALL expose provider-neutral access-provider operations
The backend account platform capability runtime SHALL expose provider-neutral platform access operations through a `PlatformAccessProvider` style abstraction rather than through strategy-like naming or flow-specific script contracts.

#### Scenario: Runtime starts QR access without platform-specific branching
- **WHEN** the account runtime asks a platform provider to start QR access for an account
- **THEN** the provider SHALL return a normalized QR challenge summary and provider session context
- **AND** the runtime SHALL NOT need to know platform-specific script names or payload shapes

#### Scenario: Runtime verifies a token through normalized provider output
- **WHEN** the account runtime asks a platform provider to verify a candidate credential
- **THEN** the provider SHALL return normalized resolved profile data, applied credential material, and structured logs
- **AND** the runtime SHALL remain independent from platform-specific field names in the underlying script output

### Requirement: Account platform capability runtime SHALL support QR polling as a first-class provider action
The backend account platform capability runtime SHALL model QR progress polling explicitly instead of folding it into a generic resolve step.

#### Scenario: Poll QR session returns progress or candidate credential material
- **WHEN** the runtime polls a QR-based access session
- **THEN** the provider SHALL return a normalized progress result such as waiting, expired, or credential-ready
- **AND** the runtime SHALL update the access session without inferring QR semantics from provider-specific raw payloads
