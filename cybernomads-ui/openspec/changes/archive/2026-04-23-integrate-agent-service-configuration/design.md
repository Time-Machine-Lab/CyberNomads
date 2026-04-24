## Context

The backend Agent service contracts define one current active external Agent service for MVP. The frontend already routes `/` to `/console` and renders `/console/openclaw` as a focused child page, but the current UI still carries a mock-era model: multiple agent node cards, node switching, add-agent actions, provider-private OpenClaw fields, and diagnostics text that does not cleanly reflect the documented API state machine.

The authoritative frontend constraints are:

- `/console` is the first-entry Console module and owns Agent setup states.
- `/console/openclaw` is a focused configuration flow under Console.
- Production runtime data must come from `docs/api/agent-services.yaml`.
- The SQL model in `docs/sql/agent-services.sql` stores exactly one `service_scope = 'current'` record and does not expose secret values back to the frontend.

The backend state model the UI must respect is:

```text
not_configured
  -> POST /api/agent-services/current
  -> pending_verification + not_ready
  -> POST /api/agent-services/current/connection-verification
  -> connected | connection_failed
  -> POST /api/agent-services/current/capability-provisioning
  -> ready | prepare_failed
```

`isUsable` is true when `connectionStatus = connected`; capability readiness is additional business readiness and must not override MVP usability.

## Goals / Non-Goals

**Goals:**

- Make `/console` the correct setup dashboard for the single current Agent service.
- Make `/console/openclaw` a guided OpenClaw configuration flow backed by documented Agent Services API endpoints.
- Remove UI paths that imply multi-agent routing, failover, auto-switching, or provider-private OpenClaw lifecycle management.
- Handle no service, pending verification, connected, connection failed, capability ready, preparing, and prepare failed states explicitly.
- Keep the approved shell and high-fidelity visual direction while correcting content placement and action hierarchy.

**Non-Goals:**

- No backend API or SQL changes.
- No multi-provider service list, service switching, failover, retry scheduler, or automatic recovery.
- No frontend persistence of OpenClaw provider-private fields outside the documented API model.
- No exposure or reuse of stored secret values returned from the backend; the backend only returns `hasCredential`.
- No implementation of task planning or execution through Agent service APIs in this change.

## Decisions

### Decision: Console presents a single-service readiness panel instead of an agent grid

The Console page will load `GET /api/agent-services/current/status` and render one primary setup/readiness panel for the current Agent service. Secondary content can explain the next product steps, but it must not imply users can add, switch, or route among multiple Agent services in MVP.

Alternative considered: keep the existing card grid and disable future providers. This was rejected because disabled multi-agent cards still communicate a false mental model that conflicts with the backend contract.

### Decision: OpenClaw form is provider-neutral at the data boundary

The OpenClaw page will submit:

- `providerCode = "openclaw"`
- `endpointUrl`
- `authentication.kind`
- `authentication.secret`

The page may use OpenClaw-specific copy and visual treatment, but the API adapter must not require install path, gateway URL, parallel limit, node name, or notes because those fields are not in `docs/api/agent-services.yaml`.

Alternative considered: keep extra fields as local-only presentation metadata. This was rejected for this change because it would reintroduce mock state and create confusion over what is actually persisted.

### Decision: Saving, verifying, and provisioning are separate explicit transitions

Saving configuration calls `POST /api/agent-services/current` when no current service exists or `PUT /api/agent-services/current` when one exists. The page then displays the returned `pending_verification` and `not_ready` state and keeps the user in the focused flow. Connection verification is triggered by a separate user action that calls `POST /api/agent-services/current/connection-verification`. Capability provisioning is enabled only after the service is usable and calls `POST /api/agent-services/current/capability-provisioning`.

Alternative considered: save and immediately auto-run verification/provisioning. This was rejected because the backend contract describes verification and provisioning as explicit operations, and separating them makes failure recovery clearer.

### Decision: Secret handling uses blank replacement semantics

When the backend returns an existing service, the form can show `hasCredential` and `authenticationKind`, but it must not populate a fake usable secret value. On update, the UI must require a secret only when creating a new service or when the user chooses to replace credentials. If backend requires `authentication.secret` on every `PUT`, the UI must ask for a new secret before submitting the update.

Alternative considered: send a placeholder such as `********` or `local-development-token`. This was rejected because it can accidentally replace real credentials and violates the API's write-only secret semantics.

### Decision: Status and errors stay recoverable in-page

404 from `GET /api/agent-services/current` or a status response with `hasCurrentService = false` maps to the unconfigured state. 409 on create means a current service already exists, so the UI should refresh current status and switch to update mode. 400 and connection/provisioning failures are shown near the relevant action with the backend reason when available. Network failures show a retryable error state rather than fallback mock data.

Alternative considered: route back to Console on every error. This was rejected because the focused page is where the user has enough context to fix endpoint and credential inputs.

## Risks / Trade-offs

- Credential replacement ambiguity -> Mitigation: treat returned credentials as `hasCredential` only and require explicit new secret entry for create or credential replacement.
- Existing backend may require `secret` on every update -> Mitigation: make the update form validate for a newly entered secret before calling `PUT`, and document this as a frontend contract consequence.
- Users may expect one-click setup -> Mitigation: present the three explicit steps as a compact guided checklist, not as unrelated buttons.
- Console may feel sparse after removing multi-agent cards -> Mitigation: use readiness status, next-step guidance, and MVP setup checklist to preserve information density without false multi-agent affordances.
- Capability readiness is not required for `isUsable` -> Mitigation: visually separate "connection usable" from "CyberNomads capability ready" so users understand both states.

## Migration Plan

1. Replace Console agent card grid behavior with a single current-service status/readiness composition backed by `getCurrentAgentServiceStatus`.
2. Refactor OpenClaw form state and API adapter inputs around the documented Agent Services request and response DTOs.
3. Implement explicit save, verify, and capability preparation actions with recoverable loading/error/result states.
4. Remove provider-private mock fields and disabled future-agent actions from production pages.
5. Add or update request-stub tests for unconfigured, pending verification, connected, connection failed, ready, and prepare failed paths.
6. Verify with the real backend or a contract stub against `docs/api/agent-services.yaml`.

Rollback is limited to frontend behavior: restore the previous page components if needed. No backend migration or data migration is required.

## Open Questions

- Should the final successful capability-ready state return to Console automatically, or should the page show a "Return to Console" confirmation action? The safer default is a confirmation action so users can read the final result.
- Does the current backend `PUT /api/agent-services/current` require a fresh secret for every update, or can unchanged credentials be preserved server-side? The frontend should support the stricter documented shape unless backend adds an explicit preserve-credential contract.
