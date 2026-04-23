## Purpose
Define the permitted scope of artificial data after production pages move to documented backend APIs.

## Requirements

### Requirement: Frontend SHALL restrict artificial data to tests
The system SHALL restrict artificial product-domain data to automated tests, demos explicitly outside production runtime, or request stubs. Test data MUST NOT be imported by production page or entity API source files.

#### Scenario: Test fixture data is used
- **WHEN** an automated test requires products, strategies, accounts, traffic works, or tasks
- **THEN** the test MUST load fixture data from test-owned files or inline stubs
- **AND** production code MUST remain unaware of that fixture data
