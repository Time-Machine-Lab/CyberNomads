## MODIFIED Requirements

### Requirement: Frontend SHALL support the first-entry setup workflow
The system SHALL land first-time users on the Console module and guide them through the required OpenClaw setup flow when no agent engine is configured. The workflow SHALL present the unconfigured console state as the default first-entry experience, open a focused configuration flow from the primary action, and return the user to the configured console state after configuration is completed in the current mock session.

#### Scenario: User first enters the product without a configured agent
- **WHEN** a user opens the product in mock mode before any console setup action has been completed
- **THEN** the frontend MUST render the unconfigured Console module as the default landing experience

#### Scenario: User completes OpenClaw configuration from the console
- **WHEN** a user enters the OpenClaw configuration flow from the Console module and completes the save path
- **THEN** the frontend MUST return the user to the configured Console module state in the same session

#### Scenario: Missing account blocks workspace creation path
- **WHEN** a user attempts to create or prepare a workspace without an available account
- **THEN** the frontend MUST provide a clear path to the Accounts module so the user can complete account setup and return

### Requirement: Frontend SHALL support the workspace execution workflow
The system SHALL allow a user to enter the workspace list, launch the create-team flow, confirm the new team, enter the runtime environment immediately, inspect task progress, inspect execution logs, and open a full-page task intervention view. The execution experience SHALL preserve the approved runtime shell and task-graph visibility throughout the workflow.

#### Scenario: User creates a workspace from prepared resources
- **WHEN** a user completes resource selection and confirms team creation in the workspace creation flow
- **THEN** the frontend MUST create the workspace and send the user directly into the workspace runtime environment

#### Scenario: User inspects task state in the runtime environment
- **WHEN** a user enters a workspace runtime environment
- **THEN** the frontend MUST show current task state, execution visibility, and a way to inspect execution logs from the same workflow

#### Scenario: User opens a full-page task intervention view
- **WHEN** a user selects a task node or intervention entry point from the workspace runtime environment
- **THEN** the frontend MUST navigate to a dedicated task intervention page that supports prompt editing and contextual execution review
