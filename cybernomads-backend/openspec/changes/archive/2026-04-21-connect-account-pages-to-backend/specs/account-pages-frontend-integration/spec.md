## ADDED Requirements

### Requirement: Account pages frontend integration SHALL render account list and detail views from real backend account data
The frontend account pages SHALL load account list summaries and sanitized account details from the published account backend APIs rather than from local mock account records.

#### Scenario: Account list renders backend summaries
- **WHEN** the user opens the account list page
- **THEN** the frontend SHALL request the published account list API
- **AND** the rendered list SHALL be based on backend summary fields rather than on hard-coded mock account rows

#### Scenario: Account detail renders sanitized backend detail
- **WHEN** the user opens an account detail page for an existing account
- **THEN** the frontend SHALL request the published account detail API
- **AND** the detail page SHALL render the returned sanitized management view without requiring raw credential payload fields

### Requirement: Account pages frontend integration SHALL map backend account semantics into stable UI presentation states
The frontend SHALL derive page labels, status chips, row tones, and summary text from backend lifecycle, authorization, and availability semantics instead of relying on the legacy `connected/needs-auth/error` mock status field.

#### Scenario: List row status is derived from backend state dimensions
- **WHEN** the frontend receives an account summary from the backend
- **THEN** it SHALL derive the row presentation state from lifecycle, authorization, availability, and active-credential presence
- **AND** the list page SHALL NOT require a legacy single-field mock status to render account state

#### Scenario: Detail page keeps stable identity read-only
- **WHEN** the frontend renders an account detail page
- **THEN** it SHALL present stable identity fields such as platform and platform account UID as read-only information
- **AND** only editable management fields allowed by the backend contract SHALL remain editable in the page form

### Requirement: Account pages frontend integration SHALL execute supported profile and lifecycle actions through published account APIs
The frontend SHALL drive editable profile saves, soft deletion, and restoration through the published account HTTP behaviors that already exist in the backend account module.

#### Scenario: Editable account profile is saved through backend update
- **WHEN** a user edits supported fields such as display name, remark, tags, or platform metadata
- **THEN** the frontend SHALL submit those changes through the published account update API
- **AND** the page SHALL refresh to the backend-confirmed account detail after save

#### Scenario: Delete and restore actions use backend lifecycle endpoints
- **WHEN** a user deletes or restores an account from the frontend
- **THEN** the frontend SHALL call the published soft-delete or restore API
- **AND** the resulting list or detail state SHALL reflect the backend-confirmed lifecycle status

### Requirement: Account pages frontend integration SHALL drive authorization and availability workflows using published account action semantics
The frontend SHALL execute token or cookie onboarding and connection validation through the backend authorization-attempt and availability-check APIs instead of through legacy direct status mutation behavior.

#### Scenario: Direct credential onboarding uses authorization attempt plus verification
- **WHEN** a user submits a supported direct credential input such as token or cookie material
- **THEN** the frontend SHALL start an authorization attempt and then invoke authorization verification through the published backend workflow
- **AND** the page SHALL treat authorization success or failure according to the backend verification response

#### Scenario: Connection validation uses availability check
- **WHEN** a user triggers connection validation for an account
- **THEN** the frontend SHALL invoke the published account availability-check API
- **AND** the resulting availability state shown in the UI SHALL be refreshed from the backend response

### Requirement: Account pages frontend integration SHALL degrade unsupported UI regions rather than inventing unpublished backend dependencies
The frontend SHALL keep visual regions that depend on unpublished account contracts non-operational until those contracts are intentionally introduced.

#### Scenario: Unsupported credential or QR regions remain placeholder-only
- **WHEN** the current page design includes QR authorization visuals, raw credential display, credential history, or terminal log panels
- **THEN** the frontend SHALL render them as placeholder, disabled, hidden, or explanatory regions
- **AND** the account pages SHALL NOT require unpublished backend APIs to make the page usable in this phase

### Requirement: Account pages frontend integration SHALL isolate real account backend access from other mock-only frontend modules
The frontend SHALL allow the account module to consume real backend APIs without forcing unrelated modules that still depend on mock data to switch at the same time.

#### Scenario: Account module uses real backend while other modules stay on mock data
- **WHEN** the account pages are connected to the real backend
- **THEN** the frontend SHALL keep account API calls on the real HTTP path
- **AND** unrelated modules that are still mock-only SHALL remain usable without requiring immediate backend integration
