## ADDED Requirements

### Requirement: Traffic work contracts SHALL keep work status separate from decomposition progress
Traffic work contracts SHALL continue to model only traffic work lifecycle and context-preparation status. Decomposition progress SHALL be exposed by the task decomposition center contract rather than by adding traffic work status values.

#### Scenario: Traffic work status remains stable during decomposition
- **WHEN** a traffic work is undergoing task decomposition
- **THEN** its lifecycle status SHALL remain one of `ready`, `running`, `ended`, `archived`, or `deleted`
- **AND** its context preparation status SHALL remain one of `pending`, `prepared`, or `failed`
- **AND** decomposition progress SHALL be read from the decomposition center view

#### Scenario: Prepared status follows formal task persistence
- **WHEN** the user confirms a task plan and backend formal task persistence succeeds
- **THEN** the traffic work context preparation status SHALL become `prepared`
- **AND** the lifecycle status SHALL NOT be changed solely because the task plan was confirmed
