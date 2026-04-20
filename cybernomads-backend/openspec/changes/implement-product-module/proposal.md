## Why

产品领域边界已经明确，产品模块的业务功能也已经收敛为创建、更新、列表、详情和完整上下文提供，但当前后端代码里仍然没有任何产品模块实现。这意味着策略域、引流工作域和后续任务规划都还拿不到稳定的产品输入，产品领域设计也无法真正转化为可运行能力。

现在需要在契约提案完成后，正式实现产品模块的领域对象、应用服务、HTTP 能力、存储适配和测试闭环，把产品模块从“文档定义”推进到“可运行能力”。

## What Changes

- 实现产品模块的核心业务能力：创建产品、更新产品、查询产品列表、查询产品详情。
- 实现“产品详情返回完整 Markdown 正文”的业务行为，使其可直接承担当前阶段的完整产品上下文能力。
- 实现产品模块的领域模型、应用服务和 HTTP Controller。
- 对接产品模块的 SQLite 存储与正文内容持久化能力。
- 增加产品模块的测试，覆盖创建、更新、列表、详情和完整上下文场景。
- 依赖并对齐产品契约提案中的 `docs/api/` 与 `docs/sql/` 文档，在进入代码开发前先校验或补充对应顶层文档。
- 当前阶段不实现产品删除、不实现产品状态机、不实现版本管理。

## Capabilities

### New Capabilities
- `product-module-runtime`: 定义产品模块在后端运行时的实现行为，包括产品创建、更新、列表、详情和完整上下文提供。

### Modified Capabilities

None.

## Impact

- Affected code:
  - `src/modules/products/`
  - `src/app/`
  - `src/adapters/storage/`
  - `src/index.ts`
- Affected docs:
  - `docs/api/` 产品模块接口文档需在实现前完成校验或补充
  - `docs/sql/` 产品模块 SQL 文档需在实现前完成校验或补充
- Dependencies:
  - `define-product-contracts` 变更应先完成或至少先提供可用契约
  - `initialize-runtime-foundation` 提供运行时目录与 SQLite 基础能力
- Out of scope:
  - 产品删除
  - 产品版本管理
  - 产品发布/归档/审核状态
