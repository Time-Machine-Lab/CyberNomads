## ADDED Requirements

### Requirement: Account contracts SHALL publish token onboarding session contracts before stable account creation
账号顶层契约 SHALL 在稳定账号对象创建前发布独立的账号接入会话 API 和 SQL 契约，以覆盖接入会话启动、challenge 返回、身份解析结果读取和最终完成接入的行为。

#### Scenario: API contract uses a dedicated onboarding session controller
- **WHEN** 顶层 API 契约补充新增账号接入能力
- **THEN** 系统 SHALL 在独立的 `docs/api/account-onboarding-sessions.yaml` 中定义账号接入会话 Controller 的请求与响应
- **AND** 普通账号详情契约 SHALL 不因为新增流程而承担接入会话的临时状态读写职责

#### Scenario: SQL contract uses a dedicated onboarding session table
- **WHEN** 顶层 SQL 契约补充新增账号接入能力
- **THEN** 系统 SHALL 在独立的 `docs/sql/account_onboarding_sessions.sql` 中定义接入会话表结构
- **AND** 该 SQL 契约 SHALL 使用稳定引用语义存放待解析输入和候选令牌，而不是把原始敏感 payload 定义为普通结构化列

### Requirement: Account contracts SHALL expose challenge-aware token replacement semantics for existing accounts
账号顶层契约 SHALL 允许已有账号的换令牌接口在发起授权尝试时返回 challenge 摘要，同时继续保持“当前生效凭证”和“待验证授权尝试”分离。

#### Scenario: Existing account authorization start may return challenge summary
- **WHEN** `docs/api/accounts.yaml` 定义已有账号的授权尝试启动接口
- **THEN** 契约 SHALL 允许启动结果返回待验证 attempt 摘要和可选 challenge 摘要
- **AND** 契约 SHALL 不要求在 challenge 尚未验证成功时提前替换当前生效令牌

#### Scenario: Token-oriented HTTP semantics stay sanitized
- **WHEN** 顶层账号契约补充令牌接入与更换令牌语义
- **THEN** 契约 SHALL 只向普通前端页面暴露脱敏的会话、attempt 和状态结果
- **AND** 契约 SHALL NOT 要求普通详情或普通接入结果直接返回原始令牌 payload
