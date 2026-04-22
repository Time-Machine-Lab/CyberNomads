# account-pages-frontend-integration Specification

## Purpose
TBD - created by archiving change connect-account-pages-to-backend. Update Purpose after archive.
## Requirements
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

### Requirement: Account pages frontend integration SHALL provide a real account onboarding entry and flow
The account pages frontend SHALL provide a real entry and flow for creating accounts instead of leaving new-account onboarding as a mock-only placeholder.

#### Scenario: Account list exposes a real create entry
- **WHEN** the user opens the account list page
- **THEN** the frontend SHALL render a usable create-account entry that routes to a real onboarding page
- **AND** that entry SHALL NOT depend on local mock data or a hand-crafted fake route

#### Scenario: Onboarding page drives the published onboarding session workflow
- **WHEN** the user opens the new-account onboarding page
- **THEN** the frontend SHALL use the published onboarding-session API to complete platform selection, challenge display, resolved-token confirmation, and final create-or-restore actions
- **AND** the page SHALL route to the created, restored, or already-existing account detail after finalization

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
The frontend SHALL drive new-account token onboarding, existing-account token replacement, and connection validation through the published onboarding-session, authorization-attempt, and availability-check APIs instead of through legacy credential-specific mock behavior.

#### Scenario: New account onboarding uses the onboarding session workflow
- **WHEN** the user chooses QR or manual token input during new-account onboarding
- **THEN** the frontend SHALL use the published onboarding-session API to fetch challenge data, submit token resolution input or polling requests, and finalize create-or-restore
- **AND** the frontend SHALL NOT require the user to manually enter `platformAccountUid` during the new-account flow

#### Scenario: Existing account replacement uses a unified token access region
- **WHEN** the user replaces the current token for an existing account
- **THEN** the frontend SHALL host QR and manual token input in one unified token access region and call the existing-account authorization-attempt plus verification workflow
- **AND** the page SHALL let the user decide whether to replace the current token after resolution succeeds rather than overwriting it when the challenge or input is first submitted

#### Scenario: Connection validation uses availability check
- **WHEN** a user triggers connection validation for an account
- **THEN** the frontend SHALL invoke the published account availability-check API
- **AND** the resulting availability state shown in the UI SHALL be refreshed from the backend response

### Requirement: Account pages frontend integration SHALL degrade only the remaining unsupported regions
The frontend SHALL degrade only the regions that still depend on unpublished contracts after QR challenge and unified token access are available from the backend rather than keeping the whole token region as a placeholder.

#### Scenario: QR challenge is rendered from real backend data
- **WHEN** the backend publishes challenge summary or QR rendering contracts
- **THEN** the frontend SHALL render the QR challenge region from real backend data
- **AND** that region SHALL NOT remain permanently disabled or explanation-only

#### Scenario: Raw token history and terminal logs remain placeholder-only
- **WHEN** the page still contains raw token echo, token history, or terminal log regions
- **THEN** the frontend SHALL keep those regions in a placeholder, disabled, hidden, or explanatory state
- **AND** the frontend SHALL NOT invent unpublished backend contracts just to fill those regions

### Requirement: Account pages frontend integration SHALL isolate real account backend access from other mock-only frontend modules
The frontend SHALL allow the account module to consume real backend APIs without forcing unrelated modules that still depend on mock data to switch at the same time.

#### Scenario: Account module uses real backend while other modules stay on mock data
- **WHEN** the account pages are connected to the real backend
- **THEN** the frontend SHALL keep account API calls on the real HTTP path
- **AND** unrelated modules that are still mock-only SHALL remain usable without requiring immediate backend integration
