# High-Fidelity Review Notes

## Reference Sources

- Shell and workspace creation reference:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_4/screen.png`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_4/code.html`
- Workspace list reference:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_11/screen.png`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_11/code.html`
- Execution console reference:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_6/screen.png`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_6/code.html`
- Agent empty state reference:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_9/screen.png`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_9/code.html`
- OpenClaw configuration reference:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/agent_openclaw/screen.png`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/agent_openclaw/code.html`

## Intentional Deviations

- Final brand raster assets, avatars, and some platform-specific icons were not provided in source form. The current implementation uses local placeholder branding assets under `src/shared/assets/branding/` and the shared `PlaceholderAsset` primitive to preserve composition, weight, and focal balance.
- Reference HTML uses Material Symbols and remote demo assets. The implementation normalizes runtime icons to `lucide-vue-next` plus local SVG placeholders so the app can build offline and keep a single icon pipeline.
- The execution canvas remains a high-fidelity viewer and intervention surface, not a freeform node editor. Zoom, pan, node inspection, log viewing, tab switching, and intervention submission are preserved; drag-to-rewire authoring is intentionally out of scope for this change.

## Desktop Validation Boundary

- Desktop-first breakpoints are enforced in the shell and dense pages at `1360px`, `1200px`, `1180px`, and `1120px` to keep panel balance without collapsing the experience into a mobile layout.
- The shell preserves active module context on child pages and keeps the sidebar collapsible without losing navigation identity.
- Mock scenarios remain the primary fidelity driver for empty, baseline, editing, running, and failure states. Switch scenarios with `VITE_MOCK_SCENARIO` or the in-app mock selector to review page variants.
