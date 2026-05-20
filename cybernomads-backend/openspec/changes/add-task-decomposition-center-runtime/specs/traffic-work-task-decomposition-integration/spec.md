## ADDED Requirements

### Requirement: Traffic work decomposition SHALL route users through the decomposition center before execution
The traffic work task decomposition integration SHALL preserve traffic work lifecycle status while surfacing decomposition center state as the primary post-create and post-update task planning surface.

#### Scenario: Create traffic work and enter decomposition center
- **WHEN** a valid traffic work creation request is accepted and task decomposition begins
- **THEN** the traffic work lifecycle status SHALL remain within the existing lifecycle status set
- **AND** the traffic work context preparation status SHALL remain `pending` until confirmed task persistence succeeds
- **AND** the latest decomposition run SHALL be readable through the decomposition center view

#### Scenario: Confirm task plan before execution
- **WHEN** a decomposition run passes Review and waits for user confirmation
- **THEN** formal task persistence SHALL NOT happen until the user confirms the task plan
- **AND** the traffic work SHALL NOT be considered prepared until the system commits the confirmed task set

#### Scenario: User feedback triggers replacement decomposition
- **WHEN** the user submits feedback from the decomposition center
- **THEN** the next decomposition run SHALL receive the prior draft, Review report, repair history, execution feedback when available, and user feedback
- **AND** the replacement run SHALL be visible through the same decomposition center view
