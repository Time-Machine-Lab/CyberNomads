## Why

任务契约定义完成后，需要后端提供稳定的任务模块来管理任务集合、任务状态、执行条件、输入需求和产出记录。没有该模块，线程规划器无法读取任务，Agent 执行 Skill 无法通过受控工具回写任务状态和产出记录，引流工作创建/更新后的 Agent 拆分结果也没有可靠的落库入口。

## What Changes

- 实现 `src/modules/tasks/` 后端模块，包括类型、错误、服务、控制器和仓储端口。
- 实现任务列表、详情、状态更新、产出记录创建与查询。
- 实现按引流工作批量创建任务集、替换当前任务集的受控能力，服务引流工作任务拆分集成。
- 实现 SQLite 仓储与 runtime SQL 资产，同步 `docs/sql/tasks.sql`。
- 将任务控制器接入 HTTP server，并补齐单元测试与集成测试。

## Capabilities

### New Capabilities
- `task-module-runtime`: 实现任务领域后端运行时，使任务对象、任务集、状态和产出记录可被系统稳定读写。

### Modified Capabilities
- None.

## Impact

- `src/modules/tasks/`
- `src/ports/task-store-port.ts`
- `src/adapters/storage/sqlite/tasks-sqlite-repository.ts`
- `runtime-assets/sql/*-tasks.sql`
- `src/app/http-server.ts`
- `tests/unit/task-service.test.ts`
- `tests/integration/task-http.test.ts`

