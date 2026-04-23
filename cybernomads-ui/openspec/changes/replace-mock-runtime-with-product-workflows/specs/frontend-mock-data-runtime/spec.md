## REMOVED Requirements

### Requirement: Frontend SHALL provide shared domain-oriented mock models
**Reason**: Production pages must move to real backend APIs and must not depend on shared mock scenario state as product runtime behavior.
**Migration**: Replace production uses of `shared/mocks/runtime` with real entity API adapters. Move any required deterministic sample data into test-only fixtures or per-test request stubs.

### Requirement: Frontend SHALL support scenario-based mock states
**Reason**: Scenario switching is no longer a supported production runtime mode once the product-domain flow is backed by real APIs.
**Migration**: Remove `VITE_MOCK_SCENARIO`, `mockScenarioId`, scenario setters, and scenario-dependent page watchers from production code. Recreate only necessary states in automated tests through fixtures/stubs.

### Requirement: Frontend SHALL access mock data through the same API boundary used by pages
**Reason**: Mock data is no longer an application runtime source. The shared API boundary remains, but its production implementation must call documented backend endpoints.
**Migration**: Keep entity API boundaries and DTO mappers, replace mock adapters with backend request implementations, and move mock-equivalent data into test fixtures.

## ADDED Requirements

### Requirement: Frontend SHALL restrict artificial data to tests
The system SHALL restrict artificial product-domain data to automated tests, demos explicitly outside production runtime, or request stubs. Test data MUST NOT be imported by production page or entity API source files.

#### Scenario: Test fixture data is used
- **WHEN** an automated test requires products, strategies, accounts, traffic works, or tasks
- **THEN** the test MUST load fixture data from test-owned files or inline stubs
- **AND** production code MUST remain unaware of that fixture data
