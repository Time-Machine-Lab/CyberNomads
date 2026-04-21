## Why

策略领域的边界和首版契约已经有了，但后端还没有任何真正可运行的策略模块实现。与此同时，上一轮契约把占位符建模成了“对象引用”，而这次确认后的真实需求是“参数化 Markdown 模板”：后端只需要保存策略正文、识别参数声明、返回结构化占位符契约，不负责真实对象绑定或运行时填值。

现在需要把策略模块从“领域文档 + 契约草案”推进到“可运行后端能力”，并在实现前先把顶层设计文档修正到最终语义，避免代码继续建立在旧的对象引用模型上。

## What Changes

- 实现策略模块的后端运行时能力：创建策略、更新策略、查询策略列表、查询策略详情。
- 实现策略元数据与正文分离存储：SQLite 保存最小元数据，文件系统保存 Markdown 原文。
- 将策略占位符从“对象引用”统一收敛为“参数占位符”，采用 `type + key + defaultValue` 的稳定契约，并在详情中返回解析结果。
- 在创建和更新时校验策略正文中的参数占位符语法，拒绝无法稳定解析或同一 `key` 冲突的声明。
- 保持“整篇快照插入”仍然只是 Markdown 语义，不新增独立插入接口，也不建立策略关系表。
- 在进入代码实现前，先更新 `docs/design/domain/`、`docs/api/` 和 `docs/sql/` 中与策略模块相关的顶层文档，使其与最终后端语义一致。
- 增加策略模块测试，覆盖创建、更新、列表、详情、摘要回填和占位符解析/校验。
- 当前阶段不实现删除、草稿/发布、真实对象绑定、运行时变量填充或编译接口。

## Capabilities

### New Capabilities
- `strategy-module-runtime`: 定义策略模块在后端运行时的实现行为，包括策略 CRUD、Markdown 内容存储、摘要回填和参数占位符解析。

### Modified Capabilities
- `strategy-contracts`: 将策略契约中的占位符语义从旧的对象引用模型修订为参数化模板模型，并明确 CRUD 接口只暴露模板声明而不承担运行时绑定。

## Impact

- Affected code:
  - `cybernomads-backend/src/modules/strategies/`
  - `cybernomads-backend/src/adapters/storage/sqlite/`
  - `cybernomads-backend/src/adapters/storage/file-system/`
  - `cybernomads-backend/src/app/`
- Affected docs:
  - `docs/design/domain/Cybernomads策略领域设计文档.md`
  - `docs/api/strategies.yaml`
  - `docs/sql/strategies.sql`
- Dependencies:
  - 依赖现有运行时基础能力提供 SQLite 文件与 `runtime/strategy/` 目录
  - 依赖已存在的策略契约文档作为修订基线
- Out of scope:
  - 策略删除
  - 草稿/发布/归档/版本链
  - 真实资源绑定与对象路由
  - 运行时占位符填值或独立编译接口
