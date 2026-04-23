## ADDED Requirements

### Requirement: Account pages frontend integration SHALL create wrapper accounts through a minimal create page
The frontend SHALL provide a dedicated create-account page that only captures wrapper-account management fields and SHALL defer login work to the detail workspace.

#### Scenario: Create page only captures minimum wrapper-account fields
- **WHEN** the user opens the create-account page
- **THEN** the page SHALL request platform, internal display name, tags, remark, and operator-managed platform metadata only
- **AND** the page SHALL NOT require token input, QR scanning, or resolved platform identity before account creation

#### Scenario: Newly created account routes into the detail workspace
- **WHEN** the create request succeeds
- **THEN** the frontend SHALL route the user to the created account detail page
- **AND** the detail page SHALL present the new account as not logged in

### Requirement: Account pages frontend integration SHALL use the detail page as the only token-connection workspace
The frontend SHALL move all token connection behavior to the account detail page and SHALL organize that page as basic information on the left, token access on the upper right, and logs on the lower right.

#### Scenario: Detail page hosts token input and QR challenge in one workspace
- **WHEN** the user opens an account detail page
- **THEN** the page SHALL present manual token input, QR challenge retrieval, and validate actions in one token-connection region
- **AND** the page SHALL use connection-attempt APIs instead of the old onboarding-session or authorization-attempt flows

#### Scenario: Detail page shows current or recent attempt logs
- **WHEN** the account has an active or recent connection attempt
- **THEN** the detail page SHALL render the current or recent log output in a dedicated lower-right panel
- **AND** the log panel SHALL read from the connection-attempt resource rather than from account core fields

### Requirement: Account pages frontend integration SHALL present internal profile and resolved platform profile separately
The frontend SHALL clearly distinguish operator-managed profile data from platform-derived resolved profile data throughout the account pages.

#### Scenario: Internal and resolved profile fields are rendered with distinct labels
- **WHEN** the frontend renders account detail data
- **THEN** the page SHALL label internal display name and resolved platform display name separately
- **AND** the page SHALL NOT imply that a validation success overwrote the internal display name

#### Scenario: List rows remain stable before first login
- **WHEN** the frontend renders a newly created account that has never been validated
- **THEN** the list row SHALL use operator-managed wrapper-account fields as its primary identity presentation
- **AND** the page SHALL show a first-class not-logged-in state instead of treating the row as incomplete or broken

### Requirement: Account pages frontend integration SHALL preserve the established cyber-dark visual style while reorganizing layout
The frontend SHALL keep the established account-page style language from the high-fidelity reference while allowing layout and interaction changes needed by the new wrapper-account model.

#### Scenario: Rebuilt pages keep the existing account-pool style direction
- **WHEN** the account list, create page, and detail page are rebuilt
- **THEN** they SHALL preserve the dark background, glass-panel surfaces, neon cyan emphasis, and Space Grotesk / Inter typography of the reference UI
- **AND** they SHALL NOT regress into a generic default admin visual style

## REMOVED Requirements

### Requirement: Account pages frontend integration SHALL provide a real account onboarding entry and flow
**Reason**: The new model no longer uses a separate onboarding flow to create an account before the account object exists.
**Migration**: Replace onboarding entry and onboarding-session pages with a minimal wrapper-account creation page and move token connection to the detail workspace.

### Requirement: Account pages frontend integration SHALL drive authorization and availability workflows using published account action semantics
**Reason**: The old requirement was based on onboarding-session and authorization-attempt semantics that no longer exist in the new model.
**Migration**: Rebuild frontend actions around account-bound connection attempts plus availability checks.

### Requirement: Account pages frontend integration SHALL degrade only the remaining unsupported regions
**Reason**: The rebuilt detail page now intentionally includes a real QR area and a real log panel rather than treating them as long-term placeholders.
**Migration**: Implement QR challenge and attempt-log regions against the new backend contracts and limit placeholders to genuinely unsupported future features only.
