## 1. Contract Readiness

- [x] 1.1 【依赖后端更新】等待 `../../docs/api/agent-services.yaml` 增加 Cybernomads Agent LLM provider 配置、状态读取、连接验证和能力准备契约。
- [x] 1.2 【依赖后端更新】等待 `../../docs/api/agent-services.yaml` 明确 Base URL、Model、Reasoning Effort、API Key 的请求 / 响应字段和 provider purpose 语义。
- [x] 1.3 【依赖后端更新】等待 `../../docs/sql/agent-services.sql` 明确 Cybernomads Agent LLM 配置的持久化语义，或确认前端只依赖 API 不展示未落库字段。
- [x] 1.4 对照更新后的 API / SQL 契约，确认前端不需要自定义任何未记录字段。

## 2. Agent Entity API And Types

- [x] 2.1 基于更新后的 `../../docs/api/agent-services.yaml` 扩展 `src/entities/agent/model/types.ts`，新增 Cybernomads Agent LLM 配置 DTO、状态 DTO 和表单输入类型。
- [x] 2.2 基于更新后的 `../../docs/api/agent-services.yaml` 扩展 `src/entities/agent/api/agent-service.ts`，新增或拆分 Cybernomads Agent LLM 配置、状态读取、连接验证和能力准备 API adapter。
- [x] 2.3 保留 OpenClaw API adapter 的执行器配置语义，避免将 OpenClaw helper 改造成通用 LLM helper 后丢失职责表达。
- [x] 2.4 增加 credential helper 或复用现有逻辑，确保 API Key 不回填、不缓存、不提交掩码占位符。

## 3. Cybernomads Agent LLM Setup Page

- [x] 3.1 新增 Cybernomads Agent LLM focused setup 页面，交互结构参考 `OpenClawConfigPage.vue` 的 staged flow。
- [x] 3.2 添加 Base URL、Model、Reasoning Effort、API Key 表单字段，并实现本地必填校验和 URL 格式校验。
- [x] 3.3 实现已有凭据提示和“替换 API Key”交互，禁止把已保存凭据渲染到输入框。
- [x] 3.4 实现保存配置、测试连接、准备能力三个动作的 loading、success、error 和 retry 状态。
- [x] 3.5 页面文案明确 Cybernomads Agent LLM 用于任务拆分 / Review，不承担 OpenClaw 单任务执行。

## 4. Routing And Entry Points

- [x] 4.1 在路由中新增 Cybernomads Agent LLM 配置页，例如 `/console/cybernomads-agent`。
- [x] 4.2 在 Agent 总览或 Console 入口增加 Cybernomads Agent LLM 配置卡片。
- [x] 4.3 调整 Agent 总览卡片文案，使 Cybernomads Agent LLM 与 OpenClaw Executor 并列但职责不同。
- [x] 4.4 保留 `/console/openclaw` 和 `/agents/openclaw` 现有行为，不因新增 LLM 配置页而改变 OpenClaw setup flow。

## 5. Error Handling And UX Polish

- [x] 5.1 对 400、404、409、连接失败、能力准备失败分别展示可恢复错误文案。
- [x] 5.2 在后端契约缺失或返回不支持 Cybernomads Agent LLM provider 时，显示“需要更新后端 Agent 服务契约”的阻塞说明，而不是静默失败。
- [x] 5.3 确认所有按钮在 loading 状态下不可重复提交。
- [x] 5.4 确认页面在桌面宽屏下与现有 focused setup 视觉风格一致，且不出现文本溢出。

## 6. Verification

- [x] 6.1 增加类型或单元测试，覆盖 Cybernomads Agent LLM 表单校验。
- [x] 6.2 增加测试，证明已有 API Key 不会回填到输入框，也不会提交掩码占位符。
- [x] 6.3 增加 API adapter 测试，证明请求路径和请求体与更新后的 `../../docs/api/agent-services.yaml` 对齐。
- [x] 6.4 增加组件测试，覆盖保存配置、测试连接、准备能力和失败重试状态。
- [x] 6.5 运行 `npm run typecheck`、相关测试和 `npm run build`。
