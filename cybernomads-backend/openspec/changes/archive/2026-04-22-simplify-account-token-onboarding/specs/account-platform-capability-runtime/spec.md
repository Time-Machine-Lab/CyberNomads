## ADDED Requirements

### Requirement: Account platform capability runtime SHALL support onboarding without an existing account snapshot
账号平台能力运行时 SHALL 支持在没有既有账号对象快照的情况下开始令牌接入并解析平台身份，以适配新增账号接入会话。

#### Scenario: Onboarding start returns a provider-neutral challenge
- **WHEN** 账号模块为新增账号接入会话发起交互式令牌接入，例如扫码登录
- **THEN** 平台能力 SHALL 返回 provider-neutral 的 challenge 结果
- **AND** 返回值 SHALL 足以让账号模块和前端展示 challenge，而不暴露脚本函数名或脚本专有返回结构

#### Scenario: Onboarding resolution returns normalized identity and candidate token
- **WHEN** 平台能力在无既有账号对象的情况下完成令牌解析
- **THEN** 它 SHALL 返回规范化的平台身份、可读资料和候选令牌材料
- **AND** 账号模块 SHALL NOT 需要知道平台脚本内部使用的是 token、cookie 还是其他底层载荷形式

## MODIFIED Requirements

### Requirement: Account platform capability runtime SHALL support authorization start and verification semantics
The backend account platform capability runtime SHALL provide a unified way to start an authorization-related platform action and to verify an authorization attempt result for different authorization methods, while keeping existing-account token replacement aligned with the same normalized credential semantics used by onboarding.

#### Scenario: Interactive authorization start returns a provider-neutral challenge result
- **WHEN** the account runtime starts an interactive authorization attempt such as `qr_authorization`
- **THEN** the platform capability SHALL return a provider-neutral start result that can describe any required challenge or next-step material
- **AND** the returned result SHALL avoid leaking platform script implementation details into the account service layer

#### Scenario: Existing-account token verification returns normalized account material
- **WHEN** the account runtime verifies an authorization attempt created for replacing an existing account's token
- **THEN** the platform capability SHALL return a normalized verification result containing verification outcome, resolved account identity information, and candidate credential material
- **AND** the account runtime SHALL NOT need direct knowledge of script-specific payload structures
