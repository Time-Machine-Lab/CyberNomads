## MODIFIED Requirements

### Requirement: Frontend SHALL access mock data through the same API boundary used by pages
The system SHALL expose mock data and mock state transitions through shared API or adapter boundaries so that page components do not import page-local fake data directly. Session-scoped transitions such as console configuration MUST be managed behind the shared mock boundary and MUST reset when the application runtime is reloaded. Product/asset mock data MUST remain behind the same entity API boundary used for real product API integration so pages can switch between mock and real sources without changing page-level imports.

#### Scenario: Page requests data in mock mode
- **WHEN** a page requests list or detail data while mock mode is enabled
- **THEN** the page MUST read data through the shared API layer or a mock adapter behind that layer

#### Scenario: Console setup updates the shared mock boundary
- **WHEN** a user completes the Console to OpenClaw configuration flow in mock mode
- **THEN** the configured-state transition MUST be applied through the shared mock adapter rather than a page-local toggle

#### Scenario: Visual placeholder resources are needed in mock mode
- **WHEN** a high-fidelity page requires temporary screenshot placeholders, generated icons, or scripted logs
- **THEN** the frontend MUST obtain those resources through shared mock-support boundaries rather than embedding them directly into page components

#### Scenario: Product mock data uses the product entity API boundary
- **WHEN** `/assets` list or editor pages run in mock mode after product API integration is implemented
- **THEN** those pages MUST continue calling the asset/product entity API functions
- **AND** MUST NOT import product mock records directly from page components
