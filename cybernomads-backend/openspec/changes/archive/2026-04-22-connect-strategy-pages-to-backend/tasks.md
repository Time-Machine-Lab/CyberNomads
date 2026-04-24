## 1. Strategy Frontend Data Layer

- [x] 1.1 在 `cybernomads-ui/src/entities/strategy/` 中重建与后端契约对齐的 DTO、展示模型和 mapper，替换旧的 mock `StrategyRecord` 结构
- [x] 1.2 将策略模块 API 封装改造为支持真实 HTTP 请求，覆盖列表、详情、创建和更新，同时保持非策略模块继续使用 mock
- [x] 1.3 在 `cybernomads-ui` 开发环境中补齐策略模块本地联调所需的 `/api` 转发方案，并明确策略模块真实后端接入方式

## 2. Strategy List Page

- [x] 2.1 改造 `cybernomads-ui/src/pages/strategies/list/`，使列表页基于后端 `StrategySummary` 渲染策略行和最小管理信息
- [x] 2.2 清理或降级当前列表页中依赖假数据的热门卡片、成功率、平台、难度、部署态和伪筛选/伪视图切换语义
- [x] 2.3 为列表页补齐加载态、空态、错误态以及创建/编辑跳转后的刷新行为

## 3. Strategy Editor Page

- [x] 3.1 改造 `cybernomads-ui/src/pages/strategies/editor/`，使用后端 `StrategyDetail` 渲染编辑页，并以 `contentMarkdown` 作为核心编辑对象
- [x] 3.2 将当前保存动作改造为真实创建/更新流程，只提交后端支持的名称、摘要、标签和 Markdown 正文字段
- [x] 3.3 将左侧区域改造为“已有策略列表 + 整篇插入辅助”，并将右侧区域改造为基于后端 `placeholders` 的参数占位符辅助区

## 4. Compatibility And Verification

- [x] 4.1 对 `cybernomads-ui/src/pages/workspaces/` 中的策略消费做最小兼容改造，确保工作区创建页和列表页在策略实体换型后继续可用
- [x] 4.2 补充策略模块前端数据映射和核心页面行为测试，覆盖 DTO 到 UI 展示模型转换、列表加载和编辑保存主流程
- [x] 4.3 进行本地联调冒烟验证，确认 `/strategies`、`/strategies/new` 和 `/strategies/:strategyId/edit` 在“策略模块真实后端 + 其他模块仍为 mock”的条件下可正常访问和操作
