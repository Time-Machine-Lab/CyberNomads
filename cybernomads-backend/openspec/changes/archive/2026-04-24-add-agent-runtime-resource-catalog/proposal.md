## Why

任务拆分 Skill 现在需要先理解“当前 Cybernomads 到底有哪些 Agent 资源可用”，但运行时目录里还没有正式的 `Agent资源清单.md`。如果没有这份清单，Agent 只能靠猜测目录结构和人工记忆来决定该复制哪些 Skill，也不利于团队后续新增资源时保持一致。

## What Changes

- 新增运行时 Agent 资源清单能力，在 `runtime-assets/agent/knowledge/` 下提供 `Agent资源清单.md`。
- 明确资源清单使用 markdown 表格记录当前可用 Skill，至少包含 `id`、`skill文件夹名称`、`skill作用` 三列。
- 将“新增 `runtime-assets/agent` 内容时必须同步更新资源清单”的要求写入开发规范文档。

## Capabilities

### New Capabilities

- `agent-runtime-resource-catalog`: 定义 Cybernomads 运行时 Agent 资源清单文件及其最小结构要求。

### Modified Capabilities

- None.

## Impact

- `runtime-assets/agent/knowledge/Agent资源清单.md`
- `docs/spec/Cybernomads后端开发规范文档.md`
- 团队后续新增运行时 Agent 资源时的维护流程
