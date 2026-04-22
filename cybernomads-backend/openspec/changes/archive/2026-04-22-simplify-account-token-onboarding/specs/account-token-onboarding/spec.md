## ADDED Requirements

### Requirement: Account token onboarding SHALL manage a pre-account onboarding session
账号令牌接入能力 SHALL 在稳定账号对象创建前维护一条独立的接入会话，用于承载平台选择、接入方式、challenge 摘要、待解析输入和当前会话状态。

#### Scenario: Start onboarding session for manual token input
- **WHEN** 用户选择某个平台并以手工录入方式开始新增账号接入
- **THEN** 系统 SHALL 创建一条新的账号接入会话并记录平台、接入方式和待解析输入引用
- **AND** 返回结果 SHALL 只暴露脱敏会话摘要，而不直接回显原始令牌内容

#### Scenario: Start onboarding session for QR access
- **WHEN** 用户选择某个平台并以扫码方式开始新增账号接入
- **THEN** 系统 SHALL 创建一条新的账号接入会话并返回 provider-neutral challenge 摘要供前端展示
- **AND** 该会话 SHALL 在令牌尚未解析成功前保持待处理状态

### Requirement: Account token onboarding SHALL resolve platform identity and candidate token before account creation
账号令牌接入能力 SHALL 允许平台脚本在“尚无稳定账号对象”的条件下解析平台身份、可读资料和候选令牌，并把这些结果记录到接入会话中。

#### Scenario: Resolve onboarding session successfully
- **WHEN** 平台能力对一条待处理接入会话完成令牌解析且校验成功
- **THEN** 系统 SHALL 在会话中记录解析出的 `platform + platformAccountUid`、可读资料摘要和候选令牌引用
- **AND** 系统 SHALL NOT 在此阶段自动创建账号或自动把候选令牌视为当前生效凭证

#### Scenario: Resolve onboarding session fails
- **WHEN** 平台能力无法从接入会话中解析出有效令牌或有效平台身份
- **THEN** 系统 SHALL 在会话中记录失败状态和失败原因
- **AND** 系统 SHALL NOT 创建、恢复或修改任何稳定账号对象

### Requirement: Account token onboarding SHALL finalize only from a verified onboarding session
账号令牌接入能力 SHALL 只允许从已经解析成功的接入会话完成最终新建、恢复或跳转既有账号的结果判定。

#### Scenario: Finalize creates or restores account
- **WHEN** 用户确认完成一条已验证接入会话，且解析出的平台身份当前不存在活跃账号对象或仅对应一个已逻辑删除账号
- **THEN** 系统 SHALL 创建新账号或恢复原账号对象，并把候选令牌写为该账号的当前生效令牌
- **AND** 接入会话 SHALL 被标记为已消费

#### Scenario: Finalize does not create duplicate account
- **WHEN** 用户确认完成一条已验证接入会话，且解析出的平台身份已经对应一个现存账号对象
- **THEN** 系统 SHALL 返回该现存账号对象的标识而不是创建重复账号
- **AND** 系统 SHALL NOT 以“新增账号”语义隐式替换该现存账号的当前生效令牌
