## ADDED Requirements

### Requirement: Frontend workspace creation SHALL land in decomposition center before execution
The frontend workspace creation and update flows SHALL land users in the task decomposition center when task planning is pending or waiting for confirmation, and SHALL reserve the execution console for confirmed formal task runtime.

#### Scenario: Created workspace enters planning flow
- **WHEN** the user completes workspace creation and receives a valid `trafficWorkId`
- **THEN** the frontend SHALL navigate to the workspace decomposition center route
- **AND** it SHALL NOT navigate directly to the execution console unless the backend indicates formal tasks are already prepared

#### Scenario: Prepared workspace enters execution flow
- **WHEN** a workspace has confirmed formal tasks and context preparation status `prepared`
- **THEN** the frontend SHALL allow the user to enter the existing workspace runtime execution page
- **AND** the runtime page SHALL continue to load formal task state from the Tasks API
