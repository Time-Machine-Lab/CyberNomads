## Why

CyberNomads 现有前端第一版已经把模块结构、主链路和 mock 运行时搭了起来，但交付结果仍偏向产品骨架，和参考设计稿在视觉语言、页面壳、面板层次、信息密度和关键交互表现上存在明显偏差。当前需要把这一版从“可走通”提升到“高保真可验收”，确保网页端在整体氛围和页面样式上与设计参考保持高度一致。

这次变更的重点不是新增页面，而是重建前端的视觉层和交互呈现层，让现有工作区、资源模块和 Agent 模块以统一壳层和高保真页面完成交付准备。

## What Changes

- 新增高保真前端视觉规格，约束全局壳层、侧边栏、顶部区域、面板材质、字体层级、间距、状态色和占位资源策略。
- 统一定义桌面端页面壳，基于参考稿重建左侧中文导航、可折叠侧边栏、品牌标识和模块级导航状态。
- 细化工作区执行台、工作区列表、Agent 空状态、OpenClaw 配置页等关键页面的高保真还原要求，明确哪些页面是一级页、哪些是编辑页或内部子页。
- 补充关键交互要求，包括执行台内的节点查看、日志观察、干预入口、编辑页的保存反馈、空状态到配置页的跳转和列表到详情页的过渡行为。
- 提升 mock 运行时要求，使其支持高信息密度页面所需的脚本化状态、日志流、占位截图和资源降级方案，而不是仅提供基础功能数据。
- 明确本次变更不涉及后端 API、SQL 或接口契约调整；若后续真实接口与页面表现不匹配，需要由后端文档另行补齐。

## Capabilities

### New Capabilities
- `frontend-visual-fidelity`: 定义 CyberNomads 网页端的高保真视觉还原标准，包括统一桌面壳层、中文侧边栏、品牌表达、面板材质、页面级样式对齐和缺失资源占位策略。

### Modified Capabilities
- `frontend-core-workflows`: 将现有主链路要求从“可完成流程”提升为“在高保真页面内可完成流程”，补充执行台、列表页、编辑页和空状态页的关键交互呈现要求。
- `frontend-mock-data-runtime`: 扩展 mock 运行时以支持高保真页面所需的脚本化运行状态、日志密度、截图占位资源和视觉降级策略。

## Impact

- Affected docs:
  - `docs/spec/Cybernomads前端开发规范.md`
  - `docs/spec/DESIGN.md`
  - `docs/design/Cybernomads前端页面整合设计文档.md`
- Affected frontend code areas:
  - `cybernomads-ui/src/app`
  - `cybernomads-ui/src/pages`
  - `cybernomads-ui/src/widgets`
  - `cybernomads-ui/src/features`
  - `cybernomads-ui/src/entities`
  - `cybernomads-ui/src/shared/ui`
  - `cybernomads-ui/src/shared/styles`
  - `cybernomads-ui/src/shared/assets`
  - `cybernomads-ui/src/shared/mocks`
- Reference UI assets:
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_4`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_6`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_9`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/_11`
  - `/Users/mac/Code/CyberNomads/temp/stitch_cybernomads_traffic_orchestrator/agent_openclaw`
- No backend API or SQL contract changes are introduced in this change. The top-level `docs/api` and `docs/sql` directories currently contain no concrete contract files to modify.
