## Why

当前账号模块虽然已经经历过一轮“包装账号 + connection attempt”重构，但整体心智模型依然偏向流程引擎，而不是面向真实使用体验的账号接入工作台：

- 账号详情同时背负账号资料编辑、连接尝试编排、可用性检查和最近流程回放，语义过重。
- `connection attempt / resolve / validate / availability check` 这一套动作名更像内部工作流，不像用户在“给账号接入令牌”。
- 账号主模型仍然把“是否可消费”作为核心责任，导致 `availabilityStatus` 继续反向主导前端列表和详情页体验。
- 领域文档仍保留“平台 UID 身份中心”和“受控可消费资源中心”的倾向，已经和当前产品确认的新方向不一致。
- 下一步需要接入真实平台能力时，现有抽象还没有把“平台接入提供者”和“业务策略”彻底分开，容易再次发生概念冲突。

用户已经明确确认新的设计前提：

- 账号是系统内部的包装对象，而不是平台自然人账号的唯一映射。
- 同一个平台 UID 出现在多个包装账号中是允许的。
- 不做兼容、适配或冗余代码，直接按新模型彻底重构。
- “策略模型”需要换成不与现有 `strategy` 域冲突的命名。
- 第一版先接通 Bilibili 的扫码登录和基于令牌获取用户信息，不做自动刷新令牌。

因此，这次 change 需要把账号模块整体升级为 V2：

- 账号主对象围绕包装信息和当前生效令牌组织
- 登录接入围绕 `access session` 组织
- 平台能力围绕 `PlatformAccessProvider` 组织
- Bilibili 作为第一版真实 provider 落地

## What Changes

- **BREAKING** 将账号领域从“可消费账号资源中心”重写为“账号接入中心”，账号主状态围绕生命周期和连接状态组织，可用性仅保留为诊断观察值，不再主导接入主流程。
- **BREAKING** 将短生命周期的登录过程资源从 `connection attempt` 重构为 `access session`，并改写 API、SQL、DTO、页面话术与日志语义。
- **BREAKING** 重写账号领域设计文档，明确账号对象不再以平台 UID 作为系统唯一身份，`resolvedPlatformAccountUid` 仅表示最近一次成功校验得到的平台资料。
- **BREAKING** 删除账号接入主流程中的独立 availability-check 动作，详情页的核心动作统一收敛为“输入/扫码拿到令牌 -> 验证连接 -> 生效”。
- 引入 `PlatformAccessProvider` 抽象与脚本命令执行层，显式避免与现有 `strategy` 域命名冲突。
- 为 Bilibili 落地第一版真实 provider，对接现有 `runtime-assets/skills/bilibili-web-api` 中的二维码登录与 `account self-get` 能力。
- 统一产品与前端话术为“令牌”，内部允许结构化凭证 payload 承载 `token`、`refreshToken`、平台用户快照和扩展字段。
- 重构账号列表页、新增页、详情页的数据职责与交互语义，同时保持现有高保真深色视觉风格。

## Capabilities

### New Capabilities
- `account-access-sessions`: 定义账号绑定的 access session 资源，覆盖手工令牌接入、二维码登录、轮询扫码、校验生效和 session 日志读取。

### Modified Capabilities
- `account-contracts`: 重写账号主对象契约，明确账号包装对象、当前令牌摘要、连接状态、已解析平台资料和 access session 的边界。
- `account-module-runtime`: 重写运行时语义，围绕账号包装对象、当前生效令牌和 access session 组织，不再把 availability 作为接入主流程门槛。
- `account-pages-frontend-integration`: 重写前端列表、新增、详情页的职责分工与交互动作，统一围绕账号接入工作台组织。
- `account-platform-capability-runtime`: 将平台能力抽象重写为 `PlatformAccessProvider` 风格的 start-qr / poll-qr / verify-token 能力。
- `bilibili-web-api-skill`: 增补用于后端 provider 调用的稳定脚本输出约束，确保二维码登录与账号资料读取能够被机器稳定消费。

### Retired Capabilities
- `account-connection-attempts`: 旧的 connection-attempt 语义将被 access session 模型替代。
- `account-token-onboarding`: 旧的 token onboarding 话术与残余流程将被统一的 access session 模型替代。

## Impact

- 顶层文档：
  - `docs/design/domain/Cybernomads账号池领域设计文档.md`
  - `docs/api/accounts.yaml`
  - `docs/api/account-access-sessions.yaml`
  - `docs/sql/accounts.sql`
  - `docs/sql/account_access_sessions.sql`
- OpenSpec：
  - 新增 `account-access-sessions`
  - 修改账号契约、账号运行时、前端集成、平台能力和 Bilibili skill 规格
  - 退役旧 `account-connection-attempts` 与 `account-token-onboarding` 主语义
- 后端：
  - 账号模块、access session 模块、平台 provider 抽象、Bilibili provider、脚本运行层、SQLite/secret/log store
- 前端：
  - 账号列表页、新增页、详情页
  - API 层、DTO、view-model、标签编辑、二维码区域、日志面板、状态映射
- 数据与兼容：
  - 允许破坏性重构现有 API、数据库表结构、前端交互和测试
  - 不保留旧 connection-attempt / onboarding / availability-check 主流程兼容代码

Ready for implementation after these artifacts are reviewed.
