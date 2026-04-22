## ADDED Requirements

### Requirement: Strategy pages frontend integration SHALL render strategy list and editor flows from real backend strategy data
The frontend strategy pages SHALL load strategy summaries and strategy details from the published strategy backend APIs rather than from local mock-only strategy records.

#### Scenario: Strategy list renders backend summaries
- **WHEN** the user opens the strategy list page
- **THEN** the frontend SHALL request the published strategy list API
- **AND** the rendered list SHALL be based on backend summary fields such as name, summary, tags, and updated time rather than on hard-coded card metadata

#### Scenario: Strategy editor loads backend detail for edit mode
- **WHEN** the user opens an existing strategy editor page
- **THEN** the frontend SHALL request the published strategy detail API
- **AND** the editor form SHALL be populated from backend fields such as name, summary, tags, content markdown, and placeholder declarations

### Requirement: Strategy pages frontend integration SHALL align page semantics with the current strategy backend contract
The frontend SHALL remove or degrade UI semantics that depend on unpublished strategy backend fields and SHALL keep the strategy pages aligned with the current markdown-template management scope.

#### Scenario: List page does not depend on effect metrics or deployment state
- **WHEN** the strategy list page renders backend results
- **THEN** it SHALL NOT require fields such as success rate, difficulty, target platform, or deployment state in order to present the strategy library
- **AND** any legacy UI region that depends on those fields SHALL be removed, simplified, or rendered from static presentation-only defaults that do not affect business behavior

#### Scenario: Editor page does not require draft or deploy semantics
- **WHEN** the user saves a strategy from the editor page
- **THEN** the frontend SHALL submit only the fields supported by the published create or update strategy contract
- **AND** the editor SHALL NOT require backend draft, deploy, module-count, or object-binding fields that do not exist in the current strategy contract

### Requirement: Strategy pages frontend integration SHALL support markdown-centered editing with strategy snapshot insertion assistance
The frontend SHALL present the strategy editor as a markdown-centered workflow and SHALL support selecting existing strategies for whole-body insertion assistance without inventing cross-strategy live reference semantics.

#### Scenario: Existing strategy can be loaded as insertion source
- **WHEN** the user uses the editor's strategy-side panel to browse existing strategies
- **THEN** the frontend SHALL be able to load or reuse strategy summaries and details from the real strategy APIs
- **AND** the insertion behavior SHALL treat the selected strategy as markdown content to be inserted into the current editor body rather than as a live dependency

#### Scenario: Inserted strategy content stays within markdown editing semantics
- **WHEN** the user inserts another strategy into the current strategy body
- **THEN** the editor SHALL insert markdown content into the current body
- **AND** the frontend SHALL NOT require a dedicated backend endpoint or relational model for strategy-to-strategy composition in this phase

### Requirement: Strategy pages frontend integration SHALL present backend placeholder declarations as parameter assistance
The frontend SHALL present backend strategy placeholder declarations using the current parameter placeholder contract and SHALL NOT retain the legacy object-reference language in the strategy editor.

#### Scenario: Editor helper renders parameter declarations from backend detail
- **WHEN** the editor receives backend strategy detail with parsed placeholders
- **THEN** the helper region SHALL render the declaration set using `type`, `key`, and `defaultValue`
- **AND** the helper SHALL NOT depend on unpublished position, bound-value, or object-routing data

#### Scenario: Placeholder helper does not require runtime binding behavior
- **WHEN** the current strategy backend only exposes placeholder declarations
- **THEN** the editor SHALL treat them as authoring assistance metadata
- **AND** the page SHALL NOT require runtime value submission, object binding, or compile-preview behavior to remain usable

### Requirement: Strategy pages frontend integration SHALL isolate real strategy backend access from other mock-only frontend modules
The frontend SHALL allow the strategy module to consume real backend APIs without forcing unrelated modules that still depend on mock data to switch at the same time.

#### Scenario: Strategy pages use real backend while unrelated modules stay mock-backed
- **WHEN** the strategy pages are connected to the real backend
- **THEN** the frontend SHALL keep strategy API calls on the real HTTP path
- **AND** unrelated modules that are still mock-only SHALL remain usable without requiring immediate migration

### Requirement: Strategy pages frontend integration SHALL preserve workspace compatibility with the new strategy entity mapping
The frontend SHALL update dependent workspace views enough to keep strategy selection and display working after the strategy entity layer is aligned to the real backend contract.

#### Scenario: Workspace pages continue to resolve strategy selection after strategy entity remapping
- **WHEN** the frontend strategy entity is remapped from the legacy mock record structure to the real backend-aligned structure
- **THEN** workspace pages that list or display strategies SHALL continue to resolve strategy identity and name correctly
- **AND** the strategy page migration SHALL NOT require a full workspace feature redesign in the same change
