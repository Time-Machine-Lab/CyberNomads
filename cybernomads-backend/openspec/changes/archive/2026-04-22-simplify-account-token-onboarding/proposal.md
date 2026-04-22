## Why

当前账号模块的新增与换令牌流程，在产品语义、前端页面和后端契约三层都没有对齐。列表页没有真正的新增入口；详情页把手工录入和扫码授权拆成两块，并继续暴露 `token/cookie/session` 这类实现差异；后端则仍以“先有 `platformAccountUid`，再做账号创建或授权尝试”为主路径，无法优雅支持“先拿令牌，再解析平台身份，再决定新建/恢复/替换”的流程。

根据现有账号池领域设计，稳定账号对象、当前生效凭证、待验证授权尝试三者必须保持语义隔离，同时平台接入又必须通过统一脚本能力完成。现在需要补上一套“账号接入会话”能力，把新增账号和已有账号换令牌都收敛到统一的令牌接入语义上，并同步调整前后端契约。

## What Changes

- 新增独立的“账号令牌接入会话”能力，用于在稳定账号对象创建前，承载平台选择、扫码 challenge、手工令牌录入、平台身份解析和最终创建/恢复账号的流程。
- 调整账号模块后端需求边界，使新增账号支持“令牌优先”路径：
  - 先发起接入会话并获取 challenge 或提交令牌。
  - 再由平台脚本解析平台账号身份、可读资料和候选令牌。
  - 最后由用户确认完成新建或恢复，而不是先要求录入 `platformAccountUid`。
- 修改已有账号的换令牌契约，使授权尝试启动结果可以返回 challenge 摘要，详情页能够在同一块“令牌接入”区域中承载扫码和手工录入两种方式，但仍保持“待验证授权尝试不提前替换当前生效凭证”的领域约束。
- 对外统一用户侧术语为“令牌接入/更换令牌”；内部运行时和平台适配层仍保留凭证抽象，以兼容不同平台脚本返回的结构化材料。
- 更新前端账号页面需求：
  - 列表页增加真实“新增账号”入口。
  - 新增账号页或接入页承载账号接入会话流程。
  - 详情页将手工录入和扫码授权合并为统一的令牌接入区，并允许用户在解析成功后决定是否替换当前令牌。
- 明确补齐顶层契约文档：
  - 修改 `docs/api/accounts.yaml`
  - 新增 `docs/api/account-onboarding-sessions.yaml`
  - 新增 `docs/sql/account_onboarding_sessions.sql`

## Capabilities

### New Capabilities
- `account-token-onboarding`: 定义账号创建前的令牌接入会话、扫码 challenge、平台身份解析，以及基于已验证会话完成新建/恢复账号的行为边界。

### Modified Capabilities
- `account-contracts`: 账号顶层 API/SQL 契约需要补充接入会话资源，并调整已有账号换令牌接口的 challenge 返回语义。
- `account-module-runtime`: 账号运行时需要支持“令牌优先”的新增账号流程，并维持已有账号替换令牌时的待验证隔离约束。
- `account-platform-capability-runtime`: 平台抽象能力需要覆盖 challenge 生成、令牌解析身份资料，以及统一脚本输入输出语义。
- `account-pages-frontend-integration`: 账号列表页、接入页和详情页需要围绕统一令牌接入流程重新定义前端对接要求。

## Impact

- Affected code:
  - `cybernomads-backend/src/modules/accounts/**`
  - `cybernomads-backend/src/ports/account-platform-port.ts`
  - `cybernomads-backend/src/adapters/platform/**`
  - `cybernomads-ui/src/pages/accounts/**`
  - `cybernomads-ui/src/app/**`
- APIs:
  - 修改现有账号 Controller 对应的 `docs/api/accounts.yaml`
  - 新增账号接入会话 Controller 对应的 `docs/api/account-onboarding-sessions.yaml`
- SQL:
  - 新增账号接入会话表对应的 `docs/sql/account_onboarding_sessions.sql`
- Systems:
  - 前端账号新增入口、账号接入页和详情页令牌接入区都将重新对接后端
  - 平台脚本适配层需要支持在“无既有账号对象”的情况下解析身份与令牌材料
