## Why

Agent 服务接入域的领域边界已经明确，但后端运行时还没有真正的接入模块。当前 `src/modules/agent-access/` 仍是空骨架，这意味着系统还无法配置当前 Agent 服务、校验连接、记录状态，也无法为上层引流工作和任务模块提供统一的 Agent 服务接入口。

在顶层契约明确之后，需要一个独立的运行时实现提案把“单服务接入、连接校验、能力准备、统一 provider 抽象”真正落到后端模块中。这样后续的工作区、引流工作和任务模块才能稳定依赖 Agent 服务能力，而不直接依赖 OpenClaw 细节。

## What Changes

- 实现 Agent 服务接入模块的运行时业务能力，覆盖配置当前服务、更新连接信息、校验连接、查询当前状态和触发能力准备。
- 持久化当前唯一激活 Agent 服务的连接配置与接入状态，并与顶层 SQL 契约保持一致。
- 暴露统一的 Agent 服务访问抽象，供上层提交任务规划请求和任务执行请求，而不直接感知具体 provider。
- 为 Agent 服务变更或中断提供明确状态反馈，但当前阶段不引入自动恢复、失败重试和容灾切换。
- 接入 HTTP controller 与应用服务，使前端可完成当前 Agent 服务管理的基本操作。

## Capabilities

### New Capabilities
- `agent-service-access-runtime`: 实现 Agent 服务接入域的后端运行时行为与统一访问抽象。

### Modified Capabilities
None.

## Impact

- Affected code:
  - `src/modules/agent-access/`
  - `src/ports/`
  - `src/app/`
  - 可能涉及 `src/adapters/storage/` 中的持久化实现接入
- Affected docs:
  - 依赖 `docs/api/` 下的 Agent 服务接口契约
  - 依赖 `docs/sql/` 下的 Agent 服务存储契约
- Affected systems:
  - 前端 Agent 接入配置流程
  - 上层模块对当前 Agent 服务的统一调用方式
  - 后续 OpenClaw provider 适配实现
