## Context

Cybernomads 已经有 OpenClaw provider、任务拆分 Skill、任务拆分支撑工具和 Agent Interaction Logs。现有链路证明了“产品 + 策略 + 引流工作”可以进入任务化执行，但任务拆分质量仍然主要依赖外部 Agent 自觉遵守流程。

新设计的核心不是加一层可视化，而是调整责任归属：

```text
旧链路:
TrafficWork -> OpenClaw -> 读取 Skill -> 自由拆分 -> 调工具保存任务 -> prepared

新链路:
TrafficWork -> Cybernomads Agent -> 结构化草案 -> Agent Review -> 用户确认
            -> Cybernomads 系统编排落库 -> OpenClaw 执行单任务
```

这里的一个隐含架构冲突是：现有 Agent 接入域以“一个当前 active service”为基础，而新方向需要至少区分两类 Agent 能力：

- **规划能力**：Cybernomads Agent，第一版接 GPT，负责拆分、Review、修正。
- **执行能力**：OpenClaw，负责执行已确认的单个任务。

如果继续强行把规划和执行塞进同一个 active provider，会让 Cybernomads Agent 不得不代理 OpenClaw 执行，或者让 OpenClaw 继续承担规划责任，两条都不干净。因此本 change 建议引入“按用途选择 provider”的语义。

## Goals / Non-Goals

**Goals:**

- 新增 Cybernomads Agent provider 配置入口，第一版只支持 GPT / OpenAI-compatible Responses API。
- 支持服务地址、模型、推理强度、API Key 四项核心配置。
- 建设 Cybernomads Agent Runtime，具备常规 Agent 能力：Agent、Tools、Skills、结构化输出、Review、修正循环和日志追踪。
- 让 Agent Review 负责任务质量判断，而代码负责 schema、安全、幂等、路径和落库边界。
- 将任务落库、资源最终归档、prepared 状态更新收回到系统编排层。
- 支持用户基于拆分报告、Review 问题和执行异常发起反馈重拆。
- 同步顶层设计文档，避免实现方向和项目知识库分叉。

**Non-Goals:**

- 不在本 change 中实现通用多模型市场或多供应商路由。
- 不在本 change 中取消 OpenClaw。
- 不在本 change 中重写现有任务调度器。
- 不在本 change 中实现复杂多人审批流。
- 不在本 change 中做真实平台动作试运行来验证任务质量。
- 不把 API Key 或其他 secret 写入文档、日志、草案、Review 报告或任务文件。

## Decisions

### 1. Cybernomads Agent provider 第一版只接 GPT

第一版 provider code 建议使用 `cybernomads-agent`。它不是“外部执行 Agent”，而是 Cybernomads 自己的规划 Agent 入口。配置项保持最小：

- 地址：OpenAI-compatible base URL。
- 模型：默认可填 `gpt-5.5`，但不写死到代码常量里。
- 强度：对应 reasoning effort，第一版至少支持 `low`。
- API Key：写入现有 credential store 或同级 secret store，并全链路脱敏。

用户给出的 `CONTENT_FOREST_CODEX_RESEARCH_*` 环境变量可以作为本地默认配置来源，但提案和代码都不应固化密钥原文。

### 2. Agent 接入域需要从“单 active service”演化为“按用途 active service”

建议最小演化为两个用途：

- `planning`: Cybernomads Agent。
- `execution`: OpenClaw。

这不等于做复杂 provider routing。它只是把业务上已经不同的两个职责拆开，避免 OpenClaw 继续被当作任务拆分 provider。

如果短期不想大改 UI，也可以先让配置页分成两个区块：

- 任务拆分 Agent：Cybernomads Agent / GPT。
- 任务执行 Agent：OpenClaw。

### 3. Cybernomads Agent Runtime 采用轻量 SDK + 后端阶段机

Runtime 层可以使用 OpenAI Agents SDK TypeScript 或等价轻量 Agent SDK，但业务阶段机必须留在后端：

- Agent Runtime 负责模型调用、工具调用、Skill 引用、结构化输出和 handoff。
- 后端 Orchestrator 负责阶段推进、草案存储、用户确认、系统提交和失败恢复。

这比把整个流程交给 Agent 框架更稳，因为“确认后落库”是 Cybernomads 的业务动作，不是模型动作。

### 4. 第一版 Agent 角色保持克制

第一版只保留必要角色：

- `Task Planner`: 生成任务方案草案。
- `Review Agent`: 检查任务粒度、产出、依赖、输入来源、策略目标覆盖和资源准备。
- `Repair Agent`: 基于 Review 问题修正方案。
- `Report Agent`: 可选，第一版也可以由后端根据结构化结果生成报告。

不建议第一版引入大量专用 Agent。拆分质量的提升主要来自结构化方案、Review 标准和反馈闭环，而不是 Agent 数量。

### 5. Tools 分层：只读 / 草案 / 提交

Cybernomads Agent 需要 tools，但不是所有工具都应该交给 Agent 自由调用。

- 只读工具：读取产品、策略、对象绑定、可用 Skill、历史反馈、执行异常摘要。
- 草案工具：保存草案、保存 Review 报告、保存拆分报告、执行结构化自检。
- 提交工具：正式任务落库、资源最终归档、prepared 状态更新。

提交工具默认只允许 Orchestrator 调用。Agent 可以建议提交内容，但不直接拥有最终写库权。

### 6. 输入来源不强制来自上游，但必须显式声明

Review Agent 不应简单判断“所有输入必须来自上游输出”。真实任务输入可能来自：

- 上游任务产出。
- 用户提供材料。
- 产品或策略原文。
- 平台历史数据。
- 运行时工具查询结果。
- 工作目录中的知识或数据文件。

因此 Review 标准应改成：每个任务输入都必须声明来源类型、获取方式、缺失时风险和是否阻塞执行。

### 7. 任务拆分产物成为一等资产

必须新增拆分运行批次概念，否则无法回答用户最关心的问题：

- 这次拆了什么？
- 为什么这么拆？
- Review 发现过什么？
- 哪些问题被修正了？
- 用户反馈如何影响下一次重拆？

拆分产物至少包括任务方案草案、Review 报告、修正历史、资源清单、用户反馈和最终确认快照。

## Risks / Trade-offs

- [Risk] provider 用途拆分会触碰现有“单 active service”模型。  
  → Mitigation: 第一版只拆 `planning` 与 `execution` 两个用途，不做任意多 provider 路由。

- [Risk] Agent Review 判断不具备硬编码规则的确定性。  
  → Mitigation: Review 必须输出问题清单、证据和修正建议；代码只做结构、安全和一致性校验。

- [Risk] 结构化输出不稳定会影响后端编排。  
  → Mitigation: Planner、Reviewer、Repairer 输出必须走 schema 校验；校验失败进入 repair 或 failed 阶段。

- [Risk] API Key 和模型调用参数进入日志。  
  → Mitigation: 复用并强化现有 Agent Interaction Log 脱敏能力，新增 provider config 日志白名单。

- [Risk] 第一版开发量偏大。  
  → Mitigation: 分两步落地：先做 Cybernomads Agent provider + planning/review/草案存储；再做用户确认提交、反馈重拆和 UI 完整展示。

## Migration Plan

1. 扩展 Agent 接入契约，支持 `cybernomads-agent` provider 与 GPT 配置。
2. 增加 planning / execution provider 用途边界。
3. 新增 Cybernomads Agent Runtime 端口、适配器和最小 Agent 角色。
4. 新增拆分运行批次与产物存储。
5. 将引流工作任务拆分链路改为草案、Review、确认、系统提交。
6. 保留 OpenClaw 单任务执行路径，并停止把整份任务拆分交给 OpenClaw。
7. 同步更新顶层设计、API、SQL 和领域文档。

## Open Questions

- 第一版 UI 是否允许同时配置 planning provider 与 execution provider，还是先隐藏 execution provider 并沿用现有 OpenClaw 配置？
- `reasoning effort` 的中文展示名是否固定为“强度”，以及可选项是否只暴露 low / medium / high？
- 拆分报告第一版由 Report Agent 生成，还是由后端基于结构化草案和 Review 报告渲染？
- 用户确认前是否允许人工编辑任务方案，还是第一版只允许反馈重拆？

