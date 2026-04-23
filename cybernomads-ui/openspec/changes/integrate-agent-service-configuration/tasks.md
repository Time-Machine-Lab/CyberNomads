## 1. Agent Service API Model Alignment

- [ ] 1.1 Review `docs/api/agent-services.yaml` and remove frontend-only Agent service request fields from production create/update flows.
- [ ] 1.2 Refactor `src/entities/agent/model/types.ts` so OpenClaw setup form state is separated from documented Agent Services DTOs.
- [ ] 1.3 Update `src/entities/agent/api/agent-service.ts` to submit only `providerCode`, `endpointUrl`, and `authentication` for create/update requests.
- [ ] 1.4 Ensure `GET /api/agent-services/current`, `GET /api/agent-services/current/status`, 404, 409, and 400 responses are mapped into recoverable UI states.
- [ ] 1.5 Remove placeholder secret submission such as masked credentials or development fallback tokens from production save/update paths.

## 2. Console Current-Service Layout

- [ ] 2.1 Rebuild `/console` around a single current Agent service readiness panel instead of a multi-agent card grid.
- [ ] 2.2 Render distinct Console states for not configured, pending verification, connected/not ready, ready, connection failed, and preparation failed.
- [ ] 2.3 Keep `/console` in the outer shell and preserve the approved CyberNomads sidebar and visual language.
- [ ] 2.4 Remove or hide MVP-inaccurate add-agent, switch-agent, route-agent, and failover controls from the Console setup path.
- [ ] 2.5 Connect Console primary and recovery actions to `/console/openclaw` with clear Chinese copy for the next required step.

## 3. OpenClaw Focused Configuration Flow

- [ ] 3.1 Rebuild `/console/openclaw` form fields around endpoint URL, authentication kind, and secret or credential replacement input.
- [ ] 3.2 Load existing current service state and show `hasCredential` without populating or logging a stored secret.
- [ ] 3.3 Implement save behavior with `POST /api/agent-services/current` for no current service and `PUT /api/agent-services/current` for existing current service.
- [ ] 3.4 Keep the user on the OpenClaw page after save and show verification as the next required step when status is `pending_verification`.
- [ ] 3.5 Implement explicit connection verification through `POST /api/agent-services/current/connection-verification`.
- [ ] 3.6 Enable capability preparation only when the service is usable and call `POST /api/agent-services/current/capability-provisioning`.
- [ ] 3.7 Show returned timestamps, reasons, connection status, capability status, and retry actions in the diagnostics/result area.
- [ ] 3.8 Preserve the focused-shell layout with contextual return to Console and no global sidebar.

## 4. Error Handling and UX Guardrails

- [ ] 4.1 Add local validation for endpoint URL, authentication kind, and required secret on new service creation.
- [ ] 4.2 Handle create conflict by refreshing current service status and moving the form into update mode.
- [ ] 4.3 Display connection failure separately from capability preparation failure.
- [ ] 4.4 Ensure backend/network errors produce retryable UI states and never trigger mock fallback.
- [ ] 4.5 Clarify in UI copy that `connected` means usable while `ready` means CyberNomads capabilities are prepared.

## 5. Verification

- [ ] 5.1 Add or update request-stub tests for Console states backed by `GET /api/agent-services/current/status`.
- [ ] 5.2 Add or update tests for OpenClaw create, update, verify, provision, 400, 404, and 409 paths.
- [ ] 5.3 Run type checking and linting for `cybernomads-ui`.
- [ ] 5.4 Run a real backend or contract-stub smoke test for the complete flow: unconfigured -> save -> verify -> provision -> Console refresh.
- [ ] 5.5 Confirm no production page or entity API imports `@/shared/mocks/runtime` for Agent service behavior.
