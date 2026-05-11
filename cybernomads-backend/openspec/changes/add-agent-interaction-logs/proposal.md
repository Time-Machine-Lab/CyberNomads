## Why

Cybernomads now has working Agent-facing flows for task decomposition and task execution, but the interactions are only visible indirectly through provider behavior and task state changes. When something goes wrong, there is no durable, readable trace of what was sent, what the Agent decided, which tools or skills were used, or how the flow ended.

## What Changes

- Add a new file-based Agent interaction logging capability under `cybernomads-backend/logs`.
- Record only key interaction data: input, concise reasoning summary, outputs, tool calls, and skill references.
- Keep logs in `.logs` files with a clear chronological structure that is easy for developers and AI to inspect.
- Make logging best-effort and non-blocking so Agent orchestration and task execution are never delayed by log writes.
- Add a config switch so logging can be disabled, while keeping it enabled by default in local development.
- Wire logging into the Agent access path, task decomposition submission path, task execution dispatch path, and the controlled task-decomposition support tool path.
- Avoid introducing a database-backed log model or a new UI in this change.

## Capabilities

### New Capabilities
- `agent-interaction-logs`: file-based, non-blocking logging for Agent decomposition and execution interactions, including summarized conversation flow and tool usage traces.

### Modified Capabilities
- None. This change adds a new logging capability without changing the published behavior contracts of existing capabilities.

## Impact

- Backend runtime services that submit or consume Agent interactions, especially `AgentAccessService`, `ThreadTaskPlanner`, and the traffic-work task decomposition support tools.
- OpenClaw adapter integration, because log capture needs provider-neutral session context and normalized history snapshots.
- Runtime configuration and filesystem layout, because the backend now needs a dedicated `logs/` location and a toggle for local default-on logging.
- Test coverage for Agent interaction flows, log emission failure isolation, and log content sanitization.
