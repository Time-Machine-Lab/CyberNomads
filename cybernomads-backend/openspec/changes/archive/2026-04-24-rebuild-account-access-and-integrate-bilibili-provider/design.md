## Context

账号模块当前已经不再是“创建前先拿平台 UID”的旧模型，但它仍然保留了较强的流程编排痕迹：

- 账号详情默认围绕 `latestConnectionAttempt` 组织
- 平台动作仍以 `start / resolve / validate / availability-check` 这组偏内部的语义暴露
- `availabilityStatus` 既参与列表态展示，又参与“是否可消费”的判定，过度放大了账号模块对后续业务消费的责任
- 前端交互被迫理解很多流程态，导致页面体验像在操作状态机，而不是在管理一个账号

同时，仓库里已经存在两套容易混淆的“策略”概念：

- 业务域的 `strategy`
- 运行时 skill / script 资产

这意味着下一步引入真实平台接入能力时，必须先把账号域、平台接入抽象和脚本执行层切干净，否则命名和边界都会继续发散。

## Goals / Non-Goals

**Goals**

- 将账号领域重写为“包装对象 + 当前令牌 + access session”的模型。
- 去掉“账号域必须主导业务可消费判定”的中心语义，把 availability 降级为诊断观察值。
- 用 `PlatformAccessProvider` 作为统一平台接入抽象，避免与现有 `strategy` 域冲突。
- 为 Bilibili 落地首个真实 provider，打通：
  - 二维码生成
  - 扫码轮询
  - 手工令牌校验
  - 成功后回填平台资料并生效
- 保持前端高保真风格，但让页面交互回到“新增账号 -> 编辑账号 -> 接入令牌 -> 查看日志”的自然体验。

**Non-Goals**

- 不在本轮实现自动刷新令牌。
- 不在本轮实现多平台真实 provider；第一版仅要求 Bilibili 跑通。
- 不在本轮沉淀账号历史版本链或完整审计中心，只要求保留当前/最近一次 session 及其日志。
- 不在本轮将普通详情接口扩展为返回原始令牌 payload。
- 不保留旧 onboarding / connection-attempt / availability-check 主流程兼容路径。

## Decisions

### 1. 账号主对象重写为包装对象，平台 UID 不再承担系统唯一身份

**Decision**

- 账号主对象继续由 `accountId` 唯一标识。
- 账号创建字段仅保留：
  - `platform`
  - `title` 或 `internalDisplayName`（最终命名以 API 契约为准）
  - `remark`
  - `tags`
  - `platformMetadata`
- `resolvedPlatformAccountUid`、`resolvedDisplayName`、`resolvedAvatarUrl`、`resolvedProfileMetadata` 仅表示最近一次成功校验得到的平台资料。
- 同平台同 UID 允许在多个账号包装对象上重复出现。

**Rationale**

- 这与用户已经确认的产品语义一致：账号只是系统内的包装对象。
- 新增账号时无需先登录，才能真正做到“先建档，再接入”。

### 2. 账号主状态收敛为“生命周期状态 + 连接状态”，availability 降级为诊断信息

**Decision**

- 生命周期状态保留：
  - `active`
  - `disabled`
  - `deleted`
- 连接状态改为账号主状态：
  - `not_logged_in`
  - `connecting`
  - `connected`
  - `connect_failed`
  - `expired`
- `availabilityStatus` 保留为可选诊断观察值：
  - `unknown`
  - `healthy`
  - `risk`
  - `restricted`
  - `offline`
- availability 不再作为接入主流程的前置门槛，也不再主导账号详情页主按钮。

**Rationale**

- 用户感知的是“这个账号现在有没有接上、有没有验证成功”，不是“它是否已经满足后续业务消费判定”。
- 把 availability 降级后，账号模块可以专注于接入，不再过度承担执行资源调度职责。

### 3. 用 `AccessSession` 取代 `ConnectionAttempt`

**Decision**

- 新增短生命周期资源 `AccessSession`，从属于某个账号。
- `AccessSession` 覆盖两类接入方式：
  - `manual_token`
  - `qr_login`
- `AccessSession` 保存：
  - session 标识与状态
  - 二维码 challenge 摘要
  - provider session 上下文
  - 候选令牌 secret 引用
  - 最近一次校验结果摘要
  - 本次日志引用
  - 时间戳和过期信息
- 每个账号同一时刻只允许一个未终态 session。新 session 创建时，旧的未终态 session 自动标记为 `canceled`。

**Rationale**

- “access session” 比 “connection attempt” 更贴近用户真实动作，也更适合作为 API 和页面话术。
- 单账号只保留一个活跃 session，可以减少详情页与日志面板的状态混乱。

### 4. 对产品和前端统一使用“令牌”话术，内部使用结构化凭证 secret

**Decision**

- UI、接口说明和文档统一称其为“令牌”或 `token`。
- 结构化 secret payload 允许包含：
  - `token`
  - `refreshToken`
  - `expiresAt`
  - `platformUserSnapshot`
  - `extension`
- 当前生效令牌与候选令牌继续分离：
  - 当前令牌挂在账号对象上
  - 候选令牌挂在 access session 上
- 验证失败时，当前生效令牌保持不变。

**Rationale**

- 这满足“对外统一、对内可扩展”的要求。
- Bilibili 第一版可以直接把 Cookie 串视为主 `token` 值，同时保留 `refreshToken` 和额外平台资料。

### 5. 平台接入抽象改为 `PlatformAccessProvider`

**Decision**

- 用 `PlatformAccessProvider` 命名平台能力抽象，而不是 “strategy”。
- 后端运行时引入三层：

```text
Account Runtime
  -> PlatformAccessProvider
    -> ScriptCommandRunner
      -> runtime-assets/skills/<platform>/scripts/*
```

- `PlatformAccessProvider` 对账号域暴露统一动作：
  - `startQrSession`
  - `pollQrSession`
  - `createManualTokenSession`
  - `verifyCredential`
  - `checkAvailability`（可选诊断扩展，不属于主流程）

**Rationale**

- 这样既避免与现有 `strategy` 域冲突，也让“平台脚本只是 provider 的一种实现细节”变得明确。

### 6. Bilibili provider 直接映射现有 skill 脚本能力

**Decision**

- Bilibili provider 第一版对接现有脚本：
  - `auth qr-start` -> `startQrSession`
  - `auth qr-poll` -> `pollQrSession`
  - `account self-get` -> `verifyCredential`
- `auth refresh-check` / `auth refresh-cookie` 暂不纳入主流程，仅保留为后续扩展点。
- provider 负责把脚本输出标准化为账号域可消费的结果：
  - 二维码信息
  - session 进度
  - 候选令牌
  - 已解析平台资料
  - 结构化日志

**Rationale**

- 当前 skill 已经具备最核心的三段能力，足以支撑第一版真实接入。

### 7. 详情页改为真正的“账号接入工作台”

**Decision**

- 新增页只负责最小建档。
- 详情页布局固定为：
  - 左侧：基础资料编辑
  - 中间：扫码 + 令牌输入 + 验证动作
  - 右侧上方：连接状态卡片
  - 右侧下方：session 日志面板
- 详情页不再把 availability-check 作为主要 CTA。
- 详情页默认围绕当前账号本体组织；session 详情和日志按 session id 单独拉取，不把完整 session 负载内嵌进账号详情。

**Rationale**

- 这样可以避免“打开详情页就像打开最近一次流程现场”的耦合感。
- 账号详情仍是账号页面，session 只是详情页里的一个工作区域。

### 8. 数据和迁移策略允许破坏性重建

**Decision**

- 允许重写：
  - API 路由
  - SQL 表结构
  - DTO 命名
  - 前端 API 与类型层
  - 现有测试
- 不保留旧：
  - `connection-attempts` 路由语义
  - onboarding 语义
  - availability-check 主流程
  - 基于 “resolved UID 唯一” 的旧领域约束

**Rationale**

- 用户已经明确要求完全重构，不做兼容。
- 在这个前提下，保留旧模型只会继续拖累实现与页面体验。

## Data Model Sketch

```text
accounts
- account_id
- platform
- internal_display_name
- remark
- tags_json
- platform_metadata_json
- lifecycle_status
- connection_status
- connection_status_reason
- availability_status
- availability_status_reason
- resolved_platform_account_uid
- resolved_display_name
- resolved_avatar_url
- resolved_profile_metadata_json
- active_credential_ref
- active_credential_expires_at
- active_credential_updated_at
- last_verified_at
- last_connected_at
- deleted_at
- created_at
- updated_at

account_access_sessions
- session_id
- account_id
- access_mode
- session_status
- session_status_reason
- challenge_json
- provider_session_ref
- candidate_credential_ref
- resolved_platform_account_uid
- resolved_display_name
- resolved_avatar_url
- resolved_profile_metadata_json
- log_ref
- expires_at
- verified_at
- applied_at
- created_at
- updated_at
```

## API Sketch

```text
POST   /api/accounts
GET    /api/accounts
GET    /api/accounts/:accountId
PUT    /api/accounts/:accountId
DELETE /api/accounts/:accountId
POST   /api/accounts/:accountId/restore

POST   /api/accounts/:accountId/access-sessions/token
POST   /api/accounts/:accountId/access-sessions/qr
GET    /api/accounts/:accountId/access-sessions/:sessionId
POST   /api/accounts/:accountId/access-sessions/:sessionId/poll
POST   /api/accounts/:accountId/access-sessions/:sessionId/verify
GET    /api/accounts/:accountId/access-sessions/:sessionId/logs
```

## Risks and Mitigations

- **Risk:** 破坏性重构会让现有前端和后端接口一次性全部失效。
  - **Mitigation:** 先完成 API / SQL / OpenSpec / 领域文档重写，再实施，避免实现期反复返工。
- **Risk:** Bilibili skill 输出如果不够稳定，会拖慢 provider 集成。
  - **Mitigation:** 在本次 change 中同步补齐 `bilibili-web-api-skill` 的机器可消费输出约束。
- **Risk:** 详情页仍可能被 session 负载绑架。
  - **Mitigation:** 账号详情和 session 详情分接口读取，日志单独拉取。

## Implementation Order

1. 先重写领域文档、API、SQL、OpenSpec delta specs，固定新语言。
2. 后端先重写账号主模型、access session、provider 抽象和 Bilibili provider。
3. 前端再按新契约重做列表、新增、详情页。
4. 最后补齐测试与端到端联调。
