## Why

CyberNomads 当前已有一组分散的前端设计稿，但这些设计稿混合了一级模块页、编辑页、详情页、空状态页和工作区内部子页面。若直接逐张转写，会导致导航结构失真、页面职责混乱、Mock 数据碎片化，并直接拖慢后续真实接口接入。

现在需要先把这些设计稿整合为一套统一的前端页面体系，明确页面层级、主链路和 Mock 数据组织方式，再按这一套结构推进实现。

## What Changes

- 将现有分散设计稿统一归并为五个一级模块：工作区、资产、策略、账号、Agent。
- 明确工作区执行台、任务干预页、Agent 空状态页、OpenClaw 配置页等内部页面的父子关系，不再将其作为一级入口。
- 定义前端统一路由结构，覆盖一级模块、编辑页、详情页和工作区任务子页。
- 定义领域化 Mock 数据能力，统一抽象工作区、资产、策略、账号、Agent、任务运行和干预记录等模型。
- 约束关键主链路，包括首次进入产品、基础资源准备、工作区创建与执行观察。
- 为后续 `cybernomads-ui` 实现提供明确任务拆分，避免静态页面转写与真实产品结构脱节。

## Capabilities

### New Capabilities
- `frontend-information-architecture`: 定义 CyberNomads 前端页面层级、一级模块边界、内部子页面归属与稳定路由结构。
- `frontend-core-workflows`: 定义前端必须支持的主交互链路，包括 Agent 初始化、资源准备、工作区创建、执行台观察和任务干预。
- `frontend-mock-data-runtime`: 定义面向页面实现的统一 Mock 数据模型、场景状态和 mock API 边界。

### Modified Capabilities

None.

## Impact

- Affected docs:
  - `docs/spec/Cybernomads前端开发规范.md`
  - `docs/design/Cybernomads前端页面整合设计文档.md`
- Affected frontend code areas:
  - `cybernomads-ui/src/app/router`
  - `cybernomads-ui/src/pages`
  - `cybernomads-ui/src/entities`
  - `cybernomads-ui/src/features`
  - `cybernomads-ui/src/widgets`
  - `cybernomads-ui/src/shared/api`
  - `cybernomads-ui/src/shared/mocks`
- No backend API or SQL contract changes are introduced in this change.
