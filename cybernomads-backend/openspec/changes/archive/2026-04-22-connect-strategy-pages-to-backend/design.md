## Context

当前策略前端位于 `cybernomads-ui/src/pages/strategies/`，但数据流和 UI 语义都仍处于演示阶段：

- [strategy-service.ts](/Users/mac/Code/CyberNomads/cybernomads-ui/src/entities/strategy/api/strategy-service.ts) 在 `useMockApi=false` 时会直接抛错，尚未接真实接口。
- [types.ts](/Users/mac/Code/CyberNomads/cybernomads-ui/src/entities/strategy/model/types.ts) 仍以 `id/markdown/moduleCount/status/platform/successRate/difficulty` 为核心字段，与后端真实契约不一致。
- [StrategiesListPage.vue](/Users/mac/Code/CyberNomads/cybernomads-ui/src/pages/strategies/list/ui/StrategiesListPage.vue) 使用固定 `strategyDisplayMap` 拼接热门卡片、成功率、难度和目标平台，这些都不是后端当前返回的数据。
- [StrategyEditorPage.vue](/Users/mac/Code/CyberNomads/cybernomads-ui/src/pages/strategies/editor/ui/StrategyEditorPage.vue) 仍然围绕“保存草稿 / 部署策略 / 对象引用 / 模块池”这套旧语义工作，而真实后端仅支持策略创建、更新、完整 Markdown 正文、标签和参数占位符。

另一方面，策略后端契约已经稳定：

- [strategies.yaml](/Users/mac/Code/CyberNomads/docs/api/strategies.yaml) 定义了列表、详情、创建、更新接口
- [Cybernomads策略领域设计文档.md](/Users/mac/Code/CyberNomads/docs/design/domain/Cybernomads策略领域设计文档.md) 已明确“整篇快照插入、参数占位符、无运行时绑定”

这意味着当前的主要问题不是“后端不够”，而是前端策略模块仍然在消费一套不兼容的旧 mock 模型。又因为工作区页面也在使用策略实体，所以这次改造还需要考虑对 `/workspaces` 的最小兼容。

## Goals / Non-Goals

**Goals:**
- 将策略列表页和策略编辑页切换到真实策略后端接口。
- 在前端建立与后端策略契约对齐的数据层，至少拆分为 DTO 与页面展示模型两层。
- 让策略列表页只展示真实存在的数据，并去掉演示型“部署效果面板”语义。
- 让策略编辑页围绕真实能力收敛为“名称 + 标签 + Markdown + 参数占位符 + 整篇插入辅助”。
- 为本地联调补齐策略模块专属的真实 API 路由方案，同时保持其他模块继续使用 mock。
- 对工作区页中策略实体的消费做最小兼容，避免本次换型引起无关回归。

**Non-Goals:**
- 不新增策略后端接口，不改 `docs/api/strategies.yaml` 或 `docs/sql/strategies.sql`。
- 不实现完整 Markdown 富文本编辑器，也不在本轮解决拖拽模块池。
- 不实现真正的参数值填写流程、运行时编译或对象绑定。
- 不把整个前端工程统一切到真实后端。
- 不追求策略页面最终视觉稿，只完成与真实契约一致的一期可用页面。

## Decisions

### 1. 策略模块采用“模块级真实 API 接入”，不依赖全局 mock 开关

**Decision**

- 策略模块前端将像账号模块一样，支持独立的 `mock/real` 数据源决策。
- 默认保持其他模块继续走 mock；策略模块可单独切到真实后端。

**Rationale**

- 当前资产、工作区等模块仍强依赖 mock runtime，全局关闭 mock 会让更多页面不可用。
- 策略模块已经具备完整后端 CRUD 能力，适合成为第二个“单模块真实接入”的样板。

**Alternatives Considered**

- 直接关闭 `VITE_USE_MOCK_API`
  - 放弃原因：会同时打断资产、工作区等未改造模块。

### 2. 前端策略数据层拆分为“后端 DTO + 前端页面模型”

**Decision**

- 新增与后端契约一一对应的 DTO 类型：`StrategySummaryDto`、`StrategyDetailDto`、`CreateStrategyInput`、`UpdateStrategyInput`、`StrategyPlaceholderDto`。
- 再通过 mapper 转成前端页面模型，前端页面统一消费归一化后的 `StrategyListItem` / `StrategyDetailRecord`。
- 前端归一化层保留 `id` 作为路由和组件内部统一标识，但映射自后端 `strategyId`。

**Rationale**

- 这可以把后端字段真值和 UI 展示派生彻底分开。
- 保留前端 `id` 能减少工作区页等既有代码的连锁改动。

**Alternatives Considered**

- 页面直接消费后端 DTO
  - 放弃原因：状态文案、空态和衍生展示会散落到各页面。
- 继续沿用旧 `StrategyRecord`
  - 放弃原因：会把 `status/moduleCount/platform/successRate` 这类历史字段继续带下去。

### 3. 策略列表页收敛为真实“策略库管理页”，去掉演示型指标

**Decision**

- 列表页只使用真实后端可提供的数据：名称、摘要、标签、更新时间。
- 保留列表页入口、创建入口和跳转编辑行为。
- 当前没有真实语义支撑的 UI 区块降级或移除：
  - featured 大卡的“成功率 / 平台 / 难度”
  - 固定热门标签
  - 伪筛选和伪视图切换

**Rationale**

- 后端当前返回的是内容管理型列表，而不是策略效果分析型列表。
- 继续保留这些伪指标只会让页面和真实业务长期错位。

**Alternatives Considered**

- 先继续保留卡片样式，只在内部伪造默认值
  - 放弃原因：会继续扩大 fake UI 的维护成本。

### 4. 策略编辑页按真实后端语义重写为“Markdown 模板编辑器”

**Decision**

- 编辑页顶部只保留真实可保存的核心字段：
  - 名称
  - 标签
  - 保存动作
- 中间主体以 `contentMarkdown` 为主编辑区。
- 左侧区域改为“已有策略列表”，支持读取策略摘要与点击插入整篇正文快照。
- 右侧区域改为“参数占位符辅助区”，基于后端 detail 返回的 `placeholders` 渲染。
- 去掉或降级以下旧语义：
  - 保存草稿 / 部署策略
  - 模块池
  - 对象引用
  - 假 frontmatter 展示
  - moduleCount

**Rationale**

- 这完全对齐当前策略域定义：Markdown 模板、整篇插入、参数占位符。
- 也能避免前端继续向“运行时编译器”方向过度设计。

**Alternatives Considered**

- 保留模块池，只把按钮文案改掉
  - 放弃原因：模块池本身不是后端当前能力，也不是你现在要的编辑模型。

### 5. 工作区页只做策略实体兼容，不顺手做策略体验增强

**Decision**

- `WorkspaceCreatePage` 和 `WorkspacesListPage` 继续复用策略列表接口，但只消费 `id/name/summary` 这类最小信息。
- 现有硬编码的策略 id -> 频率 / 风险 / glyph 映射若失去数据基础，应降级为更通用的展示。

**Rationale**

- 工作区页现在确实依赖策略实体，但本轮重点不是工作区视觉设计，而是策略页接后端。
- 做到“不断页面”即可，不把范围扩大成跨模块前端重构。

**Alternatives Considered**

- 维持工作区页全部旧策略展示映射
  - 放弃原因：这些映射本来就绑死在 mock strategy id 上，和真实策略库不兼容。

## Risks / Trade-offs

- [策略页面会从“炫技 demo”收敛成更朴素的内容管理页] → 先保证后端闭环和真实语义，再在下一轮基于真数据重新升级视觉层。
- [策略实体换型会波及工作区页面] → 通过前端 mapper 保留 `id` 兼容层，并只做最小消费改造。
- [编辑页左侧“整篇插入”如果直接插入正文，可能产生重复内容或不易回退] → 一期先采用显式插入动作与明确提示，不做自动 merge。
- [参数占位符辅助区如果完全依赖详情解析结果，编辑中实时性有限] → 一期可接受保存后刷新或本地轻量解析；不在本轮实现复杂实时 parser。
- [策略模块单独真实接入后，前端将同时存在 mock 模块与 real 模块] → 明确在实体 API 层隔离 source 决策，不让页面自己判断。

## Migration Plan

1. 在前端策略实体层新增 DTO、mapper 和真实 API 封装。
2. 改造策略列表页，先完成真实列表渲染与跳转链路。
3. 改造策略编辑页，完成详情加载、创建/更新保存、参数占位符辅助和策略整篇插入。
4. 对工作区页面中的策略消费做兼容调整。
5. 在开发环境补充策略模块真实 API 联调方案，并通过页面联调和前端测试确认行为稳定。

## Open Questions

- 编辑页左侧“已有策略列表”的搜索是一期就做本地过滤，还是先只做纯列表。
- 参数占位符辅助区是否需要在编辑中实时本地解析，还是允许保存后以接口返回为准。
- 整篇插入策略时，UI 是否需要立即包上注释标记占位壳，还是只做纯文本插入并留待下一轮增强。
