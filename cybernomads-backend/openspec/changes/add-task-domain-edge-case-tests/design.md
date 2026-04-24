## Context

任务领域 MVP 选择了轻量状态机和简化调度逻辑：任务只有 `ready / running / completed / failed`，planner 使用 `cron` 和 `rely_on` 做线程决策，不做自动重试、不做手动恢复、不做复杂容灾。

这种设计的优点是简单，但也意味着边界规则必须被测试锁住。否则后续开发容易无意中引入复杂状态、绕过受控任务 API、误让非 running 引流工作被调度、或在 Agent 拆分失败时仍把工作标成 prepared。

## Goals / Non-Goals

**Goals:**
- 覆盖任务领域关键失败路径和业务边界。
- 验证错误可观察，不出现“状态看起来成功但实际不可运行”的情况。
- 验证 planner 只扫描 running 引流工作和 ready 任务。
- 验证 cron/rely_on 的 MVP 判断规则。
- 验证任务集创建/替换受控，不允许绕过生命周期约束。
- 验证任务产出记录只做抽象追踪，不要求产出数据本体 schema。

**Non-Goals:**
- 不重复主流程 happy path 证明。
- 不生成完整 evidence report；必要诊断可保留在测试断言和失败消息中。
- 不接入真实 OpenClaw。
- 不测试前端页面。
- 不扩展生产功能。

## Test Matrix

| 类别 | 场景 | 预期 |
|---|---|---|
| Agent 准备 | 未配置 Agent 时创建引流工作 | 工作保持 `ready`，准备状态 `failed`，不能 start |
| Agent 拆分 | Agent 返回非 JSON | 准备失败，不落库任务集 |
| Agent 拆分 | Agent 返回任务依赖不存在 | 准备失败或任务集校验失败，错误可见 |
| 任务集 | 同一引流工作重复 create task set | 拒绝重复创建 |
| 任务集 | running 工作 replace task set | 拒绝替换 |
| 生命周期 | running 工作 update | 返回冲突，不触发任务重建 |
| planner 扫描 | ready/ended/archived/deleted 工作有 ready 任务 | 不扫描、不提交 |
| planner 扫描 | task 已 running/completed/failed | 不重复提交 |
| cron | cron 未到期 | 任务保持 `ready` |
| cron | cron 到期 | 任务提交并变 `running` |
| cron | cron 语法不支持 | 任务变 `failed` 或诊断可见 |
| rely_on | 依赖未 completed | 下游任务保持 `ready` |
| rely_on | 依赖 completed 但更新时间不新 | 下游任务保持 `ready` |
| rely_on | 依赖 completed 且更新时间更新 | 下游任务提交 |
| 执行提交 | Agent 提交失败 | 任务变 `failed`，失败原因可见，不自动重试 |
| 状态 | 更新未知任务状态 | 拒绝 |
| 产出记录 | 创建产出记录但不写数据本体 | 可查询抽象记录 |

## Decisions

### 1. 边界测试可以分布在 unit 和 integration

纯 planner 判断、任务 service 校验适合单元测试；涉及引流工作创建、Agent 拆分失败、HTTP 状态码的场景适合集成测试。

### 2. 每个失败路径都要验证最终可观察状态

测试不能只断言抛错，还要检查最终状态。例如准备失败后工作不能 start；提交失败后任务不是继续保持不可解释的 running，而是有明确 failed 或诊断。

### 3. 不把真实平台行为纳入边界测试

任务领域边界关注后端业务和调度规则，不验证 B 站脚本、账号登录或真实消息发送。

## Risks / Trade-offs

- [风险] 边界用例过多导致测试维护成本高。
  → 按业务风险优先，先覆盖状态、拆分、调度和回写四类核心边界。
- [风险] 与已有单元测试重复。
  → 实施前应复用或扩展现有 `task-service.test.ts`、`thread-task-planner.test.ts`、`traffic-work-http.test.ts`，避免重复文件过多。

