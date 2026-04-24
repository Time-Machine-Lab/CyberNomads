## Why

主流程证明只能说明 happy path 可行，但任务领域真正容易出问题的是边界和失败路径：Agent 未配置、拆分返回非法数据、任务依赖无效、running 工作被更新、非 running 工作被 planner 扫描、cron 不到期、依赖未完成、Agent 执行提交失败等。

这些场景需要单独拆出测试提案，避免主流程测试过长、过杂，也方便另一个 Agent 并行补齐任务领域的业务规则回归测试。

## What Changes

- 新增任务领域边界/失败场景测试，覆盖 Agent 准备失败、任务拆分非法结果、任务集创建/替换约束、任务状态约束、planner 扫描过滤、cron/rely_on 判断、提交失败可观察等。
- 将测试重点放在业务规则和失败可诊断性，而不是生成完整流程报告。
- 复用已有 Fake Agent Provider 或测试 harness，但每个用例应保持小而明确。
- 明确这些测试不依赖真实 OpenClaw、不依赖前端页面、不测试平台脚本。

## Capabilities

### New Capabilities
- `task-domain-edge-case-tests`: 提供任务领域边界规则、失败路径和调度条件的回归测试。

### Modified Capabilities
- None.

## Impact

- `tests/integration/task-domain-edge-cases.test.ts`
- `tests/unit/task-domain-edge-cases.test.ts` 或现有相关测试文件
- `tests/support/` 或等价测试辅助目录
- 不改变生产业务逻辑

