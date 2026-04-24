# product-contracts Specification

## Purpose
Define the top-level API and SQL contracts for the product module so later implementation work has a stable source of truth.

## Requirements

### Requirement: Product contracts SHALL define creation and update behavior
The system SHALL define top-level API and SQL contracts for creating and updating products. A product contract MUST treat product name as a readable business attribute rather than a uniqueness key.

#### Scenario: Product creation contract allows non-unique names
- **WHEN** product contracts are defined for product creation
- **THEN** the contracts SHALL require a stable product identifier independent from product name
- **AND** the contracts SHALL NOT require product name uniqueness as a validation rule

#### Scenario: Product update contract preserves product semantics
- **WHEN** product contracts are defined for product update
- **THEN** the contracts SHALL allow updating product name and product content
- **AND** the updated product SHALL remain a single stable product object identified by its product identifier

### Requirement: Product contracts SHALL separate summary and detail views
The system SHALL define product list behavior as a summary view and product detail behavior as a full-content view.

#### Scenario: Product list returns summary information
- **WHEN** product list contracts are defined
- **THEN** the contracts SHALL require the list response to return summary information for selection and display
- **AND** the list response SHALL NOT require complete markdown content for every product

#### Scenario: Product detail returns full markdown content
- **WHEN** product detail contracts are defined
- **THEN** the contracts SHALL require the detail response to return the complete product markdown content
- **AND** the detail response SHALL be sufficient for downstream consumers that need full product context

### Requirement: Product contracts SHALL define deletion behavior
The system SHALL define product deletion behavior as part of the top-level API and SQL contracts.

#### Scenario: Delete contract is published
- **WHEN** top-level product contracts are updated
- **THEN** the published API contracts SHALL include create, update, list, detail, and delete behavior
- **AND** deletion SHALL target one product by stable product identifier

#### Scenario: Delete contract removes product-owned data
- **WHEN** product deletion contracts are defined
- **THEN** the contracts SHALL require product metadata to be removed
- **AND** the contracts SHALL require the associated product content file to be removed

#### Scenario: Delete contract does not require reference checks
- **WHEN** a product deletion contract is defined
- **THEN** it SHALL NOT require checking whether the product is referenced by traffic works, tasks, strategies, or historical contexts
- **AND** deletion SHALL remain scoped to product-owned metadata and content artifacts

### Requirement: Product contracts SHALL align with product domain semantics
The system SHALL ensure product top-level contracts reflect the current product domain design, where product exists to define and provide product semantics for later strategy and traffic work consumption.

#### Scenario: SQL contract matches thin product domain
- **WHEN** the SQL contract is created
- **THEN** it SHALL define only the minimal data structure needed for product identity, summary information, and full content association
- **AND** it SHALL NOT introduce draft, publish, archive, or version-chain behavior

#### Scenario: API contract supports full product context consumption
- **WHEN** the API contract is created
- **THEN** it SHALL make product detail usable as the current full product context source
- **AND** it SHALL avoid requiring a separate external context endpoint in MVP
