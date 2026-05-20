## ADDED Requirements

### Requirement: Frontend SHALL keep task decomposition center inside workspace route hierarchy
The task decomposition center SHALL be a Workspaces child route and SHALL NOT create a new top-level navigation module.

#### Scenario: User opens decomposition center
- **WHEN** a user opens the task decomposition center for a traffic work
- **THEN** the route SHALL remain under the Workspaces module context
- **AND** the page SHALL preserve a clear path back to the Workspaces list or forward to the workspace runtime when execution becomes available

#### Scenario: Runtime shell remains approved for work environment
- **WHEN** the decomposition center is rendered
- **THEN** it SHALL use an approved shell context for workspace runtime/planning work
- **AND** it SHALL not appear in the outer top-level sidebar as a separate module
