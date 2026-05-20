## 1. Agent 接入模块

- [ ] 1.1 扩展 Agent 服务契约，新增 `cybernomads-agent` provider code 与 GPT-only MVP 语义。
- [ ] 1.2 扩展配置输入，支持地址、模型、推理强度、API Key，并明确 API Key 只进入 secret store。
- [ ] 1.3 增加 provider 用途边界，至少区分 `planning` 与 `execution`，避免任务拆分和任务执行继续共用同一个 active provider 语义。
- [ ] 1.4 更新 Agent 服务状态读取，让前端能看见 Cybernomads Agent 的连接状态、能力准备状态和配置摘要。
- [ ] 1.5 更新连接验证逻辑，验证 GPT provider base URL、模型和 API Key 是否可用。
- [ ] 1.6 更新日志脱敏测试，证明 API Key、Authorization、Bearer token 和 provider secret 不会写入 `.logs`。

## 2. Cybernomads Agent Runtime

- [ ] 2.1 新增 Cybernomads Agent Runtime 端口，定义 planning、review、repair、report 的 provider-neutral 调用结果。
- [ ] 2.2 引入轻量 Agent SDK 与 schema 校验依赖，封装 GPT / OpenAI-compatible Responses API 客户端。
- [ ] 2.3 实现 Task Planner，输出结构化任务方案草案，而不是直接保存正式任务。
- [ ] 2.4 实现 Review Agent，检查任务粒度、重复、明确产出、策略目标覆盖、输入来源、依赖关系、资源准备和可运行性。
- [ ] 2.5 实现 Repair Agent，基于 Review 问题清单修正任务方案，并限制最大修正轮次。
- [ ] 2.6 设计 Report Agent 或后端报告渲染器，产出用户可读的任务拆分报告。
- [ ] 2.7 建立 Skill Registry，支持列出可用 Skill、读取 Skill 摘要、为任务方案记录 Skill 引用。
- [ ] 2.8 建立 Controlled Tool Registry，区分只读工具、草案工具和系统提交工具。
- [ ] 2.9 为 Agent Runtime 接入 Agent Interaction Logs，记录规划、Review、修正、工具调用和结构化输出摘要。

## 3. 任务拆分运行批次与产物

- [ ] 3.1 新增任务拆分运行批次模型，用于记录 trafficWorkId、run 状态、阶段、provider、模型和关联产物。
- [ ] 3.2 新增任务方案草案产物，保存 Planner 输出的结构化草案。
- [ ] 3.3 新增 Review 报告产物，保存通过、需修正、失败以及问题清单。
- [ ] 3.4 新增修正历史产物，保存每轮 Repair 的输入、问题和输出摘要。
- [ ] 3.5 新增用户反馈产物，支持整份方案反馈和单任务反馈。
- [ ] 3.6 新增最终确认快照，作为系统提交正式任务集的来源。

## 4. 引流工作任务拆分链路集成

- [ ] 4.1 将创建/更新引流工作后的任务拆分流程切换为 Cybernomads Agent 草案生成。
- [ ] 4.2 在 Review 通过前，不写入正式任务表，不标记 context preparation 为 prepared。
- [ ] 4.3 Review 可修正时进入 Repair 循环；不可修正时进入 failed 并保留报告。
- [ ] 4.4 Review 通过后进入 waiting user confirmation，供前端展示报告和确认入口。
- [ ] 4.5 用户确认后，由 Orchestrator 调用任务域服务创建或替换正式任务集。
- [ ] 4.6 系统提交完成后归档任务文档、资源清单和 prepared 状态。
- [ ] 4.7 用户反馈重拆时，将原草案、Review 报告、执行异常和用户反馈注入下一轮 Planner。

## 5. OpenClaw 执行边界调整

- [ ] 5.1 停止在任务拆分阶段把整份引流工作交给 OpenClaw 自由拆分和落库。
- [ ] 5.2 保留 OpenClaw 单任务执行 provider 能力，用于执行已确认任务。
- [ ] 5.3 更新任务执行提交上下文，确保 OpenClaw 只接收单任务说明、任务文档和必要上下文。
- [ ] 5.4 将 OpenClaw 执行异常作为反馈来源写回拆分运行批次或反馈产物。

## 6. 文档同步

- [ ] 6.1 更新 `docs/design/Cybernomads架构设计文档.md`，同步 planning / execution provider 分工。
- [ ] 6.2 更新 `docs/design/Cybernomads Agent架构设计文档.md`，补充本次 OpenSpec 提案中的 provider 接入、产物存储和实施边界。
- [ ] 6.3 更新相关领域设计文档，说明任务拆分运行批次、Review、用户确认和反馈重拆的领域语义。
- [ ] 6.4 更新相关 API 文档，描述 Cybernomads Agent provider 配置、任务拆分进度、报告、确认和反馈入口。
- [ ] 6.5 更新相关 SQL 文档，描述新增或调整的配置、运行批次、草案产物和反馈存储。

## 7. Verification

- [ ] 7.1 增加单元测试：Cybernomads Agent provider 配置校验、secret 写入和脱敏。
- [ ] 7.2 增加单元测试：Planner / Reviewer / Repairer 结构化输出 schema 校验。
- [ ] 7.3 增加单元测试：Review 不通过时不会写入正式任务集。
- [ ] 7.4 增加集成测试：创建引流工作后生成草案、Review、等待确认、确认后落库。
- [ ] 7.5 增加集成测试：用户反馈重拆会携带上一轮草案、Review 问题和反馈内容。
- [ ] 7.6 增加回归测试：OpenClaw 仍可执行已确认单任务，但不参与整份任务拆分。
- [ ] 7.7 运行 `npm run typecheck`、相关 targeted tests，最后视本地耗时运行 `npm test`。

