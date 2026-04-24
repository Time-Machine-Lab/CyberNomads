## Purpose
Define how the Assets module integrates with the backend Product API contracts.

## Requirements

### Requirement: Frontend SHALL load product summaries for the assets list
The frontend SHALL load `/assets` list data from the product list contract when the real product API source is enabled. The list flow MUST call `GET /api/products` as defined in `docs/api/products.yaml`, MUST treat each returned `ProductSummary.productId` as the stable frontend record id, and MUST NOT require complete markdown content from the list response.

#### Scenario: Product list renders summaries from real API
- **WHEN** a user opens `/assets` with real product API mode enabled
- **THEN** the frontend MUST request `GET /api/products`
- **AND** render list cards from the response `items` collection using `productId`, `name`, and `updatedAt`
- **AND** avoid calling product detail endpoints only to populate the list

#### Scenario: Empty product list renders recoverable empty state
- **WHEN** `GET /api/products` returns an empty `items` collection
- **THEN** the frontend MUST render an empty state with a clear path to create a new product from `/assets/new`

### Requirement: Frontend SHALL load full product detail for editing
The frontend SHALL load complete markdown content for `/assets/:assetId/edit` from the product detail contract. The editor flow MUST call `GET /api/products/{productId}` as defined in `docs/api/products.yaml` and MUST map `contentMarkdown` into the editor markdown field.

#### Scenario: Existing product opens in editor
- **WHEN** a user opens `/assets/:assetId/edit` with real product API mode enabled
- **THEN** the frontend MUST request `GET /api/products/{productId}` using the route id as `productId`
- **AND** populate the editor title from `name`
- **AND** populate the markdown editor from `contentMarkdown`

#### Scenario: Missing product renders not-found state
- **WHEN** `GET /api/products/{productId}` returns `404`
- **THEN** the frontend MUST render a not-found or recoverable error state
- **AND** provide a clear path back to `/assets`

### Requirement: Frontend SHALL create and update products through product contracts
The frontend SHALL save `/assets` editor submissions through the product create and update contracts. A new editor submission MUST call `POST /api/products`; an edit submission MUST call `PUT /api/products/{productId}`. Both request bodies MUST include only the fields allowed by the product API contract: `name` and `contentMarkdown`.

#### Scenario: New product is created
- **WHEN** a user submits `/assets/new` with a non-empty name and markdown content in real product API mode
- **THEN** the frontend MUST call `POST /api/products`
- **AND** send a JSON body with `name` and `contentMarkdown`
- **AND** navigate back to `/assets` or show the saved product state after a successful `201` response

#### Scenario: Existing product is updated
- **WHEN** a user submits `/assets/:assetId/edit` with valid fields in real product API mode
- **THEN** the frontend MUST call `PUT /api/products/{productId}` using the route id as `productId`
- **AND** send a JSON body with `name` and `contentMarkdown`
- **AND** preserve the same stable product identity returned by the backend

#### Scenario: Product names are not treated as unique keys
- **WHEN** a user saves a product whose name matches another product
- **THEN** the frontend MUST allow the request to proceed if the backend accepts it
- **AND** continue identifying records by `productId` instead of product name

### Requirement: Frontend SHALL delete products from the assets list through product contracts
The frontend SHALL expose a confirmed delete flow for `/assets` through the documented product delete contract. When a user confirms deletion for an existing asset in real product API mode, the frontend MUST call `DELETE /api/products/{productId}` as defined in `docs/api/products.yaml`, using the selected asset record id as the stable `productId`.

#### Scenario: Confirmed delete removes an existing product
- **WHEN** a user confirms deletion for an asset card on `/assets`
- **THEN** the frontend MUST call `DELETE /api/products/{productId}` for that card's stable id
- **AND** treat a `204` response as successful deletion
- **AND** remove the deleted asset from the rendered list without requiring the user to open the editor first

#### Scenario: Delete request finds a stale asset record
- **WHEN** `DELETE /api/products/{productId}` returns `404` for a selected asset card
- **THEN** the frontend MUST treat the card as no longer available
- **AND** remove the stale asset from the rendered list
- **AND** show a recoverable message that the asset was already deleted or no longer exists

### Requirement: Frontend SHALL handle product API operational states
The frontend SHALL provide observable states around product API requests so users can understand whether data is loading, saving, deleting, empty, missing, invalid, or failed.

#### Scenario: Product list request is in progress
- **WHEN** `/assets` is waiting for `GET /api/products`
- **THEN** the frontend MUST present a loading state that does not look like final empty data

#### Scenario: Product save request fails
- **WHEN** `POST /api/products` or `PUT /api/products/{productId}` fails
- **THEN** the frontend MUST stop the saving state
- **AND** show a recoverable error message without losing the user's current editor input

#### Scenario: Product delete request is in progress
- **WHEN** the frontend is waiting for `DELETE /api/products/{productId}`
- **THEN** the assets list MUST present an in-flight state for the targeted asset action
- **AND** prevent duplicate delete submissions for that asset until the request completes

#### Scenario: Product delete request fails
- **WHEN** `DELETE /api/products/{productId}` fails with a non-`404` error
- **THEN** the frontend MUST stop the deleting state
- **AND** keep the asset visible in the list
- **AND** show a recoverable error message so the user can retry

#### Scenario: Product editor input is invalid
- **WHEN** a user attempts to save with an empty product name or empty markdown content
- **THEN** the frontend MUST prevent the request
- **AND** explain which required field must be completed

### Requirement: Frontend SHALL preserve MVP product scope boundaries
The frontend SHALL align with the product MVP contracts and MUST NOT expose unsupported product operations as backend-persistent behavior. The product UI MAY use the documented delete contract, but it MUST NOT expose restore, archive, version-chain management, publish-state persistence, or backend attachment persistence for this integration.

#### Scenario: Only documented destructive behavior is exposed
- **WHEN** `/assets` runs in real product API mode
- **THEN** the frontend MAY present deletion as a product capability only through `DELETE /api/products/{productId}`
- **AND** it MUST NOT present restore, recycle-bin, archive, or version-recovery actions as completed backend behavior

#### Scenario: UI-only fields are not sent to product API
- **WHEN** the editor saves a product in real product API mode
- **THEN** the frontend MUST NOT include platform, summary, status, category, tags, target labels, attachments, draft state, publish state, or version-chain fields in the product API request body
