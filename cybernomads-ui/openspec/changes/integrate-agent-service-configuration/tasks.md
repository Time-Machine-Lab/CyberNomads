## 1. Agent Service API Model Alignment

- [x] 1.1 Review `docs/api/agent-services.yaml` and remove frontend-only Agent service request fields from production create/update flows.
- [x] 1.2 Refactor `src/entities/agent/model/types.ts` so OpenClaw setup form state is separated from documented Agent Services DTOs.
- [x] 1.3 Update `src/entities/agent/api/agent-service.ts` to submit only `providerCode`, `endpointUrl`, and `authentication` for create/update requests.
- [x] 1.4 Ensure `GET /api/agent-services/current`, `GET /api/agent-services/current/status`, 404, 409, and 400 responses are mapped into recoverable UI states.
- [x] 1.5 Remove placeholder secret submission such as masked credentials or development fallback tokens from production save/update paths.

## 2. Console Current-Service Layout

- [x] 2.1 Rebuild `/console` around a single current Agent service readiness panel instead of a multi-agent card grid.
- [x] 2.2 Render distinct Console states for not configured, pending verification, connected/not ready, ready, connection failed, and preparation failed.
- [x] 2.3 Keep `/console` in the outer shell and preserve the approved CyberNomads sidebar and visual language.
- [x] 2.4 Remove or hide MVP-inaccurate add-agent, switch-agent, route-agent, and failover controls from the Console setup path.
- [x] 2.5 Connect Console primary and recovery actions to `/console/openclaw` with clear Chinese copy for the next required step.

## 3. OpenClaw Focused Configuration Flow

- [x] 3.1 Rebuild `/console/openclaw` form fields around endpoint URL, authentication kind, and secret or credential replacement input.
- [x] 3.2 Load existing current service state and show `hasCredential` without populating or logging a stored secret.
- [x] 3.3 Implement save behavior with `POST /api/agent-services/current` for no current service and `PUT /api/agent-services/current` for existing current service.
- [x] 3.4 Keep the user on the OpenClaw page after save and show verification as the next required step when status is `pending_verification`.
- [x] 3.5 Implement explicit connection verification through `POST /api/agent-services/current/connection-verification`.
- [x] 3.6 Enable capability preparation only when the service is usable and call `POST /api/agent-services/current/capability-provisioning`.
- [x] 3.7 Show returned timestamps, reasons, connection status, capability status, and retry actions in the diagnostics/result area.
- [x] 3.8 Preserve the focused-shell layout with contextual return to Console and no global sidebar.

## 4. Error Handling and UX Guardrails

- [x] 4.1 Add local validation for endpoint URL, authentication kind, and required secret on new service creation.
- [x] 4.2 Handle create conflict by refreshing current service status and moving the form into update mode.
- [x] 4.3 Display connection failure separately from capability preparation failure.
- [x] 4.4 Ensure backend/network errors produce retryable UI states and never trigger mock fallback.
- [x] 4.5 Clarify in UI copy that `connected` means usable while `ready` means CyberNomads capabilities are prepared.

## 5. Verification

- [x] 5.1 Add or update request-stub tests for Console states backed by `GET /api/agent-services/current/status`.
- [x] 5.2 Add or update tests for OpenClaw create, update, verify, provision, 400, 404, and 409 paths.
- [x] 5.3 Run type checking and linting for `cybernomads-ui`.
- [x] 5.4 Run a real backend or contract-stub smoke test for the complete flow: unconfigured -> save -> verify -> provision -> Console refresh.
- [x] 5.5 Confirm no production page or entity API imports `@/shared/mocks/runtime` for Agent service behavior.
