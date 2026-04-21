## 1. Frontend Information Architecture

- [x] 1.1 Align `cybernomads-ui` routes to the five top-level modules and add child routes for workspace execution, task intervention, resource editors, and agent configuration
- [x] 1.2 Create or reorganize page directories under `src/pages` so module structure matches the approved page hierarchy
- [x] 1.3 Add navigation context patterns for child pages, including breadcrumb or equivalent parent-return affordances

## 2. Shared Domain Models And Mock Runtime

- [x] 2.1 Define shared entity types for workspace, asset, strategy, account, agent node, task run, and intervention record
- [x] 2.2 Add a shared mock runtime and API adapter layer that serves list, detail, editor, execution, and intervention views
- [x] 2.3 Implement mock scenario switching for empty, populated, editing, running, and failure states

## 3. Core Workflow Page Shells

- [x] 3.1 Build the Workspaces module shells for list, create flow, execution view, and task intervention entry
- [x] 3.2 Build the Assets, Strategies, and Accounts module shells with list-to-editor or list-to-detail transitions
- [x] 3.3 Build the Agents module shells for overview, first-run empty state, and OpenClaw configuration flow

## 4. Execution And Interaction Flows

- [x] 4.1 Wire the first-entry setup flow so missing agent or account prerequisites redirect users into the required module path
- [x] 4.2 Wire the workspace creation flow from resource selection into the workspace execution view
- [x] 4.3 Wire execution-view interactions for task progress, runtime logs, and task intervention submission using mock data

## 5. Verification And Documentation Alignment

- [x] 5.1 Add tests for at least one first-entry path, one resource preparation path, and one workspace execution path
- [x] 5.2 Verify the implemented structure matches `docs/spec/Cybernomads前端开发规范.md` and `docs/design/Cybernomads前端页面整合设计文档.md`
- [x] 5.3 Update any affected frontend documentation if implementation decisions refine route names or page ownership
