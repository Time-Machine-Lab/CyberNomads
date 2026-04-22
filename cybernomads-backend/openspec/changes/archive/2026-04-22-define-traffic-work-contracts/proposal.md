## Why

当前 Cybernomads 已经有产品域、Agent 服务接入域的顶层契约，但引流工作域还停留在领域设计文档层面，缺少与实现直接对接的 API 契约、SQL 契约和 OpenSpec 主规格。这会让后续后端实现、前端联调和 Agent 上下文准备都建立在口头约定上，风险较高。

## What Changes

- 新增引流工作域的顶层 API 契约，覆盖创建、列表、详情、启动、暂停、更新、结束、归档、删除和上下文准备状态读取语义。
- 新增引流工作域的顶层 SQL 契约，定义“当前绑定关系 + 生命周期状态 + 上下文准备状态”的最小结构化存储边界。
- 新增引流工作域的主 OpenSpec 能力规格，使行为要求可回溯到领域设计文档。
- 明确本期不把任务字段、调度算法、日志明细和平台脚本细节混入引流工作契约。

## Capabilities

### New Capabilities
- `traffic-work-contracts`: 定义引流工作域的顶层 API / SQL / 规格契约，建立后续运行时实现的单一事实来源。

### Modified Capabilities
- None.

## Impact

- `docs/api/traffic-works.yaml`
- `docs/sql/traffic-works.sql`
- `openspec/specs/traffic-work-contracts/spec.md`
- 未来引流工作运行时实现将以这组契约为前置依赖
