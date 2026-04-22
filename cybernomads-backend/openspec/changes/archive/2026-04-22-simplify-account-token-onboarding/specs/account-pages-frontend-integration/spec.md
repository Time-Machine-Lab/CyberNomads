## ADDED Requirements

### Requirement: Account pages frontend integration SHALL provide a real account onboarding entry and flow
账号页前端集成 SHALL 提供真实的新增账号入口和接入流程，而不是把新增能力留在 mock 占位或缺失状态。

#### Scenario: Account list exposes a real create entry
- **WHEN** 用户打开账号列表页
- **THEN** 前端 SHALL 展示可用的“新增账号”入口并跳转到真实账号接入页
- **AND** 该入口 SHALL 不依赖本地 mock 数据或手工拼接的假路由

#### Scenario: Onboarding page drives the published onboarding session workflow
- **WHEN** 用户进入新增账号接入页
- **THEN** 前端 SHALL 通过已发布的账号接入会话 API 完成平台选择、challenge 展示、令牌解析结果确认以及最终新建/恢复
- **AND** 页面 SHALL 根据后端返回的最终结果跳转到新建、恢复或已存在的账号详情

## MODIFIED Requirements

### Requirement: Account pages frontend integration SHALL drive authorization and availability workflows using published account action semantics
The frontend SHALL drive new-account token onboarding, existing-account token replacement, and connection validation through the published onboarding-session, authorization-attempt, and availability-check APIs instead of through legacy credential-specific mock behavior.

#### Scenario: New account onboarding uses the onboarding session workflow
- **WHEN** 用户在新增账号流程中选择扫码或手工令牌录入
- **THEN** 前端 SHALL 调用已发布的接入会话接口获取 challenge、提交解析或轮询结果，并在成功后请求最终新建/恢复
- **AND** 前端 SHALL 不再要求用户在新增入口手工填写 `platformAccountUid`

#### Scenario: Existing account replacement uses a unified token access region
- **WHEN** 用户在账号详情页为已有账号更换当前令牌
- **THEN** 前端 SHALL 在同一块“令牌接入”区域中承载扫码和手工录入两种方式，并调用已有账号的授权尝试与验证接口
- **AND** 页面 SHALL 允许用户在解析成功后决定是否替换当前令牌，而不是在 challenge 或录入提交时立即覆盖原令牌

#### Scenario: Connection validation uses availability check
- **WHEN** a user triggers connection validation for an account
- **THEN** the frontend SHALL invoke the published account availability-check API
- **AND** the resulting availability state shown in the UI SHALL be refreshed from the backend response

### Requirement: Account pages frontend integration SHALL degrade only the remaining unsupported regions
账号页前端集成 SHALL 在二维码 challenge 和统一令牌接入已发布后，只对仍未发布契约的区域保持降级，而不是继续把整个扫码区域都当成占位。

#### Scenario: QR challenge is rendered from real backend data
- **WHEN** 后端已经发布 challenge 摘要或二维码展示契约
- **THEN** 前端 SHALL 使用真实后端返回的数据渲染扫码区域
- **AND** 该区域 SHALL 不再停留在永久禁用或纯说明占位状态

#### Scenario: Raw token history and terminal logs remain placeholder-only
- **WHEN** 页面中仍然存在原始令牌回显、令牌历史或终端日志区域
- **THEN** 前端 SHALL 继续将这些区域渲染为 placeholder、disabled、hidden 或 explanatory 状态
- **AND** 前端 SHALL NOT 为了填满页面而发明未发布的后端契约
