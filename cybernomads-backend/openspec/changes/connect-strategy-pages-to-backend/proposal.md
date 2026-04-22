## Why

当前策略前端页面仍然建立在 mock 数据和演示语义之上，列表页展示大量后端并不存在的“成功率 / 平台 / 难度 / 部署状态”字段，编辑页也仍然围绕“模块池、对象引用、草稿/部署”这套旧 UI 假设工作。与此同时，策略后端模块已经完成真实 CRUD、Markdown 正文存储和参数占位符解析，前端如果继续停留在 demo 形态，策略模块就无法形成真正可用的闭环。

现在需要把 `/strategies`、`/strategies/new` 和 `/strategies/:strategyId/edit` 改造成真实接后端的一期页面，并把前端策略实体层、API 层和相关工作区兼容点一起收敛到后端真实契约。

## What Changes

- 将策略模块前端从 mock-only 数据流改造为支持真实后端接口，覆盖策略列表、详情读取、创建和更新。
- 重构前端策略实体模型，建立“后端 DTO + 前端展示模型 / mapper”两层结构，对齐真实字段：`strategyId/name/summary/tags/contentMarkdown/placeholders/updatedAt`。
- 改造策略列表页，使其基于真实后端列表结果渲染，不再依赖硬编码的 featured 卡片、成功率、平台、难度和部署标签。
- 改造策略编辑页，使页面围绕真实后端能力收敛为“名称 + 标签 + Markdown 编辑 + 参数占位符辅助 + 已有策略整篇插入”。
- 将旧的“对象引用”辅助区改造为参数占位符辅助区，只展示 `type/key/defaultValue`，不展示旧资源绑定语义。
- 将“保存草稿 / 部署策略”重写为统一保存语义，不再要求前端提交后端不存在的 `status/platform/category/successRate/difficulty/moduleCount` 字段。
- 为前端本地联调补齐策略模块专属的真实 API 接入方式，同时保持其他尚未改造的模块继续使用 mock。
- 对工作区相关页面中策略实体的消费做最小兼容改造，避免策略实体换型后影响 `/workspaces` 与 `/workspaces/new` 的现有行为。

## Capabilities

### New Capabilities
- `strategy-pages-frontend-integration`: 定义策略库列表页、策略编辑页与真实策略后端契约的接入行为、页面状态边界和一期可交付交互。

### Modified Capabilities
- 无

## Impact

- Affected code:
  - `cybernomads-ui/src/entities/strategy/**`
  - `cybernomads-ui/src/pages/strategies/**`
  - `cybernomads-ui/src/pages/workspaces/**`
  - `cybernomads-ui/src/shared/api/**`
  - `cybernomads-ui/src/shared/config/env.ts`
  - `cybernomads-ui/vite.config.ts`
- APIs:
  - 复用现有 [strategies.yaml](/Users/mac/Code/CyberNomads/docs/api/strategies.yaml) 对应的策略后端接口，不新增顶层 API 契约
- SQL:
  - 不涉及 [strategies.sql](/Users/mac/Code/CyberNomads/docs/sql/strategies.sql) 变更
- Systems:
  - 前端开发环境需要支持策略模块真实 API 联调，同时保持其他模块继续走 mock 数据
