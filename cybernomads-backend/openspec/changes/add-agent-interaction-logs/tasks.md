## 1. Logging Foundation

- [x] 1.1 Add an Agent interaction log recorder abstraction and a file-system implementation that writes `.logs` files under the backend `logs/` directory.
- [x] 1.2 Add runtime configuration for enabling or disabling Agent interaction logging, with local development defaulting to enabled.
- [x] 1.3 Implement the structured log format, including chronological event blocks, correlation ids, timestamps, event type, and concise payload sections.
- [x] 1.4 Implement shared sanitization helpers for credential-like, authorization-like, and bearer-token-like values before log content reaches disk.

## 2. Agent Flow Instrumentation

- [x] 2.1 Inject the recorder through application startup so Agent-facing services can log without directly depending on file-system details.
- [x] 2.2 Instrument `AgentAccessService` to log task planning, task decomposition, and task execution submission events, including session ids, provider message ids, skill references, and errors.
- [x] 2.3 Instrument task execution completion handling to append normalized provider history, output text, and completion summaries when `sendMessage` returns history.
- [x] 2.4 Instrument `AgentAccessTrafficWorkContextPreparationAdapter` to write traffic-work-scoped decomposition prompt context, runtime path hints, and task decomposition Skill references.
- [x] 2.5 Instrument `ThreadTaskPlanner` to append task-scoped dispatch decisions and submission failures without changing planner status behavior.

## 3. Controlled Tool And Provider Trace Coverage

- [x] 3.1 Instrument `TaskDecompositionSupportToolsService` to append traffic-work-scoped events for resource copy, batch task save, and preparation status reporting.
- [x] 3.2 Preserve normalized OpenClaw `tool` role messages and provider-visible history fields so log snapshots can show tool usage when the provider exposes it.
- [x] 3.3 Ensure logging remains provider-neutral above the adapter boundary and does not expose OpenClaw-specific payloads as business-level contracts.
- [x] 3.4 Ensure logging failures are caught and isolated in every instrumentation point so main Agent and tool flows still return their original result.

## 4. Verification

- [x] 4.1 Add unit tests for log formatting, deterministic file naming, redaction, and disabled logging behavior.
- [x] 4.2 Add tests proving task decomposition submission creates a traffic-work `.logs` entry and controlled tool events append to the same traffic-work log.
- [x] 4.3 Add tests proving task execution creates a task `.logs` entry containing input, skill reference, provider history/output when available, and no unredacted secrets.
- [x] 4.4 Add tests proving simulated log write failures do not fail Agent submission, task execution, or controlled task-decomposition tools.
- [x] 4.5 Run `npm run typecheck` and the relevant targeted tests, then run `npm test` if the local test suite is available.
