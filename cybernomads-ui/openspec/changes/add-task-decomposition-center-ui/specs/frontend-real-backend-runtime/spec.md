## ADDED Requirements

### Requirement: Frontend SHALL consume documented decomposition center APIs
The frontend production runtime SHALL load task decomposition center data through API adapters aligned with `../../docs/api/task-decomposition-runs.yaml` and SHALL NOT use page-local mock data for production decomposition center behavior.

#### Scenario: Decomposition center loads real center view
- **WHEN** the decomposition center page loads for a traffic work
- **THEN** it SHALL call the documented decomposition center view endpoint
- **AND** it SHALL map response data through entity API/model boundaries rather than embedding raw request logic in the page

#### Scenario: Decomposition center actions use documented endpoints
- **WHEN** the user confirms a task plan or submits feedback
- **THEN** the frontend SHALL call the documented confirmation or feedback endpoint
- **AND** it SHALL handle 400, 404, and 409 responses according to the documented API behavior
