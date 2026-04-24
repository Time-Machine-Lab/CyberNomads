## Why

新的任务拆分 Skill 不能只靠自然语言规则闭环，它还依赖一组后端受控工具来安全完成资源准备和任务入库。当前 Cybernomads 缺少明确的“资源拷贝工具”和“批量 task 保存工具”能力定义，这会让任务拆分 Skill 即使重写完成，仍然无法稳定落地。

## What Changes

- 新增任务拆分支撑工具 capability，提供面向 Agent 的受控资源拷贝工具与任务批量保存工具。
- 明确资源拷贝工具只能在运行时 Agent 资源目录和引流工作上下文目录之间工作，并保证跨平台路径兼容。
- 明确任务批量保存工具的受控语义：一次接收一组任务与引流工作 ID，统一校验并返回明确错误原因。
- 补充 task runtime 对“批量任务保存”结果与失败原因的要求，使其适合作为 Agent 工具调用入口。

## Capabilities

### New Capabilities

- `task-decomposition-support-tools`: 定义任务拆分阶段可调用的受控工具，包括资源拷贝与批量任务保存。

### Modified Capabilities

- `task-module-runtime`: 更新任务集写入行为，明确受控批量保存入口应返回清晰的成功结果与失败原因。

## Impact

- `cybernomads-backend/openspec/specs/task-module-runtime/spec.md`
- 新的工具 capability 与其后续运行时实现
- 可能影响 Agent 调用工具的适配层与任务拆分 Skill 集成方式
