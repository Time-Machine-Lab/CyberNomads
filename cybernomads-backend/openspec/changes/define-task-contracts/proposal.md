## Why

任务领域已经完成领域设计，但当前项目还没有任务域的 API、SQL 和主规格契约。若直接进入运行时、线程规划器或 Agent Skill 开发，任务状态、执行条件、输入需求、任务归属、任务集创建/替换和产出记录都会缺少统一事实来源。

这份契约还需要补上一个关键点：任务不是用户逐条手工创建，而是 Agent 基于引流工作拆分出的任务集。因此任务域必须定义“按引流工作批量创建/替换任务集”的受控契约，给引流工作创建/更新后的任务拆分流程提供落点。

## What Changes

- 新增任务领域顶层 API 契约，覆盖任务列表、详情、状态更新、产出记录创建与查询。
- 新增任务集批量创建/替换契约，作为 Agent 拆分任务后的受控落库入口。
- 新增任务领域 SQL 契约，定义任务、任务执行条件、输入需求和任务产出记录的最小结构化存储边界。
- 新增任务领域主 OpenSpec capability，明确任务域与引流工作域、Agent 服务域、线程规划器和日志域的边界。
- 明确本期不定义复杂状态机、任务失败重试、手动恢复、平台脚本细节、任务历史归档和产出数据本体结构。

## Capabilities

### New Capabilities
- `task-contracts`: 定义任务领域 API / SQL / OpenSpec 契约，作为任务运行时、任务拆分集成、规划器和 Agent 任务 Skill 协作的前置来源。

### Modified Capabilities
- None.

## Impact

- `docs/api/tasks.yaml`
- `docs/sql/tasks.sql`
- `openspec/specs/task-contracts/spec.md`
- 后续 `tasks` 模块、引流工作任务拆分集成、线程规划器和 Agent 任务 Skill 都应依赖该契约

