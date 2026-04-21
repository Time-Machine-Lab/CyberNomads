## MODIFIED Requirements

### Requirement: Frontend SHALL provide shared domain-oriented mock models
The system SHALL expose shared mock models for console setup state, workspace, asset, strategy, account, task run, and intervention record data so that multiple pages can consume the same domain objects consistently. The console setup model MUST be rich enough to drive both the unconfigured and configured console states and the transition through OpenClaw configuration.

#### Scenario: Console and OpenClaw pages consume the same setup model
- **WHEN** the Console module and OpenClaw configuration flow load mock data
- **THEN** both pages MUST consume a compatible shared console-setup representation from the mock runtime rather than separate page-local data shapes

#### Scenario: Multiple pages consume the same workspace model
- **WHEN** the workspace list page and the workspace runtime page load workspace data in mock mode
- **THEN** both pages MUST consume a compatible workspace representation from the shared mock runtime rather than separate page-specific data shapes

#### Scenario: High-fidelity cards read shared dense data
- **WHEN** high-fidelity list cards, console panels, config panels, or runtime nodes require subtitles, statuses, metrics, timestamps, badges, and scripted logs
- **THEN** the frontend MUST source those fields from shared mock models instead of inventing page-local display-only objects

### Requirement: Frontend SHALL support scenario-based mock states
The system SHALL support scenario-based mock states for the unconfigured console, configured console, populated lists, focused editing, runtime execution, and task intervention so that core workflows can be exercised before real backend integration. These scenarios MUST include the in-session transitions and content density needed for visually complete reference pages.

#### Scenario: Console renders the default unconfigured state
- **WHEN** the frontend is initialized in mock mode with no in-session setup action completed
- **THEN** the Console module MUST render the unconfigured first-run state as the default entry experience

#### Scenario: User transitions to the configured console state
- **WHEN** a user completes the OpenClaw save path in mock mode
- **THEN** the frontend MUST render the configured Console module state for the remainder of the current session

#### Scenario: Browser refresh resets the console to the default state
- **WHEN** the application runtime is reloaded after a mock console setup transition
- **THEN** the Console module MUST return to the default unconfigured state instead of persisting the configured state across refreshes

#### Scenario: Workspace module renders runtime state in mock mode
- **WHEN** the frontend is configured to use a mock runtime scenario
- **THEN** the workspace runtime view MUST render task progress, execution logs, and task intervention entry points from the selected scenario

### Requirement: Frontend SHALL access mock data through the same API boundary used by pages
The system SHALL expose mock data and mock state transitions through shared API or adapter boundaries so that page components do not import page-local fake data directly. Session-scoped transitions such as console configuration MUST be managed behind the shared mock boundary and MUST reset when the application runtime is reloaded.

#### Scenario: Page requests data in mock mode
- **WHEN** a page requests list or detail data while mock mode is enabled
- **THEN** the page MUST read data through the shared API layer or a mock adapter behind that layer

#### Scenario: Console setup updates the shared mock boundary
- **WHEN** a user completes the Console to OpenClaw configuration flow in mock mode
- **THEN** the configured-state transition MUST be applied through the shared mock adapter rather than a page-local toggle

#### Scenario: Visual placeholder resources are needed in mock mode
- **WHEN** a high-fidelity page requires temporary screenshot placeholders, generated icons, or scripted logs
- **THEN** the frontend MUST obtain those resources through shared mock-support boundaries rather than embedding them directly into page components
