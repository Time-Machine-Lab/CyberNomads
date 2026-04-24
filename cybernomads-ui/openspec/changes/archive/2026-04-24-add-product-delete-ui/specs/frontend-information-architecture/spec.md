## ADDED Requirements

### Requirement: Frontend SHALL separate asset-card navigation from asset-card secondary actions
The frontend SHALL keep each `/assets` card focused on a single primary navigation path to the asset editor while placing secondary actions inside a distinct overflow control. Secondary actions such as deletion MUST remain accessible from the card itself without hijacking the primary click path to `/assets/:assetId/edit`.

#### Scenario: User opens asset-card secondary actions
- **WHEN** a user activates the overflow control on an asset card in `/assets`
- **THEN** the frontend MUST reveal secondary actions for that specific asset without navigating away from the list

#### Scenario: Secondary action does not trigger editor navigation
- **WHEN** a user opens the overflow control or selects delete for an asset card
- **THEN** the frontend MUST NOT trigger the card's primary navigation to `/assets/:assetId/edit`

## MODIFIED Requirements

### Requirement: Frontend SHALL provide stable routes for module entry and child pages
The system SHALL provide stable routes for module entry pages and child pages so that users can move through outer pages, focused pages, and runtime pages without relying on design-specific numbering or duplicated shells. The approved route structure MUST provide a default entry into the Console module and dedicated child routes for product editors, Agent service configuration, traffic work creation, traffic work runtime, and task intervention. `/console/openclaw` MUST remain the stable child route for OpenClaw configuration of the current active Agent service. `/assets/:assetId/edit` and `/assets/new` MUST preserve Assets parent context through a visible return action back to `/assets`.

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
- **AND** the Assets editor MUST provide a visible return action to `/assets`

#### Scenario: User opens a task intervention page from a workspace
- **WHEN** a user selects a specific task from the workspace runtime environment
- **THEN** the frontend MUST navigate to a task-scoped child route under the selected TrafficWork
