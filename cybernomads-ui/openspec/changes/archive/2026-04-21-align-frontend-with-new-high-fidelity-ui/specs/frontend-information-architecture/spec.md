## MODIFIED Requirements

### Requirement: Frontend SHALL expose a stable top-level module structure
The system SHALL organize the frontend into exactly five top-level product modules: Console, Assets, Strategies, Accounts, and Workspaces. The user-facing labels for these modules MUST be `控制台`、`资产列表`、`策略库`、`账号池`、`推广工作区`. Pages that represent editors, detail views, configuration flows, execution views, empty states, or task child pages MUST remain children of one of these modules and MUST NOT appear as independent top-level modules.

#### Scenario: Runtime environment remains inside workspace context
- **WHEN** a user navigates to a workspace runtime environment or a task intervention view
- **THEN** the route and page context MUST remain under the Workspaces module rather than a separate top-level execution module

#### Scenario: Control console owns agent setup states
- **WHEN** the user has not configured an agent engine or has already configured one
- **THEN** both the unconfigured console state and the configured console state MUST render inside the Console module rather than exposing a separate Agents top-level module

### Requirement: Frontend SHALL provide stable routes for module entry and child pages
The system SHALL provide stable routes for module entry pages and child pages so that users can move through outer pages, focused pages, and runtime pages without relying on design-specific numbering or duplicated shells. The approved route structure MUST provide a default entry into the Console module and dedicated child routes for resource editors, OpenClaw configuration, workspace creation, workspace runtime, and task intervention.

#### Scenario: User opens the application root
- **WHEN** a user loads the application root route
- **THEN** the frontend MUST direct the user to the Console module entry rather than the legacy workspace or agent entry pages

#### Scenario: User opens a resource editor from a list page
- **WHEN** a user selects create or edit from the Assets, Strategies, or Accounts module
- **THEN** the frontend MUST navigate to a child route for that focused editor or detail page under the corresponding module context

#### Scenario: User opens a task intervention page from a workspace
- **WHEN** a user selects a specific task from the workspace runtime environment
- **THEN** the frontend MUST navigate to a task-scoped child route under the selected workspace

### Requirement: Frontend SHALL keep parent context visible for internal child pages
The system SHALL preserve the parent module context for focused and runtime child pages using back navigation, page headings, active navigation state, breadcrumbs, or equivalent parent cues even when the unified outer sidebar is removed.

#### Scenario: User enters an account detail page
- **WHEN** a user opens the account detail and authentication page
- **THEN** the page MUST indicate that it belongs to the Accounts module and preserve a return path to the account list

#### Scenario: User enters an OpenClaw configuration page
- **WHEN** a user opens the OpenClaw configuration page from the Console module
- **THEN** the page MUST indicate that it belongs to the Console setup flow and preserve a return path to the console

## ADDED Requirements

### Requirement: Frontend SHALL assign each page to an approved shell context
The system SHALL assign every page to exactly one approved shell context: outer module shell, focused editor or configuration shell, or runtime execution shell. Outer module pages MUST keep the unified left sidebar, focused pages MUST remove the global sidebar, and runtime pages MUST use the immersive execution shell.

#### Scenario: User opens an outer module page
- **WHEN** a user navigates to the Console, Assets, Strategies, Accounts, or Workspaces module entry page
- **THEN** the frontend MUST render that page inside the unified outer shell with the standardized left sidebar

#### Scenario: User opens a focused editor or configuration page
- **WHEN** a user enters OpenClaw configuration, asset editing, strategy editing, account editing, or team creation
- **THEN** the frontend MUST render that page without the global sidebar and preserve only contextual return affordances

#### Scenario: User opens a runtime execution page
- **WHEN** a user enters the workspace runtime environment or a task intervention page
- **THEN** the frontend MUST render that page inside the approved runtime shell rather than the outer module shell
