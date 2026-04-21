## Why

当前账号池前端页面仍然建立在初稿 mock 数据模型之上，列表页和详情页的展示字段、状态语义与真实后端账号模块契约并不一致。现在后端账号模块已经具备稳定的 HTTP 接口和运行时主链路，前端需要尽快完成页面改造和真实接口接入，避免账号模块继续停留在“UI 有壳、业务未接通”的状态。

## What Changes

- 将账号模块前端从 mock-only 数据流切换到真实后端账号接口，覆盖账号列表、账号详情、基础资料更新、逻辑删除、恢复、授权尝试、授权验证和可用性检查。
- 重构前端账号实体模型，建立“后端 DTO + 前端展示映射”两层结构，替换当前 `id/name/owner/uid/status` 的旧 mock 模型。
- 改造账号列表页和详情页，使页面动作与后端真实语义一致：
  - 列表页基于真实账号摘要展示平台、身份、标签和状态。
  - 详情页按后端可编辑边界只开放显示名、备注、标签和平台扩展字段编辑。
  - “保存凭证配置”“验证连接”等动作重写为真实授权与可用性检查流程。
- 将当前不受后端契约支持的交互降级为占位或禁用态，包括二维码图片展示、敏感凭证原文回显、凭证历史记录和终端日志面板。
- 补齐前端本地联调所需的 API 接线方案，使账号模块可以在不影响其他仍为 mock 的模块前提下独立接入真实后端。

## Capabilities

### New Capabilities
- `account-pages-frontend-integration`: 定义账号池前端页面与真实账号后端契约的接入行为、页面状态映射和一期可交付交互边界。

### Modified Capabilities
- 无

## Impact

- Affected code:
  - `cybernomads-ui/src/entities/account/**`
  - `cybernomads-ui/src/pages/accounts/**`
  - `cybernomads-ui/src/shared/api/**`
  - `cybernomads-ui/vite.config.ts`
- APIs:
  - 复用现有 `docs/api/accounts.yaml` 对应的账号模块 HTTP 接口，不新增顶层 API 契约。
- SQL:
  - 不涉及 `docs/sql/accounts.sql` 变更。
- Systems:
  - 前端开发环境将需要一层账号模块真实 API 联调能力，同时保持其他模块继续使用 mock 数据。
