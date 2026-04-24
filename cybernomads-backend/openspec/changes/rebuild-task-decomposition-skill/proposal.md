## Why

当前 `cybernomads-task-decomposition` Skill 已经不足以承载新的任务拆分职责。它需要从“给 Agent 一点拆分提示”升级为“围绕引流工作上下文、资源识别、任务落地、自检收口”的正式运行时 Skill，而且这次还明确要求使用中文编写与提示，并遵循 `skill-creator` 工作流统一创建和维护。

## What Changes

- 重建 `cybernomads-task-decomposition` Skill，并明确使用 `skill-creator` 工作流进行创建或重建。
- 将任务拆分 Skill 的主体说明统一改为中文，确保 Agent 在任务拆分时优先使用中文理解业务语义和执行约束。
- 重写任务拆分 Skill 的核心流程，覆盖引流工作上下文理解、资源识别、任务拆分、数据协作、上下文准备和自检收口。
- 为任务拆分 Skill 增补必要的 references 资料，避免把复杂规则全部挤进单个 `SKILL.md`。
- 同步更新现有 `agent-task-skills` capability，使其明确区分“Skill 外壳提示词”和“Skill 内部详细规则”的职责边界。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `agent-task-skills`: 更新任务拆分 Skill 的创建方式、语言约束、工作流结构、自检要求和上下文准备职责。

## Impact

- `runtime-assets/agent/skills/cybernomads-task-decomposition/`
- 可能同步清理或废弃旧的 `runtime-assets/skills/cybernomads-task-decomposition/` 副本
- `cybernomads-backend/openspec/specs/agent-task-skills/spec.md`
