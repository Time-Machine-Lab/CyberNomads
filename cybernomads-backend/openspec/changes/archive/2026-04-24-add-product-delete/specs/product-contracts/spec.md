## MODIFIED Requirements

### Requirement: Product contracts SHALL not expose deletion in MVP

The system SHALL define product deletion behavior as part of the product module contracts.

#### Scenario: Delete contract is published

- **WHEN** top-level product contracts are updated
- **THEN** the published API contracts SHALL include create, update, list, detail, and delete behavior
- **AND** deletion SHALL target one product by stable product identifier

#### Scenario: Delete contract does not require reference checks

- **WHEN** a product deletion contract is defined
- **THEN** it SHALL NOT require checking whether the product is referenced by traffic works, tasks, strategies, or historical contexts
- **AND** deletion SHALL remain scoped to product-owned metadata and content artifacts

### Requirement: Product contracts SHALL define creation and update behavior

The system SHALL define top-level API and SQL contracts for creating, updating, and deleting products. A product contract MUST treat product name as a readable business attribute rather than a uniqueness key.

#### Scenario: Product creation contract allows non-unique names

- **WHEN** product contracts are defined for product creation
- **THEN** the contracts SHALL require a stable product identifier independent from product name
- **AND** the contracts SHALL NOT require product name uniqueness as a validation rule

#### Scenario: Product update contract preserves product semantics

- **WHEN** product contracts are defined for product update
- **THEN** the contracts SHALL allow updating product name and product content
- **AND** the updated product SHALL remain a single stable product object identified by its product identifier

#### Scenario: Product deletion removes product-owned data

- **WHEN** product contracts are defined for product deletion
- **THEN** the contracts SHALL require product metadata to be removed
- **AND** the contracts SHALL require the associated product content file to be removed

