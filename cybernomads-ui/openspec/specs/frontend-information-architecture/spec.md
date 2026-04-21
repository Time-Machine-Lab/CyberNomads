# frontend-information-architecture Specification

## Purpose
TBD - created by archiving change integrate-frontend-pages-and-mocks. Update Purpose after archive.
## Requirements
### Requirement: Frontend SHALL expose a stable top-level module structure
The system SHALL organize the frontend into exactly five top-level product modules: Workspaces, Assets, Strategies, Accounts, and Agents. Pages that represent editors, detail views, internal execution views, configuration views, or empty states MUST remain children of one of these modules and MUST NOT appear as independent top-level modules.

#### Scenario: Execution console remains inside workspace context
- **WHEN** a user navigates to the execution console for a workspace
- **THEN** the route and page context MUST remain under the workspace module rather than a separate top-level execution module

#### Scenario: Agent empty state remains inside agent module
- **WHEN** no active agent node has been initialized
- **THEN** the frontend MUST render the agent empty state inside the Agents module rather than exposing a separate top-level page

### Requirement: Frontend SHALL provide stable routes for module entry and child pages
The system SHALL provide stable routes for module list pages, create/edit pages, detail pages, and task child pages so that users can move through the product without relying on design-specific page numbering.

#### Scenario: User opens a resource editor from a list page
- **WHEN** a user selects create or edit from the Assets or Strategies list page
- **THEN** the frontend MUST navigate to a child route for that editor under the corresponding module

#### Scenario: User opens a task intervention page from a workspace
- **WHEN** a user selects a specific task intervention action from the workspace execution context
- **THEN** the frontend MUST navigate to a task-scoped child route under the selected workspace

### Requirement: Frontend SHALL keep parent context visible for internal child pages
The system SHALL preserve the parent module context for internal child pages using route nesting, breadcrumb context, page headings, or equivalent navigation cues.

#### Scenario: User enters an account detail page
- **WHEN** a user opens the account detail and authentication page
- **THEN** the page MUST indicate that it belongs to the Accounts module and preserve a return path to the account list

#### Scenario: User enters an OpenClaw configuration page
- **WHEN** a user opens the OpenClaw configuration page
- **THEN** the page MUST indicate that it belongs to the Agents module and preserve a return path to the agent overview

