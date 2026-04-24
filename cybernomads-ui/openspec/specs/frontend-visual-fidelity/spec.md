## Purpose
Define the high-fidelity shell, localization, visual reconstruction, and desktop quality requirements for the CyberNomads frontend.

## Requirements

### Requirement: Frontend SHALL provide a unified high-fidelity desktop shell
The system SHALL provide a unified high-fidelity desktop shell system whose outer module pages share a standardized CyberNomads sidebar and content canvas, while focused editor or configuration pages and runtime execution pages use approved shell variants rather than reusing a generic dashboard layout. The outer module shell MUST exclude a persistent global top bar so that chrome emphasis remains on the core content panels.

#### Scenario: User navigates across top-level modules
- **WHEN** a user switches between Console, Assets, Strategies, Accounts, and Workspaces
- **THEN** the frontend MUST preserve a consistent left-sidebar shell and only change the page-specific content region

#### Scenario: User opens a focused child page
- **WHEN** a user enters a focused editor or configuration page
- **THEN** the frontend MUST remove the outer sidebar and global top bar in favor of the approved contextual return layout

#### Scenario: User opens a runtime execution page
- **WHEN** a user enters a workspace runtime or task intervention page
- **THEN** the frontend MUST use the immersive runtime shell rather than the outer module shell

#### Scenario: User collapses the left navigation
- **WHEN** a user activates the sidebar collapse control on an outer module page
- **THEN** the frontend MUST reduce the navigation to an icon-forward collapsed state without changing the active module context or breaking page usability

### Requirement: Frontend SHALL localize shell navigation and branding for CyberNomads
The system SHALL present the outer shell with CyberNomads branding, Chinese-language primary navigation labels, and a unified sidebar design derived from the approved redesign references. Secondary entries such as `系统设置` and `支持中心` MUST remain visually subordinate to the five primary modules.

#### Scenario: User views the default expanded shell
- **WHEN** the application loads in its default outer-shell state
- **THEN** the frontend MUST display CyberNomads branding and Chinese navigation labels for the five approved primary modules

#### Scenario: User opens a child page from a module
- **WHEN** a user enters an internal page such as OpenClaw configuration, the workspace runtime, or task intervention
- **THEN** the frontend MUST preserve the parent module identity through contextual return cues rather than a reused top navigation bar

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

### Requirement: Frontend SHALL preserve desktop-grade visual quality across common desktop sizes
The system SHALL maintain the approved visual hierarchy, spacing rhythm, panel composition, and readability across common desktop viewport widths without requiring mobile-first adaptation. Dense pages MUST preserve their intended panel proportions and asymmetric layouts instead of stretching content into unstructured full-width regions.

#### Scenario: User opens the application on a narrower desktop viewport
- **WHEN** the viewport width decreases within the supported desktop range
- **THEN** the frontend MUST adapt panel sizing, spacing, or column distribution without collapsing the experience into a broken or off-style layout

#### Scenario: User opens a dense control page on a wide desktop viewport
- **WHEN** the user opens the workspace runtime or OpenClaw configuration page on a wide desktop screen
- **THEN** the frontend MUST preserve the intended panel balance, asymmetry, and readable content density instead of stretching the page into an unstructured canvas
