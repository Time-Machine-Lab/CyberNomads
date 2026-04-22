## Why

即使引流工作域已有领域设计，当前后端仍然没有对应的运行时模块、控制器、状态仓储和测试骨架。若不尽快把它落成后端模块，后续前端工作区、Agent 上下文准备、任务执行入口都没有稳定承接点。

## What Changes

- 新增引流工作运行时 capability，对应后端 `traffic-works` 模块的聚合管理、读写流程和生命周期状态机。
- 实现引流工作创建、列表、详情、启动、暂停、更新、结束、归档、删除的应用层与 HTTP 入口。
- 实现引流工作创建/更新时的上下文准备编排语义，包括与 Agent 服务交互后的 `prepared` / `failed` 状态回写。
- 为引流工作模块补齐 SQLite / 文件系统适配边界与测试覆盖。

## Capabilities

### New Capabilities
- `traffic-work-runtime`: 落地引流工作域的后端运行时实现，包括状态流转、读模型和上下文准备编排语义。

### Modified Capabilities
- None.

## Impact

- `src/modules/traffic-works/`
- `src/ports/`
- `src/adapters/storage/sqlite/`
- `src/adapters/storage/file-system/`
- `src/app/http-server.ts`
- `tests/unit/`
- `tests/integration/`
- 依赖 `define-traffic-work-contracts` 产出的 API / SQL / 主规格契约
