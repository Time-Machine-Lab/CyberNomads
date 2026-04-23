## Context

当前账号池模块的领域设计、顶层契约和运行时实现都建立在“平台自然人账号唯一映射”之上：

- 账号创建要求必须先拿到 `platformAccountUid`
- `platform + platformAccountUid` 在账号主表里有唯一约束
- 新增账号依赖独立的 `AccountOnboardingSession`
- 已有账号换令牌依赖聚合内 `AuthorizationAttempt`
- 详情页既承担账号资料编辑，又承担扫码、令牌验证、可用性检查，页面语义混杂

这个模型在实现上是自洽的，但和当前产品使用习惯正面冲突。用户真正想要的是：

1. 先创建一个系统内的账号包装对象，只填写平台、内部显示名、标签、备注等管理信息。
2. 之后在详情页里通过手工录入令牌或扫码方式为这个包装对象接入登录态。
3. 点击校验后调用平台脚本获取用户资料；成功则令牌生效并回填资料，失败则保留旧令牌。
4. 在详情页右下角查看本次连接尝试的日志输出。

用户已经明确确认新的领域前提：

- 账号是“系统内的运营包装对象”，不是平台自然人账号对象。
- `resolvedPlatformAccountUid` 允许为空，允许重复，不再承担系统唯一键语义。
- 平台创建后不可修改。
- 不再保留旧 onboarding / authorization 双流程，不做兼容、适配或冗余代码。
- 前端样式风格需要延续参考稿：
  - `/Users/mac/Code/CyberNomads/temp/新版ui/账号池/账号池主界面`
  - `/Users/mac/Code/CyberNomads/temp/新版ui/账号池/账号池编辑或添加页面`

因此，这次设计不是局部优化，而是账号领域的彻底重定义：从“平台身份中心”切换到“系统包装对象中心”。

## Goals / Non-Goals

**Goals:**

- 将账号主体重写为包装对象模型，允许未登录账号先存在。
- 用统一的“账号连接尝试”替代旧的 onboarding session 与 authorization attempt。
- 重写顶层 API、SQL、后端运行时、前端页面与测试，使其围绕“新增建档 -> 详情接入 -> 校验生效 -> 查看日志”组织。
- 明确内部显示名与平台解析显示名是两套独立字段，不互相覆盖。
- 保持账号池页面的视觉风格与参考稿一致，同时允许布局和交互围绕新模型重组。
- 允许破坏性重构现有数据库、API、前端和测试，不保留旧模型兼容路径。

**Non-Goals:**

- 不在本轮实现多平台真实脚本适配，v1 只要求 `bilibili` 先跑通新模型，其他平台先保留扩展接口。
- 不在本轮实现账号连接尝试历史审计中心或完整日志检索系统，只要求详情页能够读取当前 / 最近一次尝试日志。
- 不在本轮开放普通前端直接读取原始令牌 payload；当前令牌解析仍然属于受控内部能力。
- 不在本轮保留旧的 `AccountOnboardingSession`、旧的 `authorizationStatus` 语义或旧的页面结构。

## Decisions

### 1. 将账号聚合重写为“运营包装对象”，由 `accountId` 承担唯一身份

**Decision**

- 账号聚合继续以单个主表承载，但其领域含义改为“系统内的运营包装对象”。
- 账号唯一身份只看 `accountId`。
- 平台仍为必填且创建后不可修改。
- `resolvedPlatformAccountUid`、`resolvedDisplayName`、`resolvedAvatarUrl`、`resolvedProfileMetadata` 表示最近一次成功校验得到的平台资料，只是账号的已解析外部信息，不承担系统唯一键。
- 内部资料与外部资料明确拆开：
  - `internalDisplayName`
  - `remark`
  - `tags`
  - `platformMetadata`
  - `resolvedDisplayName`
  - `resolvedAvatarUrl`
  - `resolvedProfileMetadata`

**Rationale**

- 这与用户的真实操作习惯一致：先建一个运营壳子，再给它接登录态。
- 允许 `resolvedPlatformAccountUid` 为空，才能支持“新增后未登录”的第一状态。
- 允许 `resolvedPlatformAccountUid` 重复，才能支持“同一个平台 UID 被多个包装账号复用也无所谓”的确认前提。

**Alternatives Considered**

- 继续维持 `platform + platformAccountUid` 唯一，并要求创建前先解析 UID
  - 放弃原因：这会继续把“新增建档”和“登录接入”绑死，前端使用体验无法变顺。
- 维持旧字段名 `displayName`
  - 放弃原因：它会持续混淆“内部显示名”和“平台返回显示名”，在新模型里必须显式拆分。

### 2. 用统一的 `AccountConnectionAttempt` 替代旧的 onboarding session 与 authorization attempt

**Decision**

- 新增独立资源 `AccountConnectionAttempt`，始终从属于某个既有账号对象。
- 连接尝试统一覆盖两类来源：
  - 手工令牌录入
  - 扫码获取令牌
- 连接尝试承担：
  - 提交原始输入
  - challenge 摘要
  - 平台会话上下文
  - 候选令牌引用
  - 校验过程日志引用
  - 校验结果与最近一次已解析平台资料快照
- 删除旧的“新增账号前 onboarding session”模型。
- 删除旧的“账号聚合内 authorization attempt 槽位”模型。

**Rationale**

- 在新模型里，无论是首登还是换令牌，本质都是“给某个账号包装对象发起一次连接尝试”。
- 继续保留两套中间态，只会让前后端和文档再次分裂成两条心智模型。

**Alternatives Considered**

- 保留 onboarding session，另外再保留 authorization attempt
  - 放弃原因：概念重复、页面难以解释、API 职责继续分裂。
- 直接把连接尝试做成账号主表的一组内嵌字段
  - 放弃原因：日志、challenge、平台上下文都属于短生命周期流程状态，不应该继续污染账号主表。

### 3. 将账号创建与账号接入彻底拆成两个前端动作

**Decision**

- 新增页只做最小建档，字段只包括：
  - `platform`
  - `internalDisplayName`
  - `remark`
  - `tags`
  - `platformMetadata`
- 创建成功后，账号默认进入 `not_logged_in` 状态，并跳转到详情页。
- 详情页成为唯一主工作台：
  - 左侧：基础资料编辑
  - 右上：令牌输入、二维码 challenge、校验动作
  - 右下：当前 / 最近一次连接尝试日志

**Rationale**

- 这和用户的实际操作顺序一致，也和参考稿的视觉层次一致。
- 列表页只做管理入口，详情页才承载复杂操作，心智成本最低。

**Alternatives Considered**

- 继续保留“新增页先接入令牌，再创建账号”的主流程
  - 放弃原因：和产品使用习惯冲突，也是当前混乱的根源。

### 4. 重写账号状态模型，直接服务前端体验

**Decision**

- 生命周期状态保留：
  - `active`
  - `disabled`
  - `deleted`
- 登录状态改为：
  - `not_logged_in`
  - `connecting`
  - `connected`
  - `login_failed`
  - `expired`
- 可用状态保留：
  - `unknown`
  - `healthy`
  - `risk`
  - `restricted`
  - `offline`
- “未登录”成为一等状态，而不是再由 `unauthorized + no credential` 推导。

**Rationale**

- 前端列表和详情需要直接展示“未登录 / 连接中 / 已连接 / 登录失败”，不应该再让页面自己拼领域推导。
- 旧 `authorizationStatus` 更接近内部建模语言，不符合新产品语义。

**Alternatives Considered**

- 保留旧 `authorizationStatus`
  - 放弃原因：会让新的前端体验持续需要翻译层，且无法自然表达“先建档后登录”。

### 5. 重写顶层 API 契约，改为“账号对象 + 账号连接尝试”双 Controller

**Decision**

- `docs/api/accounts.yaml` 对应账号对象 Controller，仅负责：
  - 创建账号
  - 列表 / 详情
  - 更新基础资料
  - 删除 / 恢复
  - 受控内部解析当前令牌的运行时语义说明
- 新增 `docs/api/account-connection-attempts.yaml` 对应连接尝试 Controller，负责：
  - 为账号创建连接尝试
  - 查询连接尝试详情
  - 轮询 / 解析扫码结果
  - 执行校验并在成功后使令牌生效
  - 查询当前 / 最近一次日志
- 旧 `account-onboarding-sessions.yaml` 废弃。

**Rationale**

- 这满足项目“一份 `.yaml` 对应一个 Controller” 的约束。
- 账号对象与连接尝试是两个不同生命周期的资源，路由、DTO 和前端调用边界都应该独立。

**Alternatives Considered**

- 继续把连接尝试挂回 `accounts.yaml`
  - 放弃原因：Controller 会同时承担对象管理与复杂流程编排，边界再次混乱。

### 6. 重写 SQL 契约为“账号主表 + 连接尝试表”，并移除旧唯一约束与内嵌尝试槽位

**Decision**

- 重写 `docs/sql/accounts.sql`：
  - 删除 `platform_account_uid NOT NULL`
  - 删除 `UNIQUE (platform, platform_account_uid)`
  - 删除内嵌 `authorization_attempt_*` 槽位
  - 新增内部显示名、登录状态、最近已解析平台资料、最近一次连接时间、最近一次校验时间等字段
- 新增 `docs/sql/account_connection_attempts.sql`：
  - 连接方法
  - attempt 状态与原因
  - challenge 摘要
  - 原始输入引用
  - 平台会话上下文引用
  - 候选令牌引用
  - 最近解析资料快照
  - 日志引用
  - 过期时间、应用时间、创建更新时间
- 废弃 `docs/sql/account_onboarding_sessions.sql`。

**Rationale**

- 账号主表应该只承担稳定对象状态。
- 短生命周期流程状态应独立到连接尝试表。
- 原始令牌、平台上下文和日志仍然不直接进入结构化列，而是通过稳定引用连接到文件系统 secret/log store。

**Alternatives Considered**

- 在主表里保留最近一次 attempt 内嵌槽位
  - 放弃原因：会再次把流程态和对象态耦合在一起。

### 7. 平台能力重写为“连接尝试驱动”的统一脚本接口

**Decision**

- `AccountPlatformPort` 改为围绕统一连接尝试提供平台能力：
  - `startConnectionAttempt`
  - `resolveConnectionAttempt`
  - `validateConnectionAttempt`
  - `checkAvailability`
- 其中 `validateConnectionAttempt` 的规范化输出必须包含：
  - 是否成功
  - 失败原因
  - 解析出的平台 UID
  - 平台昵称
  - 头像地址
  - 平台扩展资料
  - 候选令牌材料
  - 结构化日志输出
- 平台脚本只负责：
  - 根据输入返回 challenge 或候选令牌
  - 根据令牌拉取平台用户信息
  - 输出日志
- 账号模块不感知脚本函数名、脚本参数格式和底层返回结构。

**Rationale**

- 用户已经确认“验证”这一步本质上就是去调用对应平台的获取用户信息接口。
- 因此平台能力的中心动作不再是 onboarding 或 authorization，而是“为某个账号执行一次连接尝试并拿到用户资料”。

**Alternatives Considered**

- 继续沿用旧的 onboarding / authorization 双接口
  - 放弃原因：和新领域模型冲突，脚本语义也会继续被拆散。

### 8. 日志属于连接尝试，不属于账号主体

**Decision**

- 详情页右下角保留日志区。
- 但领域上日志不挂在账号主体上，而是挂在连接尝试上。
- v1 支持：
  - 当前连接尝试日志
  - 最近一次连接尝试日志
- 日志持久化，但不构建独立日志中心；仅通过连接尝试读取。

**Rationale**

- 这和既有领域边界一致：日志是过程产物，不是账号对象本体。
- 同时也满足用户“详情页下面有日志打印区域”的要求。

**Alternatives Considered**

- 把日志字段直接塞进账号主表
  - 放弃原因：会污染对象模型，也不利于保留多次尝试的边界。

### 9. 前端视觉风格保持不变，但布局和交互围绕新模型重组

**Decision**

- 保留参考稿中的主要视觉语言：
  - 深色背景
  - 玻璃面板
  - 霓虹青色强调
  - Space Grotesk + Inter 字体组合
  - 控制台 / 赛博增长后台气质
- 但布局按新模型重组：
  - 列表页突出新增入口和状态摘要
  - 新增页是简洁建档表单
  - 详情页才是主工作台

**Rationale**

- 用户明确要求保持既有样式风格，但不要求布局完全一致。
- 这允许我们在不破坏视觉连续性的前提下，彻底重组信息架构。

**Alternatives Considered**

- 连视觉语言一起重做
  - 放弃原因：不符合当前要求，也会增加无关范围。

## Risks / Trade-offs

- [破坏性重构范围大，涉及 docs / specs / SQL / backend / frontend / tests 全链路] → 通过单一 change 统一推进，并明确不保留旧兼容路径，避免新旧模型长期并存。
- [账号允许重复 resolved UID 后，系统将失去“平台身份唯一映射”的天然保护] → 明确这是产品定义，不再尝试用数据库唯一约束替用户做包装对象合并。
- [连接尝试统一后，状态机会比旧 authorization attempt 更复杂] → 用独立资源和显式状态表承载，不再把状态机嵌回账号主表。
- [日志持久化但不做日志中心，后续可能要二次扩展] → v1 先把日志作为 attempt 附属资源，通过 `log_ref` 保留扩展点。
- [保留内部受控令牌解析能力但不对前端公开，会形成双语义通道] → 在 design 和 specs 里明确：普通详情永远脱敏，内部运行时解析继续受控。

## Migration Plan

1. 更新领域设计与 OpenSpec 主规格，先从概念层彻底替换旧模型。
2. 重写顶层 API / SQL 契约：
   - 重写 `docs/api/accounts.yaml`
   - 新增 `docs/api/account-connection-attempts.yaml`
   - 重写 `docs/sql/accounts.sql`
   - 新增 `docs/sql/account_connection_attempts.sql`
   - 废弃旧 onboarding session 契约
3. 后端删除旧 `account-onboarding` 模块和账号聚合内旧 attempt 槽位语义，重建：
   - 账号模块
   - 连接尝试模块
   - 平台能力 port
   - SQLite 仓储
   - 运行时 SQL 资产
4. 前端删除旧新增页 / 详情页接入逻辑，按新页面职责重写列表页、新增页、详情页。
5. 全量重写账号模块相关测试，不迁移旧测试语义。

## Open Questions

- v1 的连接尝试日志是否只要求文本流与阶段标记，还是需要一开始就结构化到 step/event 级别；当前建议先支持结构化摘要 + 原始文本日志引用。
- 校验成功后，是否要在详情页显式展示“最近一次解析到的平台 UID 与平台昵称”；当前建议展示，因为它是用户确认登录对象的关键反馈。
- 详情页是否要允许查看更早的历史连接尝试；当前建议 v1 只看当前 / 最近一次，历史列表后续独立扩展。
