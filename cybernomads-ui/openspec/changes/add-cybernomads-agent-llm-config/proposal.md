## Why

Cybernomads 引入自有 Agent 后，前端需要像配置 OpenClaw 一样，为 Cybernomads Agent 配置 GPT-compatible LLM 供应商。当前前端只有 OpenClaw 当前服务配置页，无法单独配置任务拆分 / Review 所需的模型地址、模型名、推理强度和 API Key。

## What Changes

- 新增 Cybernomads Agent LLM 供应商配置入口，与 OpenClaw 执行器配置入口并列展示。
- 新增 Cybernomads Agent LLM 配置页，表单字段为 Base URL、Model、Reasoning Effort、API Key。
- 配置体验沿用 OpenClaw 的 staged flow：保存配置、测试连接、准备能力 / 就绪确认。
- API Key 继续作为 write-only 输入处理：不回填、不缓存、不提交掩码占位符。
- Agent 总览或控制台入口需要清楚区分：
  - Cybernomads Agent：任务拆分 / Review 使用的 LLM 供应商。
  - OpenClaw：已确认单任务执行器。
- 【依赖后端更新】当前 `../../docs/api/agent-services.yaml` 仍是“唯一当前 Agent 服务”契约，且未包含 `model`、`reasoningEffort`、planning/execution provider 用途等字段；前端实现前需要后端先更新 API 契约。
- 【依赖后端更新】当前 `../../docs/sql/agent-services.sql` 仍只支持 `service_scope = current` 的单槽位结构；如后端采用 planning/execution 分槽或新增模型配置字段，需要先同步 SQL 契约。

## Capabilities

### New Capabilities

- `frontend-cybernomads-agent-llm-configuration`: 前端提供 Cybernomads Agent 的 GPT-compatible LLM 供应商配置、连接验证、能力准备状态展示和凭据保护交互。

### Modified Capabilities

- None.

## Impact

- `src/entities/agent/model/types.ts`: 需要在后端契约更新后补充 Cybernomads Agent LLM 配置 DTO 与展示模型。
- `src/entities/agent/api/agent-service.ts`: 需要在后端契约更新后新增或扩展 LLM provider 配置、状态读取、连接验证和能力准备 API adapter。
- `src/pages/agents/openclaw/ui/OpenClawConfigPage.vue`: 作为交互模式参考，不应被改成 LLM 配置页本身。
- 新增 Cybernomads Agent LLM 配置页面与路由，例如 `/console/cybernomads-agent`。
- Agent 总览 / 控制台入口需要新增 Cybernomads Agent 配置卡片。
- 受 `../../docs/api/agent-services.yaml` 与 `../../docs/sql/agent-services.sql` 约束；如果后端契约未更新，本 change 的实现任务必须阻塞在 API/SQL 依赖上。
