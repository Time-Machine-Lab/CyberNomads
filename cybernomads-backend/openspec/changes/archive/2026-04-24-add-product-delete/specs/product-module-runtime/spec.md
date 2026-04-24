## MODIFIED Requirements

### Requirement: Product module SHALL exclude deletion in MVP

The backend product module SHALL implement product deletion behavior.

#### Scenario: Runtime supports product deletion

- **WHEN** a delete request is submitted for an existing product
- **THEN** the runtime SHALL delete the product metadata
- **AND** it SHALL delete the associated Markdown content file
- **AND** the product SHALL no longer appear in product list results
- **AND** subsequent product detail reads SHALL return not found

#### Scenario: Runtime does not check references before deletion

- **WHEN** a delete request is submitted for an existing product
- **THEN** the runtime SHALL NOT block deletion because the product may be referenced by other domains
- **AND** reference handling SHALL remain outside the product deletion behavior

#### Scenario: Runtime rejects deleting missing product

- **WHEN** a delete request is submitted for a product identifier that does not exist
- **THEN** the runtime SHALL return a not found error

### Requirement: Product module implementation SHALL align with top-level contracts

The backend product module SHALL implement its runtime behavior in alignment with the established product API and SQL contracts before exposing product functionality.

#### Scenario: Runtime behavior follows established contracts

- **WHEN** the product module implementation is prepared
- **THEN** the implementation SHALL use the published product API and SQL contracts as the source of truth
- **AND** the implementation SHALL update those top-level contracts first if runtime behavior requires contract changes

#### Scenario: Delete implementation follows updated contracts

- **WHEN** product deletion is implemented
- **THEN** the runtime SHALL update controller, service, storage adapters, tests, and API documentation consistently with the delete contract

