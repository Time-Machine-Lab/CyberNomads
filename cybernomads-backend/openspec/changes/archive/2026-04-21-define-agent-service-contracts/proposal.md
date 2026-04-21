## Why

Cybernomads 已经完成 Agent 服务接入域的领域设计，但后端还没有这个领域的顶层契约文档。当前既没有定义“如何配置唯一激活的外部 Agent 服务”，也没有定义“如何验证连接、查看状态、触发能力准备”，这会让后续实现缺少稳定边界。

按照项目宪法，任何涉及接口和存储的实现都应先落到 `docs/api/` 与 `docs/sql/` 作为单一真理。因此需要先把 Agent 服务接入域的对外契约和最小持久化语义固定下来，再进入运行时模块和 OpenClaw 适配实现。

## What Changes

- 新增 Agent 服务接入域的顶层 API 契约文档，覆盖当前 Agent 服务配置、连接校验、状态查询、能力准备等行为。
- 新增 Agent 服务接入域的顶层 SQL 契约文档，定义当前唯一激活 Agent 服务所需的最小持久化结构。
- 明确 MVP 只允许系统存在一个当前激活的外部 Agent 服务，不支持多服务并行接入和路由。
- 明确“连接成功即可视为当前可用状态”，当前阶段不额外拆出独立的“可执行”用户态。
- 明确“能力准备”是接入域的业务语义，而不是把具体 Skill 安装动作暴露为顶层业务契约。
- 明确当前阶段不提供多服务容灾、自动恢复、失败重试和 provider 专属字段语义。

## Capabilities

### New Capabilities
- `agent-service-contracts`: 定义 Agent 服务接入域的顶层 API/SQL 契约与对外可见行为边界。

### Modified Capabilities
None.

## Impact

- Affected docs:
  - `docs/api/` 下新增 Agent 服务接入域接口契约文档
  - `docs/sql/` 下新增 Agent 服务接入域存储契约文档
- Affected systems:
  - Agent 服务接入模块未来的 HTTP Controller 边界
  - Agent 服务接入模块未来的 SQLite 持久化结构
  - 后续 OpenClaw 等 provider 适配实现的输入输出约束
- Affected behavior:
  - 系统只维护一个当前激活的 Agent 服务
  - 用户可以配置、校验并查看当前 Agent 服务状态
  - 系统可以触发并记录能力准备状态
