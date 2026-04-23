## MODIFIED Requirements

### Requirement: Frontend SHALL reconstruct key pages to high-fidelity reference standards
The system SHALL rebuild the approved key pages so their panel hierarchy, information density, tonal layering, accent usage, spacing rhythm, and desktop composition closely match the corresponding grouped `code.html` references from the new UI set. Implementation MUST prioritize the core content panels over incidental top bars or inconsistent shell fragments present in exported reference files. Console and OpenClaw pages MUST preserve the approved high-fidelity visual language while correcting their content hierarchy to match the single current Agent service business flow.

#### Scenario: User views the control console states
- **WHEN** a user opens the control console in an unconfigured, pending verification, connected, connection failed, capability ready, or capability failed state
- **THEN** the frontend MUST render a single current Agent service readiness composition with clear primary and secondary actions
- **AND** it MUST NOT render multi-agent switching, add-agent, or failover controls as part of the MVP setup page

#### Scenario: User views the OpenClaw configuration page
- **WHEN** a user opens `/console/openclaw`
- **THEN** the frontend MUST render the focused configuration layout without the global sidebar
- **AND** the page MUST visually separate configuration inputs, connection verification, capability preparation, and diagnostic/error output

#### Scenario: User views a focused or runtime reference page
- **WHEN** a user opens team creation, OpenClaw configuration, the workspace runtime, or task intervention
- **THEN** the frontend MUST render the corresponding approved high-fidelity layout pattern rather than a generic form, table, or dashboard fallback

#### Scenario: Missing design asset prevents exact resource usage
- **WHEN** a required icon, avatar, or illustration asset is unavailable during implementation
- **THEN** the frontend MUST use an approved placeholder or screenshot-derived substitute that preserves layout, scale, and visual hierarchy until the final asset is provided
