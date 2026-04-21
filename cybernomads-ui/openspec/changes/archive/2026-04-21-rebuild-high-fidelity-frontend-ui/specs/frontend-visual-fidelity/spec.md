## ADDED Requirements

### Requirement: Frontend SHALL provide a unified high-fidelity desktop shell
The system SHALL render all top-level modules inside a unified desktop application shell that matches the approved CyberNomads visual direction, including a persistent left navigation rail, a consistent top context region, and a content canvas that preserves module context while allowing page-specific panel layouts.

#### Scenario: User navigates across top-level modules
- **WHEN** a user switches between Workspaces, Assets, Strategies, Accounts, and Agents
- **THEN** the frontend MUST preserve a consistent desktop shell structure and only change the page-specific content region

#### Scenario: User collapses the left navigation
- **WHEN** a user activates the sidebar collapse control
- **THEN** the frontend MUST reduce the navigation to an icon-forward collapsed state without changing the active module context or breaking page usability

### Requirement: Frontend SHALL localize shell navigation and branding for CyberNomads
The system SHALL present the global product shell with CyberNomads branding and Chinese-language primary navigation labels while preserving the five approved top-level module boundaries.

#### Scenario: User views the default expanded shell
- **WHEN** the application loads in its default desktop shell state
- **THEN** the frontend MUST display CyberNomads branding and Chinese navigation labels for the primary modules

#### Scenario: User opens a child page from a module
- **WHEN** a user enters an internal page such as the execution console, task intervention view, or OpenClaw configuration page
- **THEN** the frontend MUST preserve the parent module identity within the shell through active navigation state, title context, breadcrumb context, or an equivalent parent cue

### Requirement: Frontend SHALL reconstruct key pages to high-fidelity reference standards
The system SHALL rebuild the key reference pages so their panel hierarchy, information density, tonal layering, accent usage, and desktop layout closely match the approved reference screens for workspace creation, workspace execution, workspace listing, agent empty state, and OpenClaw configuration.

#### Scenario: User views a key reference page
- **WHEN** a user opens one of the approved key reference pages
- **THEN** the frontend MUST render the page using the corresponding high-fidelity layout pattern rather than a generic dashboard or form layout

#### Scenario: Missing design asset prevents exact resource usage
- **WHEN** a required icon, avatar, or illustration asset is unavailable during implementation
- **THEN** the frontend MUST use an approved placeholder or screenshot-derived substitute that preserves layout, scale, and visual hierarchy until the final asset is provided

### Requirement: Frontend SHALL preserve desktop-grade visual quality across common desktop sizes
The system SHALL maintain the approved visual hierarchy, spacing rhythm, panel composition, and readability across common desktop viewport widths without requiring mobile-first adaptation.

#### Scenario: User opens the application on a narrower desktop viewport
- **WHEN** the viewport width decreases within the supported desktop range
- **THEN** the frontend MUST adapt panel sizing, spacing, or column distribution without collapsing the experience into a broken or off-style layout

#### Scenario: User opens a dense control page on a wide desktop viewport
- **WHEN** the user opens a high-density page such as the execution console or OpenClaw configuration page on a wide desktop screen
- **THEN** the frontend MUST preserve the intended asymmetric layout and panel balance instead of stretching content into an unstructured full-width layout
