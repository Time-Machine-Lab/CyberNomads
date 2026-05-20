## Why

当前任务拆分链路仍然把关键质量责任交给外部 Agent 自由执行：Agent 既理解业务、又拆任务、又调用工具落库，导致任务粒度、依赖关系、产出声明、资源准备和用户反馈重拆都缺少稳定的系统边界。前面已经确认新的方向：Cybernomads 需要拥有自己的 Agent，负责任务拆分、Review 门禁和反馈修正；OpenClaw 收敛为已确认单任务的执行者。

这次 change 的目标是把这个方向从设计文档推进到可实施的 OpenSpec 提案：新增 Cybernomads Agent 供应商接入、建设 Cybernomads Agent Runtime，并同步更新顶层文档。

## What Changes

- 在 Agent 接入模块新增 `cybernomads-agent` 供应商接入，第一版只支持 GPT / OpenAI-compatible Responses API。
- Cybernomads Agent 接入配置要求填写：服务地址、模型、推理强度、API Key；API Key 继续作为 secret 存储和脱敏处理。
- 调整 Agent 接入语义，明确“任务拆分/Review provider”和“任务执行 provider”的职责边界，避免一个 active provider 同时承担规划和执行。
- 新增 Cybernomads Agent Runtime，用于运行任务规划、Agent Review、修正循环和拆分报告生成。
- 新增 Skill Registry 与 Controlled Tool Registry 语义，让 Cybernomads Agent 具备业内常规 Agent 的 Skill / Tools 能力，同时保持工具边界受控。
- 新增任务拆分运行批次与产物存储，用于保存草案、Review 报告、修正历史、用户反馈和最终确认快照。
- 将任务落库从 Agent 自由动作改为系统编排动作：Agent 只输出可检查结构化方案，用户确认后由后端任务域正式写入。
- 更新顶层架构、Cybernomads Agent 架构、必要的 API / SQL / 领域文档，使文档与新链路一致。

## Capabilities

### New Capabilities

- `cybernomads-agent-runtime`: Cybernomads 自有 Agent Runtime，负责 GPT 供应商调用、任务方案生成、Agent Review、修正循环、Skill/Tools 使用和结构化输出。

### Modified Capabilities

- `agent-service-contracts`: 增加 Cybernomads Agent provider 配置契约，并调整 provider 职责边界以支持规划/执行分离。
- `traffic-work-task-decomposition-integration`: 将任务拆分从“提交给外部 Agent 并等待其落库”改为“Cybernomads Agent 生成草案 -> Review -> 用户确认 -> 系统落库”。

## Impact

- Agent 接入模块：provider 配置、状态展示、凭证存储、连接验证和能力准备。
- 任务拆分链路：引流工作创建/更新后的 context preparation 语义、任务方案草案、Review 状态、用户确认和重拆入口。
- 任务模块：正式任务集写入仍由任务域负责，但触发时机从 Agent 工具调用迁移到系统提交阶段。
- OpenClaw adapter：保留单任务执行能力，但不再作为整份任务拆分的主导者。
- Agent Interaction Logs：需要记录 Cybernomads Agent 的规划、Review、修正、工具调用和系统提交事件，并确保密钥脱敏。
- 顶层文档：`docs/design/`、必要的 `docs/api/`、`docs/sql/` 和领域设计文档需要同步。

