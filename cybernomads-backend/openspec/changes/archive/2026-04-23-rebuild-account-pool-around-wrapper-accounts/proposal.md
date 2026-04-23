## Why

当前账号池模块以“平台自然人账号唯一映射”为核心假设，要求在创建账号前先解析 `platformAccountUid`，再决定新建、恢复或命中既有账号。这个模型与当前产品使用习惯冲突：用户希望先创建一个系统内的运营包装账号，再在编辑页里通过手工令牌或扫码方式接入登录态、校验平台资料并查看日志。

随着账号页前后端已经接入真实数据，这种模型冲突已经同时体现在领域设计、API、数据库、前端页面职责和平台脚本调用语义上。现在需要一次彻底重构，把账号模块改造成以“账号包装对象 + 连接尝试” 为中心的新版本，并直接抛弃旧的 onboarding / authorization 双流程模型，不做兼容层。

## What Changes

- **BREAKING** 将账号主体从“平台唯一身份对象”重定义为“系统内的运营包装对象”，由 `accountId` 承担唯一身份，`resolvedPlatformAccountUid` 仅表示最近一次校验观察到的平台身份，可为空且允许重复。
- **BREAKING** 重写账号创建流程：新增账号只填写平台、内部显示名、标签、备注等基础信息，创建后默认进入“未登录”状态，不再要求 `platformAccountUid`。
- **BREAKING** 用统一的“账号连接尝试”替代现有“新增账号接入会话 + 已有账号授权尝试”双模型，统一承载手工令牌录入、扫码获取令牌、校验、日志和令牌切换语义。
- **BREAKING** 重写账号详情页职责：详情页成为唯一主工作台，左侧管理基础信息，右上执行令牌输入 / 二维码接入 / 校验，右下展示本次连接尝试日志；新增页只做最小建档。
- 重写账号状态模型，使其直接面向前端体验表达 `not_logged_in / connecting / connected / login_failed / expired` 等登录状态，同时保留生命周期与可用状态。
- 重写平台能力抽象，使“根据令牌拿用户资料”“扫码登录后获取令牌”“输出校验日志”成为同一连接尝试流程里的平台能力，而不是分散在 onboarding 和 authorization 两条路径。
- 更新 `docs/design/`、`docs/api/`、`docs/sql/`、OpenSpec 主规格、后端模块、前端页面与测试，删除旧模型相关的兼容代码、适配逻辑和冗余概念。
- 保持账号池页面的视觉风格与参考稿一致，延续深色、玻璃面板、霓虹青色强调、Space Grotesk/Inter 字体与高密度控制台风格，但允许布局和交互按新模型重组。

## Capabilities

### New Capabilities
- `account-connection-attempts`: 定义账号绑定的统一连接尝试能力，覆盖手工令牌、扫码接入、平台资料校验、日志输出、令牌生效与最近一次尝试读取。

### Modified Capabilities
- `account-contracts`: 将账号契约重写为“包装对象 + 连接尝试”模型，废弃创建前必须解析平台 UID 的约束，并改写顶层 API / SQL 契约。
- `account-module-runtime`: 将运行时模型重写为允许未登录账号先存在，并围绕连接尝试、登录状态和最近解析资料组织主流程。
- `account-pages-frontend-integration`: 将前端账号页重写为“新增页最小建档 + 详情页主工作台”模式，并保持既有高保真 UI 风格。
- `account-platform-capability-runtime`: 将平台能力重写为面向统一连接尝试的脚本调用抽象，覆盖获取二维码、解析令牌、获取用户资料和输出日志。
- `account-token-onboarding`: 废弃“新增账号前置 onboarding session”模型，用账号绑定的连接尝试替换其职责。

## Impact

- 顶层文档：
  - `docs/design/domain/Cybernomads账号池领域设计文档.md`
  - `docs/api/accounts.yaml`
  - 新的连接尝试 API 契约文件
  - `docs/sql/` 下账号主表与连接尝试表契约
- 后端：
  - `src/modules/accounts/`
  - 新的连接尝试模块与控制器
  - `src/ports/account-platform-port.ts`
  - SQLite 仓储、secret store 使用方式、运行时 SQL 资产
- 前端：
  - 账号列表页、新增页、详情页
  - 账号 API 层与 view-model
  - 账号连接日志展示与状态映射
- 数据与兼容：
  - 允许直接破坏性重构现有数据库表、API 契约、前端交互和测试
  - 不保留旧 onboarding session 或旧 authorization attempt 的兼容路径
