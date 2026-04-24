## Purpose
Define the approved top-level module structure, routes, and shell contexts for the CyberNomads frontend.

## Requirements

### Requirement: Frontend SHALL expose a stable top-level module structure
The system SHALL organize the frontend into exactly five top-level product modules: Console, Assets, Strategies, Accounts, and Workspaces. The user-facing labels for these modules MUST remain `控制台`, `资产列表`, `策略库`, `账号池`, and `推广工作区` for this compatibility change, while runtime semantics MUST align Assets with backend Products and Workspaces with backend TrafficWorks. Pages that represent editors, detail views, configuration flows, execution views, empty states, or task child pages MUST remain children of one of these modules and MUST NOT appear as independent top-level modules. Agent service setup MUST be represented as a Console child flow for the current active Agent service, not as a separate Agents module or a multi-agent management surface.

#### Scenario: Runtime environment remains inside workspace context
- **WHEN** a user navigates to a workspace runtime environment or a task intervention view
- **THEN** the route and page context MUST remain under the Workspaces module
- **AND** the runtime identity MUST map to backend `trafficWorkId`

#### Scenario: Control console owns agent setup states
- **WHEN** the user has not configured an Agent service or has already configured one
- **THEN** both the unconfigured console state and the configured console state MUST render inside the Console module rather than exposing a separate Agents top-level module
- **AND** Console MUST NOT present add-agent, switch-agent, route-agent, or failover controls in the MVP setup path

### Requirement: Frontend SHALL provide stable routes for module entry and child pages
The system SHALL provide stable routes for module entry pages and child pages so that users can move through outer pages, focused pages, and runtime pages without relying on design-specific numbering or duplicated shells. The approved route structure MUST provide a default entry into the Console module and dedicated child routes for product editors, Agent service configuration, traffic work creation, traffic work runtime, and task intervention. `/console/openclaw` MUST remain the stable child route for OpenClaw configuration of the current active Agent service.

#### Scenario: User opens the application root
- **WHEN** a user loads the application root route
- **THEN** the frontend MUST direct the user to the Console module entry rather than the legacy workspace or agent entry pages

#### Scenario: User opens OpenClaw setup from Console
- **WHEN** a user selects the Console Agent service setup action
- **THEN** the frontend MUST navigate to `/console/openclaw`
- **AND** the page MUST preserve Console parent context through a contextual return affordance

#### Scenario: User opens a resource editor from a list page
- **WHEN** a user selects create or edit from the Assets, Strategies, or Accounts module
- **THEN** the frontend MUST navigate to a child route for that focused editor or detail page under the corresponding module context
- **AND** the Assets editor MUST persist backend Product data rather than mock asset data

#### Scenario: User opens a task intervention page from a workspace
- **WHEN** a user selects a specific task from the workspace runtime environment
- **THEN** the frontend MUST navigate to a task-scoped child route under the selected TrafficWork

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
