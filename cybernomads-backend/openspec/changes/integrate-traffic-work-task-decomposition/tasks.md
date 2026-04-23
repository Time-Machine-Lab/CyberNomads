## 1. Preparation Input

- [x] 1.1 在引流工作创建流程中组装任务拆分快照，包含产品正文、策略正文、对象绑定摘要和工作上下文引用
- [x] 1.2 在引流工作更新流程中复用同一组装逻辑，并确保更新只允许在非 `running` 状态触发

## 2. Agent Decomposition Request

- [x] 2.1 在 Agent 服务抽象中接入 provider-neutral 的任务拆分请求入口
- [x] 2.2 请求中引用任务拆分 Skill，不在引流工作模块写死 OpenClaw 协议
- [x] 2.3 处理 Agent 拆分失败、返回格式不合法和能力未准备等失败反馈

## 3. Task Set Persistence

- [x] 3.1 调用任务模块按引流工作批量创建任务集
- [x] 3.2 更新重建时调用任务模块按引流工作替换当前任务集
- [x] 3.3 确保任务落库走受控模块接口，不允许 Agent 或 subagent 直接写 SQLite

## 4. Traffic Work State Result

- [x] 4.1 任务拆分和任务集落库全部成功后标记上下文准备状态为 `prepared`
- [x] 4.2 任一环节失败时保持主状态 `ready`，标记上下文准备状态为 `failed`，并返回可读失败提示

## 5. Verification

- [x] 5.1 补充创建引流工作触发任务拆分并生成任务集的集成测试
- [x] 5.2 补充更新引流工作原位替换任务集的集成测试
- [x] 5.3 补充 Agent 拆分失败时不进入可启动状态的测试
- [x] 5.4 补充边界测试，确认引流工作模块不直接依赖 OpenClaw adapter 或 SQLite 任务表
