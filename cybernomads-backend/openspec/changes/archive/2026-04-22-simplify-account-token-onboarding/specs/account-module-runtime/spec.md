## ADDED Requirements

### Requirement: Account runtime SHALL support token-first onboarding before stable account creation
账号运行时 SHALL 支持在稳定账号对象尚未创建前，通过独立接入会话完成平台 challenge 获取、令牌解析和身份确认。

#### Scenario: Start onboarding session without platform account UID
- **WHEN** 用户以新增账号语义发起令牌接入，且尚未掌握 `platformAccountUid`
- **THEN** 运行时 SHALL 创建接入会话并记录平台、接入方式和待解析状态
- **AND** 运行时 SHALL NOT 为这次流程提前创建一个缺失稳定身份的账号对象

#### Scenario: Verified onboarding session records resolved identity
- **WHEN** 平台能力成功解析接入会话并返回平台身份、资料和候选令牌
- **THEN** 运行时 SHALL 把这些解析结果记录到接入会话
- **AND** 运行时 SHALL 保持该结果处于“待最终确认”状态，而不是立即完成账号创建

### Requirement: Account runtime SHALL finalize verified onboarding sessions into stable account semantics
账号运行时 SHALL 基于已验证接入会话的解析结果完成新建、恢复或返回既有账号引用的判定，并保证同一平台身份不会出现重复账号对象。

#### Scenario: Finalize verified session creates or restores the stable account
- **WHEN** 一条已验证接入会话被最终确认，且解析出的平台身份不存在现存账号或只对应一个已逻辑删除账号
- **THEN** 运行时 SHALL 创建新账号或恢复原账号，并把候选令牌切换为当前生效令牌
- **AND** 运行时 SHALL 更新该账号的授权语义，使其与新生效令牌保持一致

#### Scenario: Finalize verified session returns existing account reference
- **WHEN** 一条已验证接入会话被最终确认，且解析出的平台身份已经对应一个现存账号对象
- **THEN** 运行时 SHALL 返回该账号对象的引用而不是创建重复账号
- **AND** 运行时 SHALL NOT 以新增流程隐式完成对该账号的令牌替换

## MODIFIED Requirements

### Requirement: Account runtime SHALL delegate platform-specific authorization and availability work through account platform capability abstraction
The backend account runtime SHALL complete onboarding session start, onboarding token resolution, authorization start, authorization verification, and availability evaluation by invoking the provider-neutral account platform capability abstraction rather than embedding platform-specific script behavior in the account module itself.

#### Scenario: Onboarding resolution uses platform capability result
- **WHEN** 账号运行时处理一条新增账号接入会话的 challenge 获取或令牌解析
- **THEN** 它 SHALL 调用匹配平台的 account platform capability 实现
- **AND** 运行时 SHALL 根据规范化返回结果更新接入会话状态，而不是直接理解脚本级 payload 细节

#### Scenario: Authorization verification uses platform capability result
- **WHEN** the account runtime verifies a pending authorization attempt
- **THEN** it SHALL invoke the matching account platform capability implementation for the account's platform
- **AND** the runtime SHALL derive credential switching and status updates from the normalized verification result rather than from platform-specific script payload rules

#### Scenario: Availability check uses platform capability result
- **WHEN** the account runtime performs an account availability check
- **THEN** it SHALL invoke the matching account platform capability implementation
- **AND** the runtime SHALL persist the resulting availability outcome and reason summary to the account state
