## 1. Top-Level Contract Alignment

- [x] 1.1 Update `docs/sql/tasks.sql` to redefine task input storage semantics as execution input prompt text, including compatibility notes for the existing `input_needs_json` column.
- [x] 1.2 Update `docs/api/tasks.yaml` so task draft, task summary, and task detail contracts describe the execution input field as prompt text rather than a structured array.
- [x] 1.3 Update `docs/design/domain/Cybernomads任务领域设计文档.md` to replace input-need-set language with Agent input prompt semantics.
- [x] 1.4 Sync the main OpenSpec specs under `openspec/specs/task-contracts/`, `openspec/specs/task-module-runtime/`, and `openspec/specs/agent-task-skills/` with the new prompt-oriented contract.

## 2. Task Module Runtime Refactor

- [x] 2.1 Refactor task domain types and service validation in `src/modules/tasks/**` so task input is modeled and validated as a non-empty prompt string.
- [x] 2.2 Update `src/adapters/storage/sqlite/tasks-sqlite-repository.ts` to persist prompt text for new writes and provide compatibility reads for historical array-shaped values.
- [x] 2.3 Update runtime SQL asset `runtime-assets/sql/008-tasks.sql` to align bootstrap schema defaults and comments with the prompt-oriented model.

## 3. Controlled Tooling And Skill Asset Updates

- [x] 3.1 Update task decomposition support validation and related scripts so task-set writes require execution input prompt text instead of `name/description/source` objects.
- [x] 3.2 Update `runtime-assets/agent/skills/cybernomads-task-decomposition/**` so decomposition guidance, templates, self-check rules, and examples all produce execution input prompts.
- [x] 3.3 Update `runtime-assets/agent/skills/cybernomads-task-execution/**` so execution guidance treats the task input field as the primary input acquisition prompt.
- [x] 3.4 Ensure runtime-installed agent assets are refreshed or re-copied so the product no longer consumes stale array-based task input rules.

## 4. Tests And Verification

- [x] 4.1 Update unit and integration tests across task module, task decomposition support tools, traffic work flow, and skill asset coverage to use the prompt-oriented input contract.
- [x] 4.2 Add or update compatibility tests proving historical array-shaped input values can still be read safely as execution input prompts.
- [x] 4.3 Run targeted verification for task decomposition creation, task detail reads, and task execution input consumption to confirm end-to-end semantic consistency.
