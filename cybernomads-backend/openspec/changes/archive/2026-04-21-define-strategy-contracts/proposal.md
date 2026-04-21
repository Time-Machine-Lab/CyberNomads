## Why

策略领域设计已经明确了策略模块的核心语义：策略是独立的 Markdown 提示词资产，支持整篇快照插入、对象占位符声明和对外提供可编译输入。但当前后端侧还没有对应的顶层 API 契约和 SQL 契约，这会让后续实现重新退回到按前端草案或临时接口反推后端的路径。

现在需要先补齐策略模块的顶层契约，把“最小元数据 + 正文引用 + 列表/详情边界 + 占位符与导入块的语义承载方式”稳定下来，为后续运行时实现提供明确来源。

## What Changes

- 新增策略模块的顶层能力契约，定义创建、更新、列表和详情四类 MVP 对外行为。
- 新增 `docs/api/strategies.yaml`，明确策略模块的请求与响应模型，并保持与当前策略领域设计一致。
- 新增 `docs/sql/strategies.sql`，定义策略模块的最小结构化存储边界，确保 Markdown 正文继续通过 `content_ref` 方式与文件系统原文关联。
- 明确策略详情同时承担完整正文读取能力，并允许在详情或模块内部能力中承载占位符解析结果，而不把“整篇插入”单独建成后端接口。
- 明确导入块标记通过 Markdown 注释直接内嵌在正文中持久化，不额外引入专用字段或额外关系表来表达策略间组合。
- 明确 `summary` 采用优雅降级方案：API 允许显式传入；若未提供，后续运行时可从正文自动派生。
- 当前阶段不定义策略删除、草稿/发布状态、版本链、实验统计、运行成效指标，也不定义对象绑定路由能力。

## Capabilities

### New Capabilities
- `strategy-contracts`: 定义策略模块的顶层 API 与 SQL 契约，覆盖策略创建、更新、列表、详情、最小元数据边界、正文引用关系，以及导入块标记和对象占位符在契约层的语义约束。

### Modified Capabilities
- None.

## Impact

- Affected docs:
  - `docs/design/domain/Cybernomads策略领域设计文档.md`
  - `docs/api/strategies.yaml`
  - `docs/sql/strategies.sql`
  - `openspec/specs/strategy-contracts/spec.md`
- Future affected code:
  - `src/modules/strategies/`
  - `src/adapters/storage/sqlite/`
  - `src/adapters/storage/file-system/`
- Affected systems:
  - 本地策略配置流程
  - 后续引流工作与任务规划对策略正文的消费边界
  - 后续对象绑定流程对策略占位符的读取方式
- Out of scope:
  - 策略模块运行时代码实现
  - 独立的“整篇插入”后端 HTTP 接口
  - 策略删除、版本管理、草稿/发布状态机
  - 对象绑定路由、任务拆分与执行调度
