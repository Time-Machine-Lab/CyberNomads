## 1. Test Harness

- [ ] 1.1 新增主流程证明测试文件，例如 `tests/integration/task-flow-proof.test.ts`
- [ ] 1.2 新增确定性的 Fake Agent Provider，固定返回至少 3 个任务，并记录拆分/执行消息
- [ ] 1.3 使用临时 working directory 启动真实应用，避免污染本地真实 `cybernomads/` 和 SQLite

## 2. Full Flow Proof

- [ ] 2.1 配置当前 Agent 服务并完成连接验证、能力准备
- [ ] 2.2 创建产品和策略测试数据
- [ ] 2.3 创建引流工作，并断言 `ready + prepared`
- [ ] 2.4 查询任务列表，断言任务集已落库且归属于同一引流工作
- [ ] 2.5 检查工作上下文文件存在，并包含产品、策略和对象绑定快照
- [ ] 2.6 启动引流工作，断言进入 `running`
- [ ] 2.7 触发可控 planner tick，断言扫描和提交结果
- [ ] 2.8 使用受控任务 API 模拟 Agent 回写 `completed` 并创建产出记录
- [ ] 2.9 查询任务详情和产出记录，断言最终状态符合预期

## 3. Evidence Artifacts

- [ ] 3.1 生成 `report.md`，记录测试原因、流程步骤、关键 ID、状态变化和最终结论
- [ ] 3.2 生成 `evidence.json`，记录结构化证明字段
- [ ] 3.3 生成 `agent-messages.json`，记录 Agent 拆分和执行消息摘要
- [ ] 3.4 生成 `planner-ticks.json`，记录 planner tick 结果
- [ ] 3.5 生成 `final-state.json` 和 `runtime-tree.txt`

## 4. Verification

- [ ] 4.1 运行目标测试并确认通过
- [ ] 4.2 运行 `npm test -- tests/integration/task-flow-proof.test.ts` 或等价命令
- [ ] 4.3 检查证据产物可读、可追溯、能证明流程闭环

