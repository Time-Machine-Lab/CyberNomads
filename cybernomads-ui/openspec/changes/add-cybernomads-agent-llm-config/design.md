## Context

当前前端 Agent 配置体验已经有一条 OpenClaw focused setup 流程，位于 OpenClaw 配置页，并遵循“保存配置 -> 测试连接 -> 准备能力”的 staged flow。这个页面当前绑定的是 `docs/api/agent-services.yaml` 中的“当前唯一 Agent 服务”契约，字段只有 `providerCode`、`endpointUrl`、`authentication.kind` 和 `authentication.secret`。

Cybernomads Agent 引入后，前端需要增加一个独立的 LLM 供应商配置入口，用于配置任务拆分 / Review 所使用的 GPT-compatible provider。该配置体验要像 OpenClaw 一样清楚、可恢复、保护凭据，但不能和 OpenClaw 执行器混成同一个配置对象。

本 change 受到 UI 宪法约束：前端不得私自新增接口字段或数据结构。当前 `../../docs/api/agent-services.yaml` 尚未提供 Cybernomads Agent LLM provider 的 `model`、`reasoningEffort`、provider 用途分槽等契约；`../../docs/sql/agent-services.sql` 也仍是 `service_scope = current` 的单槽位结构。因此实现必须先等待后端更新顶层 API / SQL 契约。

## Goals / Non-Goals

**Goals:**

- 在前端 OpenSpec 中定义 Cybernomads Agent LLM 供应商配置能力。
- 明确配置页需要收集 Base URL、Model、Reasoning Effort、API Key。
- 保持和 OpenClaw 配置页一致的 staged flow：保存配置、测试连接、准备能力。
- 明确 Cybernomads Agent LLM 与 OpenClaw 的职责区分。
- 继承 OpenClaw 配置页的凭据保护规则：API Key write-only，不回填，不提交掩码占位符。
- 明确前端实现依赖后端更新 `docs/api/agent-services.yaml` 与 `docs/sql/agent-services.sql`。

**Non-Goals:**

- 不实现任务拆分进度面板、拆分报告、Review 问题展示或反馈重拆入口。
- 不实现多 LLM 供应商市场。
- 不实现多模型切换、模型测速、模型成本统计或模型调用日志查看。
- 不修改 `docs/api/*.yaml` 或 `docs/sql/*.sql`；这些属于后端契约更新。
- 不把 OpenClaw 配置页改造成 Cybernomads Agent LLM 配置页。

## Decisions

### 1. 使用独立配置页，而不是复用 OpenClaw 页面

Cybernomads Agent LLM 和 OpenClaw 的业务职责不同：前者服务任务拆分 / Review，后者服务已确认单任务执行。虽然交互流程类似，但页面文案、表单字段、provider code、状态解释和入口语义都不同。

因此建议新增页面，例如 `/console/cybernomads-agent`，并保留 `/console/openclaw` 作为执行器配置页。

### 2. Agent 总览或控制台展示两个配置卡

入口层需要明确告诉用户“需要配置两类能力”：

- Cybernomads Agent LLM：用于规划、拆分、Review。
- OpenClaw Executor：用于执行已确认任务。

这样可以避免用户以为配置 GPT 会替代 OpenClaw，也避免继续使用“唯一当前 Agent 服务”的前端心智。

### 3. 第一版只暴露四个核心字段

第一版表单字段固定为：

- Base URL
- Model
- Reasoning Effort
- API Key

用户此前提到的 web search、search context size、timeout、max output tokens 等参数可以由后端使用默认值，后续有明确产品需求再暴露。这样能避免配置页膨胀，也能减少前端对 provider 私有参数的耦合。

### 4. 凭据交互沿用 OpenClaw 的 write-only 模式

API Key 不得从接口回显，不得写入前端本地存储，不得出现在诊断日志里。已有凭据时只显示“已保存凭据”，更新时必须由用户明确选择替换并输入新 key。

### 5. API adapter 必须等待后端契约

当前 `docs/api/agent-services.yaml` 不能承载这个配置页。前端任务必须标注为依赖后端契约更新，直到 API 明确以下内容后才能实现生产请求：

- Cybernomads Agent LLM provider 的配置接口或用途分槽接口。
- `model` 与 `reasoningEffort` 的请求 / 响应字段。
- 连接验证和能力准备接口如何定位 Cybernomads Agent LLM provider。
- 状态读取如何同时表达 Cybernomads Agent LLM 与 OpenClaw。

## Risks / Trade-offs

- [Risk] 如果前端先行自定义接口字段，会违反 UI 宪法并造成后端对接返工。  
  -> Mitigation: tasks 中把 API adapter 与生产表单提交明确标记为【依赖后端更新】。

- [Risk] 用户混淆 Cybernomads Agent LLM 和 OpenClaw 的职责。  
  -> Mitigation: 入口卡片和页面标题必须使用“拆分 / Review 模型供应商”和“任务执行器”这类职责文案。

- [Risk] 配置项过多导致第一版变成 provider 控制台。  
  -> Mitigation: 第一版仅暴露 Base URL、Model、Reasoning Effort、API Key。

- [Risk] API Key 被误当作普通输入回显或提交掩码。  
  -> Mitigation: 复用 OpenClaw 页面已有的 credential replacement 模式，并增加测试覆盖。

## Migration Plan

1. 等待后端更新 `docs/api/agent-services.yaml` 与 `docs/sql/agent-services.sql`，使其支持 Cybernomads Agent LLM 配置。
2. 基于更新后的 API 契约扩展 `entities/agent` DTO、mapper 和 API adapter。
3. 新增 Cybernomads Agent LLM 配置页面与路由。
4. 在 Agent 总览或 Console 中增加 Cybernomads Agent LLM 配置入口。
5. 增加表单校验、状态展示、错误恢复和凭据保护测试。

## Open Questions

- 后端最终会采用用途分槽接口，还是在 Agent Services API 中新增专门的 Cybernomads Agent LLM 配置接口？
- `Reasoning Effort` 的合法枚举是否只暴露 `low`、`medium`、`high`，还是需要包含 `none`、`minimal`、`xhigh`？
- 能力准备对 GPT-compatible provider 是否保留为独立动作，还是连接验证成功即可视为 ready？
