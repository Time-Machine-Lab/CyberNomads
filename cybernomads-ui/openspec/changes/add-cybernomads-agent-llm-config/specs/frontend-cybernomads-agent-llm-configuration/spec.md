## ADDED Requirements

### Requirement: Frontend SHALL provide a Cybernomads Agent LLM configuration entry

The frontend SHALL expose a dedicated entry for configuring the LLM provider used by Cybernomads Agent planning and Review, separate from the OpenClaw executor configuration entry.

#### Scenario: User sees separate Agent capability entries

- **WHEN** the user opens the Agent overview or Console setup area after the backend contract supports Cybernomads Agent LLM configuration
- **THEN** the frontend SHALL show Cybernomads Agent LLM as the planning / Review provider configuration entry
- **AND** it SHALL show OpenClaw as the task execution provider configuration entry
- **AND** it SHALL NOT describe the LLM provider as replacing OpenClaw execution

#### Scenario: User opens Cybernomads Agent LLM setup

- **WHEN** the user activates the Cybernomads Agent LLM configuration entry
- **THEN** the frontend SHALL navigate to a dedicated focused setup page for Cybernomads Agent LLM configuration
- **AND** the page SHALL NOT reuse OpenClaw-specific labels, examples, or provider descriptions

### Requirement: Frontend SHALL collect the minimum GPT-compatible provider fields

The Cybernomads Agent LLM setup page SHALL collect only the minimum fields required for the first GPT-compatible provider setup.

#### Scenario: User fills initial LLM provider configuration

- **WHEN** the user opens the Cybernomads Agent LLM setup page
- **THEN** the form SHALL provide inputs for Base URL, Model, Reasoning Effort, and API Key
- **AND** it SHALL make Base URL, Model, Reasoning Effort, and API Key required for first-time save

#### Scenario: User submits configuration only through documented API

- **WHEN** the user saves Cybernomads Agent LLM configuration
- **THEN** the frontend SHALL call only the backend endpoint and request body documented in `../../docs/api/agent-services.yaml`
- **AND** if that document does not yet define Cybernomads Agent LLM fields and endpoint semantics, production submission SHALL remain blocked rather than inventing a request shape

### Requirement: Frontend SHALL protect Cybernomads Agent LLM API keys

The frontend SHALL treat Cybernomads Agent LLM API Key as a write-only credential.

#### Scenario: Existing LLM credential is already stored

- **WHEN** the backend status response indicates that a Cybernomads Agent LLM credential exists
- **THEN** the frontend SHALL show that the credential is stored
- **AND** it SHALL NOT populate the API Key input with the raw key or a masked placeholder intended for resubmission

#### Scenario: User updates LLM provider without replacing credential

- **WHEN** the user edits non-secret LLM provider fields while a credential already exists
- **THEN** the frontend SHALL NOT submit a placeholder API Key
- **AND** it SHALL require the user to explicitly choose credential replacement before sending a new API Key, according to the documented backend contract

#### Scenario: User tries to create LLM provider without API key

- **WHEN** no Cybernomads Agent LLM credential exists and the user tries to save without an API Key
- **THEN** the frontend SHALL block submission locally
- **AND** it SHALL show a recoverable validation message

### Requirement: Frontend SHALL present LLM provider setup as a staged flow

The Cybernomads Agent LLM setup page SHALL follow the same business-stage pattern as OpenClaw setup: save configuration, verify connection, and prepare or confirm capability readiness.

#### Scenario: User saves LLM provider configuration

- **WHEN** the user submits a valid Cybernomads Agent LLM configuration through the documented API
- **THEN** the frontend SHALL show the returned configuration state as requiring explicit connection verification when the backend marks it pending verification
- **AND** it SHALL NOT treat save success alone as ready for task decomposition

#### Scenario: User verifies LLM provider connection

- **WHEN** the user activates connection verification for Cybernomads Agent LLM
- **THEN** the frontend SHALL call only the documented connection verification API for that provider purpose
- **AND** it SHALL display connection status, verification time, and any returned reason

#### Scenario: User prepares LLM provider capability

- **WHEN** the Cybernomads Agent LLM provider is connected and the user activates capability preparation
- **THEN** the frontend SHALL call only the documented capability preparation API for that provider purpose
- **AND** it SHALL display capability status, prepared time when available, and any returned reason

### Requirement: Frontend SHALL keep implementation blocked until backend contracts exist

The frontend SHALL not implement production API submission for Cybernomads Agent LLM configuration until the top-level API and SQL contracts define the necessary provider fields and storage semantics.

#### Scenario: API contract is missing LLM provider fields

- **WHEN** `../../docs/api/agent-services.yaml` does not define Cybernomads Agent LLM configuration fields such as Model and Reasoning Effort
- **THEN** implementation tasks that send production configuration requests SHALL be marked as dependent on backend contract updates
- **AND** the frontend SHALL NOT add undocumented request fields to existing Agent Services calls

#### Scenario: SQL contract is missing provider-purpose or model configuration storage

- **WHEN** `../../docs/sql/agent-services.sql` does not define how Cybernomads Agent LLM configuration is stored
- **THEN** frontend implementation SHALL treat status and model display work as dependent on backend contract updates
- **AND** it SHALL NOT create a frontend-only data model that implies unsupported backend persistence
