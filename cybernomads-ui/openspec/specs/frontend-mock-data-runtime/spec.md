# frontend-mock-data-runtime Specification

## Purpose
TBD - created by archiving change integrate-frontend-pages-and-mocks. Update Purpose after archive.
## Requirements
### Requirement: Frontend SHALL provide shared domain-oriented mock models
The system SHALL expose shared mock models for workspace, asset, strategy, account, agent node, task run, and intervention record data so that multiple pages can consume the same domain objects consistently, and those models SHALL be rich enough to drive the information density required by the approved high-fidelity page layouts.

#### Scenario: Multiple pages consume the same workspace model
- **WHEN** the workspace list page and the workspace execution page load workspace data in mock mode
- **THEN** both pages MUST consume a compatible workspace representation from the shared mock runtime rather than separate page-specific data shapes

#### Scenario: Task pages consume shared task and intervention models
- **WHEN** the execution console and intervention view load task-related mock data
- **THEN** they MUST use shared task run and intervention record models from the same mock runtime

#### Scenario: High-fidelity cards read shared dense data
- **WHEN** high-fidelity list cards, config panels, or execution nodes require subtitles, statuses, metrics, timestamps, and badges
- **THEN** the frontend MUST source those fields from shared mock models instead of inventing page-local display-only objects

### Requirement: Frontend SHALL support scenario-based mock states
The system SHALL support mock scenarios for empty state, populated list state, editing state, running state, and failure state so that core workflows can be exercised before real backend integration, and the scenarios SHALL include the state transitions and content density needed for visually complete reference pages.

#### Scenario: Agent module renders empty state in mock mode
- **WHEN** the frontend is configured to use a mock scenario with no active agent node
- **THEN** the Agents module MUST render the first-run empty state and provide the expected initialization entry path

#### Scenario: Workspace module renders running state in mock mode
- **WHEN** the frontend is configured to use a mock running scenario
- **THEN** the workspace execution view MUST render task progress and execution logs from the selected scenario

#### Scenario: High-fidelity pages switch between visual states
- **WHEN** the user navigates among empty, populated, editing, running, and failure scenarios in mock mode
- **THEN** the frontend MUST be able to render the corresponding high-fidelity page states without manual per-page data patching

### Requirement: Frontend SHALL access mock data through the same API boundary used by pages
The system SHALL expose mock data through shared API or adapter boundaries so that page components do not import page-local fake data directly, and the same boundary SHALL support screenshot-derived placeholders, scripted log streams, and other visual-support data needed by the approved page compositions.

#### Scenario: Page requests data in mock mode
- **WHEN** a page requests list or detail data while mock mode is enabled
- **THEN** the page MUST read data through the shared API layer or a mock adapter behind that layer

#### Scenario: Mock mode is replaced by real APIs later
- **WHEN** the application switches from mock mode to real backend integration
- **THEN** the page layer MUST remain unchanged except for the configured API implementation behind the shared boundary

#### Scenario: Visual placeholder resources are needed in mock mode
- **WHEN** a high-fidelity page requires temporary assets such as screenshot placeholders, generated icons, or scripted logs
- **THEN** the frontend MUST obtain those resources through shared mock-support boundaries rather than embedding them directly into page components

