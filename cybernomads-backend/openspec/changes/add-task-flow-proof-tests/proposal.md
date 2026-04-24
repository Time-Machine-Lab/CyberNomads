## Why

任务领域已经完成开发，但它不是单点 CRUD，而是横跨 Agent 服务、引流工作、任务拆分、任务集持久化、线程规划器、任务执行回写和产出记录的长流程。当前已有单元测试和局部集成测试，但还缺少一套“流程证明型测试”，用明确证据证明从引流工作创建到任务运行的主链路可行。

这类测试的目标不是只验证接口返回 200，而是让团队能看到一份可追溯记录：系统在哪一步创建了什么、Agent 收到了什么、任务如何落库、planner 如何提交、任务状态如何变化、产出记录是否可查询。

## What Changes

- 新增任务领域主流程证明测试，覆盖“配置 Agent 服务 -> 创建产品/策略 -> 创建引流工作 -> Agent 拆分任务 -> 任务集落库 -> 启动引流工作 -> planner 提交任务 -> 任务回写完成 -> 创建产出记录 -> 查询最终状态”。
- 使用确定性的 Fake Agent Provider，避免真实 OpenClaw、网络和模型随机输出影响领域流程验证。
- 使用真实应用启动、真实 SQLite 和真实本地运行目录，验证 runtime 层、文件上下文和任务持久化真实可用。
- 新增结构化证据产物，例如 `report.md`、`evidence.json`、`agent-messages.json`、`planner-ticks.json`、`final-state.json`。
- 明确测试报告应能证明流程可行，并能对照前期领域预期。

## Capabilities

### New Capabilities
- `task-flow-proof-tests`: 提供任务领域端到端主流程证明测试与可视化证据产物。

### Modified Capabilities
- None.

## Impact

- `tests/integration/task-flow-proof.test.ts`
- `tests/support/` 或等价测试辅助目录
- `tests/artifacts/task-flow-proof/`
- 可能新增测试脚本或测试工具函数，但不改变生产业务逻辑

