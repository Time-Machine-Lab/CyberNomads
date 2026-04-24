## Why

当前运行时目录与引流工作上下文目录，已经和最新的产品运行方式出现偏差：全局运行时缺少面向 Agent 的 `agent/skills` 与 `agent/knowledge` 目录，而单个引流工作目录仍停留在 `scripts/ + task.md` 的旧形态。若不先统一这两层目录语义，后续 Skill、Knowledge、任务拆分与任务执行都会继续建立在不稳定的文件结构上，导致实现和文档持续返工。

## What Changes

- 重构运行时根目录结构，在 `cybernomads/` 下补齐 `agent/skills`、`agent/knowledge`、`product`、`strategy`、`work` 五类固定目录。
- 将后端内置的 Agent 运行时资源从“仅打包在后端工程内”调整为“以 `runtime-assets` 为源，在启动时同步到 `cybernomads/agent/` 下供运行时使用”。
- 调整引流工作上下文目录结构：创建引流工作时预创建 `skills/`、`tools/`、`knowledge/`、`data/` 四类上下文目录，但不再由后端提前写入 `task.md`，任务文档改由 Agent 在任务拆分阶段生成。
- 调整引流工作创建/更新时的上下文准备流程，使 Agent 收到的是一个已经铺好基础目录的工作上下文，并在原工作目录内完成任务文件与补充资产的写入。
- 同步更新架构文档与引流工作领域文档，使文档描述与新的运行时目录、工作上下文目录和创建时机保持一致。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `runtime-bootstrap`: 更新启动阶段的固定运行时目录要求，并新增从 `runtime-assets` 同步全局 Agent 资源到 `cybernomads/agent/` 的行为要求。
- `traffic-work-runtime`: 更新引流工作上下文目录结构与创建时机，明确工作创建时只铺设标准上下文目录，不预写任务文件。
- `traffic-work-task-decomposition-integration`: 更新任务拆分集成行为，明确 Agent 基于预创建的工作上下文生成任务文档和补充资产，而不是由后端先写入单一 `task.md`。

## Impact

- `src/app/bootstrap-runtime.ts`
- `src/adapters/storage/file-system/runtime-paths.ts`
- `src/adapters/storage/file-system/traffic-work-context-store.ts`
- `src/adapters/skill/local/`
- `src/adapters/agent/traffic-work-context-preparation-adapter.ts`
- `runtime-assets/`
- `docs/design/Cybernomads架构设计文档.md`
- `docs/design/domain/Cybernomads引流工作领域设计文档.md`
