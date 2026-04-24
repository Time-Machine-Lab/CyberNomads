## Why

当前产品模块只支持创建、更新、列表和详情读取，不支持删除。随着产品数据增多，用户需要能够清理不再使用的产品，避免列表中长期保留无效数据。

本次删除能力按 MVP 简化处理：删除产品时不检查是否被策略、引流工作或历史上下文引用；只负责删除产品模块自身管理的元数据与 Markdown 正文文件。

## What Changes

- 为产品模块新增删除接口。
- 删除产品元数据时同步删除该产品对应的 Markdown 正文文件。
- 删除不存在的产品时返回明确的 not found 错误。
- 删除过程应尽量避免出现“数据库已删但文件仍留存”或“文件已删但数据库仍显示产品”的不可观察状态。
- 不引入引用检查、软删除、归档、回收站、版本链或恢复能力。

## Capabilities

### Modified Capabilities
- `product-contracts`: 增加产品删除 API / SQL 契约语义。
- `product-module-runtime`: 增加产品删除运行时能力。

## Impact

- `openspec/specs/product-contracts/spec.md`
- `openspec/specs/product-module-runtime/spec.md`
- `docs/api/products.yaml` 或现有产品 API 文档
- `src/modules/products/`
- 产品元数据仓储与产品正文文件存储适配器
- `tests/integration/product-http.test.ts`
- 可能新增或扩展产品 service 单元测试

