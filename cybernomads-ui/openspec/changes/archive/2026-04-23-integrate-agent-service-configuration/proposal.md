## Why

The Console and OpenClaw configuration pages currently still express the older mock-era "multiple agent nodes" mental model, while the backend contracts now define a single current active Agent service with explicit configuration, verification, and capability provisioning states. This change is needed now so the first-entry setup path can become a real backend-backed business flow instead of a visual-only configuration screen.

## What Changes

- Reposition the Console page layout so `/console` is the clear first-entry command surface, with Agent service readiness shown as the primary setup gate rather than a card grid of interchangeable agent nodes.
- Reframe `/console/openclaw` as the focused configuration flow for the current active Agent service, limited to fields supported by `docs/api/agent-services.yaml`: provider code, endpoint URL, authentication kind, and secret input.
- Replace mock/provider-private OpenClaw controls such as install path, gateway-specific labels, parallel limit, node switching, and add-agent affordances with backend contract-backed state and actions.
- Align the user journey to the business sequence: read current status, create or update current service, require explicit connection verification, allow capability provisioning only after connection is usable, then return to Console with refreshed status.
- Ensure Console and OpenClaw pages call the documented Agent Services endpoints only, handle 404/409/400/recoverable request errors, and never silently fall back to mock runtime data.
- Preserve the approved high-fidelity CyberNomads visual language while correcting layout placement, state hierarchy, and action priority for the setup workflow.

## Capabilities

### New Capabilities
- `frontend-agent-service-configuration`: Covers the detailed frontend behavior for configuring, verifying, provisioning, and presenting the current active Agent service through the Console and OpenClaw focused flow.

### Modified Capabilities
- `frontend-core-workflows`: Tighten the first-entry setup workflow around the backend-defined current Agent service state machine.
- `frontend-information-architecture`: Clarify Console placement and remove multi-agent top-level or secondary affordances from the MVP setup path.
- `frontend-real-backend-runtime`: Require exact Agent Services API usage, error handling, and no mock fallback for Console/OpenClaw runtime behavior.
- `frontend-visual-fidelity`: Preserve the approved shell system while correcting the Console and OpenClaw page composition for the real business flow.

## Impact

- Affected frontend pages: `src/pages/console/ui/ConsolePage.vue`, `src/pages/agents/openclaw/ui/OpenClawConfigPage.vue`.
- Affected frontend API/domain code: `src/entities/agent/api/agent-service.ts`, `src/entities/agent/model/types.ts`, `src/entities/console/api/console-service.ts`, and related tests or fixtures.
- Affected routing/shell behavior: `/console` remains the default outer-shell entry; `/console/openclaw` remains a focused child flow under Console.
- Backend/API dependency: `docs/api/agent-services.yaml` and `docs/sql/agent-services.sql` are sufficient for this frontend proposal; no API or SQL changes are requested.
