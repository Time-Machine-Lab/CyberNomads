## MODIFIED Requirements

### Requirement: Account pages frontend integration SHALL use the detail page as an account access workspace
The frontend SHALL treat the account detail page as a focused access workspace, organizing stable account editing separately from short-lived access-session actions.

#### Scenario: Detail page separates account editing from access work
- **WHEN** the user opens an account detail page
- **THEN** the page SHALL render account profile editing on the left
- **AND** it SHALL render QR login, token input, and verification actions in a dedicated center access region
- **AND** it SHALL render connection state and access-session logs on the right

#### Scenario: Detail page does not center the experience around availability checks
- **WHEN** the user is completing a normal account access flow
- **THEN** the main CTA SHALL be token verification rather than a separate availability-check action
- **AND** availability information, if shown, SHALL appear as secondary diagnostic context

### Requirement: Account pages frontend integration SHALL present list and create flows around wrapper-account management
The frontend SHALL keep list and create pages centered on wrapper-account management rather than login-flow orchestration.

#### Scenario: List page emphasizes add/delete and connection state
- **WHEN** the user opens the account list page
- **THEN** the page SHALL provide a clear add-account entry and delete action
- **AND** list summaries SHALL emphasize platform grouping and connection-state readability instead of consumability counts

#### Scenario: Create page remains minimal and responsive
- **WHEN** the user opens the create-account page
- **THEN** the page SHALL only capture the minimum wrapper-account fields
- **AND** the layout SHALL remain usable across common desktop and smaller laptop widths without requiring the user to scroll excessively to reach the primary action

### Requirement: Account pages frontend integration SHALL keep tag editing lightweight and inline
The frontend SHALL provide a compact inline tag-editing interaction instead of exposing raw comma-separated text as the primary UI.

#### Scenario: Detail page uses inline tag chips
- **WHEN** the user edits account tags on the detail page
- **THEN** the page SHALL render compact inline chips with add/remove interactions
- **AND** the underlying API payload MAY still serialize tags as a simple string array
