## MODIFIED Requirements

### Requirement: Frontend SHALL reconstruct key pages to high-fidelity reference standards
The system SHALL rebuild the approved key pages so their panel hierarchy, information density, tonal layering, accent usage, spacing rhythm, and desktop composition closely match the corresponding grouped `code.html` references from the new UI set. Implementation MUST prioritize the core content panels over incidental top bars or inconsistent shell fragments present in exported reference files. Console and OpenClaw pages MUST preserve the approved high-fidelity visual language while correcting their content hierarchy to match the single current Agent service business flow. Assets list and focused asset editor pages MUST preserve the same high-fidelity language while keeping destructive actions contextual and removing non-product metadata chrome from the editor header.

#### Scenario: User views the control console states
- **WHEN** a user opens the control console in an unconfigured, pending verification, connected, connection failed, capability ready, or capability failed state
- **THEN** the frontend MUST render a single current Agent service readiness composition with clear primary and secondary actions
- **AND** it MUST NOT render multi-agent switching, add-agent, or failover controls as part of the MVP setup page

#### Scenario: User views the OpenClaw configuration page
- **WHEN** a user opens `/console/openclaw`
- **THEN** the frontend MUST render the focused configuration layout without the global sidebar
- **AND** the page MUST visually separate configuration inputs, connection verification, capability preparation, and diagnostic/error output

#### Scenario: User views the assets list destructive-action pattern
- **WHEN** a user opens `/assets`
- **THEN** each asset card MUST keep its primary visual emphasis on the asset identity and open action
- **AND** destructive actions MUST stay hidden inside a contextual overflow menu until requested
- **AND** the delete confirmation and failure feedback MUST fit the existing high-fidelity assets surface rather than falling back to an unrelated browser-default management pattern

#### Scenario: User views the focused asset editor header
- **WHEN** a user opens `/assets/new` or `/assets/:assetId/edit`
- **THEN** the page MUST render a focused return action back to `/assets`
- **AND** keep the title/status area as the dominant header focal point
- **AND** omit the target-label metadata block that is not part of the persisted product workflow

#### Scenario: User views a focused or runtime reference page
- **WHEN** a user opens team creation, OpenClaw configuration, the workspace runtime, or task intervention
- **THEN** the frontend MUST render the corresponding approved high-fidelity layout pattern rather than a generic form, table, or dashboard fallback

#### Scenario: Missing design asset prevents exact resource usage
- **WHEN** a required icon, avatar, or illustration asset is unavailable during implementation
- **THEN** the frontend MUST use an approved placeholder or screenshot-derived substitute that preserves layout, scale, and visual hierarchy until the final asset is provided
