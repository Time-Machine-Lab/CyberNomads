## Context

Agent interactions currently flow through a small set of backend boundaries:

- `AgentAccessService` creates provider sessions and submits task planning, task decomposition, and task execution requests.
- `OpenClawAgentProvider` normalizes provider sessions, message submission, conversation history, and subagent invocation.
- `AgentAccessTrafficWorkContextPreparationAdapter` submits task decomposition prompts after a traffic work context exists.
- `ThreadTaskPlanner` dispatches executable tasks to Agent execution.
- `TaskDecompositionSupportToolsService` receives controlled Agent tool calls for resource copy, task-set persistence, and preparation status reporting.

Task execution currently waits for an Agent response and can retrieve provider history immediately. Task decomposition is intentionally fire-and-forget: the backend submits the prompt and considers the request accepted when OpenClaw returns a run id, while later task creation happens through controlled tools. The logging design must respect that split instead of reintroducing blocking waits into traffic work creation.

## Goals / Non-Goals

**Goals:**

- Persist readable `.logs` files under the backend `logs/` directory.
- Capture key Agent interaction information for task decomposition and task execution: request input, session metadata, skill references, tool calls, provider history snapshots when available, output summaries, and concise reasoning or decision summaries.
- Keep logging non-blocking and best-effort, so logging failure never changes task, traffic work, or Agent service behavior.
- Make logging configurable, enabled by default for local development and disableable for environments that do not want local trace files.
- Correlate logs with domain identifiers such as `trafficWorkId`, `taskId`, `sessionId`, and provider run/message ids.

**Non-Goals:**

- Do not add a database table for logs.
- Do not add a log viewing API or frontend log console in this change.
- Do not capture raw hidden chain-of-thought. The log may include only observable assistant text, explicit provider history, or a concise decision summary derived from observable events.
- Do not change task-set, task status, traffic work lifecycle, or Agent provider contracts.
- Do not require OpenClaw-specific log semantics above the provider adapter boundary.

## Decisions

### Use A Dedicated Agent Interaction Log Recorder

Introduce a small logging abstraction that receives structured interaction events and writes them to files. The recorder should be injected into services that already know the domain context, rather than having every module open files directly.

Alternative considered: add ad hoc `appendFile` calls inside each Agent-related service. This was rejected because it would duplicate formatting, redaction, toggle checks, and failure isolation.

### Store Domain-Correlated `.logs` Files

Use deterministic file locations under `cybernomads-backend/logs`, such as:

- `logs/traffic-works/<trafficWorkId>.logs` for task decomposition and preparation traces.
- `logs/tasks/<taskId>.logs` for task execution traces.

Each file can contain multiple attempts in chronological order. This avoids needing a new SQL log reference and keeps repeated traffic work updates or task executions easy to inspect in one place.

Alternative considered: one global append-only Agent log. This was rejected because it becomes noisy quickly and makes AI-assisted diagnosis harder.

### Write Structured Text Blocks Instead Of Raw JSON Only

Use an append-only, markdown-like text format with explicit event blocks:

- interaction start
- input
- skill reference
- tool call
- reasoning summary or decision note
- provider history snapshot
- output or completion
- error

Each block should include timestamp, event type, correlation ids, and a concise payload. Payloads may include fenced JSON for structured data when useful, but the overall file should remain readable to humans and AI.

Alternative considered: JSON Lines only. This is easier for strict machine parsing but less pleasant for direct debugging, which is the primary MVP use case.

### Treat Decomposition Logs As Multi-Stage Traces

Task decomposition submission must log immediately after the Agent request is accepted, but it should not wait for the Agent to finish. Later controlled tool calls, such as batch task save and preparation status reporting, append to the same traffic work log. Provider history snapshots should be appended when they are naturally available, but the log must still be useful if only submission and tool events are observable.

Alternative considered: wait for the provider run to complete before returning traffic work creation. This was rejected because it conflicts with the current fire-and-forget decomposition flow.

### Treat Task Execution Logs As Request/History Snapshots

Task execution currently waits for provider completion and fetches history. The log should capture the submitted task execution input, task execution Skill reference, provider session/run ids, normalized history, output text, and final submission result.

Alternative considered: only log planner decisions. This was rejected because it would not preserve the conversation needed to debug Agent behavior.

### Redact Sensitive Values At The Sink Boundary

The recorder should sanitize obvious secrets before writing, including credential fields, authorization headers, bearer tokens, and configured Agent service secrets. Redaction belongs at the logging boundary so all upstream services can use the same safety behavior.

Alternative considered: rely on callers to avoid passing secrets. This was rejected because log safety should not depend on every call site remembering the same rules.

## Risks / Trade-offs

- [Risk] OpenClaw may not expose complete tool-call arguments or internal reasoning through `chat.history` -> Mitigation: log normalized provider history when available and append backend-observed controlled tool events separately.
- [Risk] Decomposition logs may be partial because decomposition is asynchronous -> Mitigation: log accepted submission immediately and append later traffic-work tool events by `trafficWorkId`.
- [Risk] Local log files may grow over time -> Mitigation: keep this change focused on deterministic files and a disable switch; add retention or rotation in a later change if needed.
- [Risk] Redaction may remove details that would help debugging -> Mitigation: preserve correlation ids, event names, file paths, status values, and summaries while masking only sensitive value patterns.
- [Risk] Logging I/O failures could destabilize the runtime -> Mitigation: catch recorder failures and surface them only through diagnostics or test assertions, never through business flow errors.

## Migration Plan

- Add the recorder and config default without changing existing persisted data.
- Ensure the `logs/` directory is created lazily when logging is enabled.
- Wire call sites gradually: request submission first, controlled decomposition tools second, task execution history last.
- Existing traffic works and tasks do not need migration; they simply start producing logs on future Agent interactions.
- Rollback is safe by disabling logging or removing the injected recorder, because no business state depends on log files.

## Open Questions

- Should a later change add a read-only API for retrieving `.logs` files from the frontend?
- Should local logs have a retention or rotation policy after MVP validation?
- Can OpenClaw expose richer provider events in the future so tool invocation details become more complete than normalized `chat.history` allows today?
