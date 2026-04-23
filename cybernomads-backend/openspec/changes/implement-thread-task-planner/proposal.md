## Why

任务模块只负责保存任务和状态，但任务还需要被 MVP 的线程规划器持续发现和提交执行。没有线程规划器，`cron` 与 `rely_on` 只会停留在任务元数据中，无法驱动任务运行。

该提案需要明确它是“线程决策”的 MVP 实现，不是 Agent 自主规划，也不是完整队列系统。它只扫描运行中的引流工作、判断 ready 任务是否满足条件，并通过 Agent 服务抽象提交执行。

## What Changes

- 新增线程任务规划器 capability，随应用启动和停止。
- 周期性扫描处于 `running` 引流工作下的 `ready` 任务。
- 基于任务条件评估可执行性，当前支持 `cron` 与 `rely_on` 的 MVP 判断语义。
- 对可执行任务执行“标记 running + 提交 Agent 服务 + 继续扫描”的 fire-and-forget 分发流程。
- 明确提交失败、running 任务滞留、进程重启恢复等复杂容灾暂不做自动处理。
- 不实现 Agent 规划、不实现失败重试、不实现手动恢复和复杂并发控制。

## Capabilities

### New Capabilities
- `thread-task-planner`: 实现当前 MVP 的线程规划能力，负责发现可执行任务并提交给 Agent 服务执行。

### Modified Capabilities
- None.

## Impact

- `src/app/`
- `src/modules/tasks/`
- `src/modules/traffic-works/`
- `src/modules/agent-access/`
- 新增 planner / dispatcher 相关应用服务
- `tests/unit/`
- `tests/integration/`

