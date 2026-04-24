## 1. Preparation Failure Tests

- [ ] 1.1 覆盖未配置 Agent 服务时创建引流工作，断言准备失败且不能 start
- [ ] 1.2 覆盖 Agent 返回非 JSON，断言准备失败且任务集未静默落库
- [ ] 1.3 覆盖 Agent 返回无效任务依赖，断言任务集校验失败且错误可见

## 2. Task Set Constraint Tests

- [ ] 2.1 覆盖同一引流工作重复 create task set 被拒绝
- [ ] 2.2 覆盖 running 引流工作 replace task set 被拒绝
- [ ] 2.3 覆盖引流工作暂停/ready 后 update 可触发任务集替换

## 3. Planner Boundary Tests

- [ ] 3.1 覆盖 planner 不扫描非 running 引流工作
- [ ] 3.2 覆盖 planner 不重复提交 running/completed/failed 任务
- [ ] 3.3 覆盖 cron 到期与未到期行为
- [ ] 3.4 覆盖 unsupported cron 或 condition shape 的诊断/失败行为
- [ ] 3.5 覆盖 rely_on 未完成、已完成但过旧、已完成且更新三种依赖状态

## 4. Execution Feedback And Output Tests

- [ ] 4.1 覆盖 Agent 执行提交失败时任务状态或诊断可观察，且不自动重试
- [ ] 4.2 覆盖未知任务状态更新被拒绝
- [ ] 4.3 覆盖任务产出记录创建与查询，不要求产出数据本体 schema

## 5. Verification

- [ ] 5.1 优先复用或扩展现有 `task-service.test.ts`、`thread-task-planner.test.ts`、`traffic-work-http.test.ts`
- [ ] 5.2 运行相关 unit/integration 测试并确认通过
- [ ] 5.3 检查测试失败消息能指出具体业务边界，而不是只有泛化错误

