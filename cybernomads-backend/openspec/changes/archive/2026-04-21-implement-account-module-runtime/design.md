## Context

账号池领域设计、`docs/api/accounts.yaml` 和 `docs/sql/accounts.sql` 已经把账号模块的边界固定下来，但当前后端代码里还没有 `src/modules/accounts/` 的实际实现，也没有对应的 SQLite 运行时 SQL 资产、状态存储适配器、secret/ref 存储适配器和 HTTP Controller。与此同时，仓库中现有实现已经形成了两条稳定模式：

- 产品模块提供了“轻量模块 + Controller + Service + SQLite/FileSystem 适配器”的实现方式。
- Agent Access 模块提供了“状态持久化 + 凭证引用 + provider-neutral port”的实现方式。

账号模块实现既不能退回为纯 CRUD，也不能直接把平台 JS 脚本写进模块服务层。因为账号模块除了基础资料管理外，还需要承接授权尝试、授权验证、当前生效凭证切换、可用性检查和受控凭证解析。而根据现有讨论，第一版实现又明确不直接接真实平台脚本，这要求我们先把“账号模块运行时内核”和“平台能力抽象接口”拆开。

当前还存在四个关键约束：

- 业务层不能直接耦合具体平台脚本，必须通过 `src/ports/` 中的稳定抽象边界访问平台能力。
- 顶层 `docs/api/` 和 `docs/sql/` 仍然是唯一真理；若实现发现契约缺口，必须先更新文档再写代码。
- 运行时 SQL 资产必须在 `runtime-assets/sql/` 中单独维护，不能直接依赖 `docs/sql/` 作为启动来源。
- 第一版不接真实 Bilibili 脚本，因此需要一个 stub 账号平台适配器来跑通端到端主链路与测试。

## Goals / Non-Goals

**Goals:**
- 实现账号模块的后端运行时内核，包括账号创建、列表、详情、更新、逻辑删除、恢复、授权尝试、授权验证、可用性检查和受控凭证解析。
- 为账号模块定义 provider-neutral 的平台能力抽象，使后续平台都可以用统一接口承接 JS 脚本行为。
- 在 SQLite 中持久化账号结构化状态，在文件系统中通过 ref 保存凭证与授权尝试 payload。
- 通过 stub 平台适配器跑通第一版运行时闭环和测试闭环。
- 接入应用启动与 HTTP 路由，使前端后续能够按既有顶层契约访问账号模块。

**Non-Goals:**
- 不实现真实 Bilibili 二维码脚本或其他平台真实脚本。
- 不扩展 `docs/api/accounts.yaml` 来公开二维码图片、challenge payload 或脚本细节。
- 不实现凭证加密、密钥管理或授权尝试历史流水表。
- 不把账号模块与对象绑定、工作区、任务调度等其他业务模块联动起来。

## Decisions

### 1. 账号模块沿用“轻量模块 + 抽象边界”实现

**Decision**
- 账号模块在 `src/modules/accounts/` 内采用与产品模块相同的轻量文件组织方式，围绕 `service.ts`、`controller.ts`、`errors.ts` 和 `types.ts` 展开。
- 与平台能力、状态存储、secret 存储有关的边界分别通过 `src/ports/` 暴露接口，再由 `src/adapters/` 提供实现。

**Rationale**
- 这与当前后端开发规范保持一致，能最大限度复用已有实现模式。
- 账号模块虽然比产品模块复杂，但当前复杂度还不足以证明要提前拆成多层子目录。

**Alternatives Considered**
- 一开始就把账号模块拆成 `application/domain/http/infrastructure` 多层结构
  - 放弃原因：当前仓库整体仍是轻量组织，过早分层会提高维护成本。

### 2. 结构化状态落 SQLite，敏感 payload 落文件系统 ref

**Decision**
- 账号结构化状态通过单表 `platform_accounts` 持久化到 SQLite。
- 当前生效凭证和授权尝试 payload 不直接存入表内，而是通过 `active_credential_ref` 和 `authorization_attempt_payload_ref` 指向文件系统中的 JSON 记录。
- 第一版新增运行时 SQL 资产 `runtime-assets/sql/004-accounts.sql`，并与 `docs/sql/accounts.sql` 保持一致。

**Rationale**
- 这直接承接了已有顶层 SQL 契约，也与 Agent Access 模块的 `credential_ref` 模式一致。
- 凭证和授权尝试字段具有平台差异与可变结构，放入文件系统 ref 比塞进结构化表更稳定。

**Alternatives Considered**
- 把 token、cookie、二维码票据等原始 payload 直接存进 SQLite
  - 放弃原因：会污染结构化表，也会让未来替换存储方式和安全策略更困难。

### 3. 第一版定义统一 `AccountPlatformPort`，但不接真实平台脚本

**Decision**
- 账号模块通过 `AccountPlatformPort` 访问平台能力，并按 `platform` 维度选择具体适配器。
- `AccountPlatformPort` 只暴露账号领域真正需要的能力，例如：
  - 发起授权尝试所需的平台动作
  - 验证授权尝试并返回统一结果
  - 基于当前生效凭证检查可用性
- 平台内部若需要调用具体 JS 脚本，例如“登录并返回二维码图片”“根据 token 获取平台信息”，这些动作只留在平台适配器内部，不直接暴露到账号模块服务层。
- 第一版先提供 stub 适配器，不依赖真实平台脚本。

**Rationale**
- 这能保证账号模块编排的是稳定业务语义，而不是某个平台的脚本函数名。
- 后续真实 Bilibili 适配器可以在不修改账号主流程的前提下替换 stub 适配器。

**Alternatives Considered**
- 让账号服务直接调用类似 `loginAndGetQrImage`、`getPlatformInfoByToken` 的脚本接口
  - 放弃原因：账号主流程会被平台细节反向定义，失去多平台扩展价值。

### 4. 授权验证结果可以回填管理信息，但不得改变稳定身份

**Decision**
- 平台能力验证成功后，可以返回统一的账号资料结果，用于回填 `displayName` 和 `platformMetadata`。
- `platform + platformAccountUid` 作为稳定身份不可被验证流程直接改写。
- 若平台适配器返回的稳定身份与当前账号对象不一致，验证流程应判定为身份冲突并失败，而不是篡改账号身份。

**Rationale**
- 这既承接了“根据 token 获取平台信息”的实际需求，也不会破坏账号对象的稳定身份约束。
- `displayName` 和 `platformMetadata` 本来就是可管理、可回填属性，适合由平台结果补充。

**Alternatives Considered**
- 验证成功后允许直接覆盖 `platformAccountUid`
  - 放弃原因：会破坏恢复优先和稳定身份语义，并可能把一个账号对象错误重定向到另一个平台身份。

### 5. 发起新授权尝试时，不强制覆盖当前授权语义

**Decision**
- 当一个已经具备当前生效凭证的账号再次发起授权尝试时，系统只更新授权尝试槽位，不自动把 `authorizationStatus` 从 `authorized` 改成 `authorizing`。
- 只有在当前没有可用生效凭证时，发起授权尝试才会将授权状态推进到 `authorizing`。
- 验证失败时保留旧凭证和既有可消费判断；验证成功时再切换当前生效凭证并更新相关状态。

**Rationale**
- 这更准确地表达了“当前凭证仍在生效，新授权只是待验证尝试”的领域语义。
- 能避免授权状态字段因为一次重授权动作失真。

**Alternatives Considered**
- 只要发起授权尝试就把 `authorizationStatus` 改为 `authorizing`
  - 放弃原因：会让原本仍可消费的账号在待验证期间被错误降级。

### 6. 第一版不扩展公开 HTTP 契约来承接二维码 challenge

**Decision**
- 第一版实现保持与现有 `docs/api/accounts.yaml` 对齐，不额外公开二维码图片、challenge payload 或脚本交互细节。
- 如果未来真实二维码流程需要前端展示 challenge，再单独发起契约变更更新 `docs/api/accounts.yaml`。

**Rationale**
- 当前用户已经明确第一版不接真实平台脚本，因此没有必要在这轮实现里把未落地的 challenge 形态写进公开 API。
- 先把账号模块的内核、状态机和抽象边界做稳，比提前暴露一个未稳定的交互契约更重要。

**Alternatives Considered**
- 现在就把二维码图片等交互材料加入公开账号 API
  - 放弃原因：没有真实平台行为作为依据，过早固定外部接口会提高返工概率。

## Risks / Trade-offs

- [平台能力抽象过薄，后续真实脚本接入时可能还要扩口] → 第一版只抽账号领域真正需要的最小能力，并在 design 中明确脚本级动作留在适配器内部。
- [不公开二维码 challenge，未来真实扫码流程需要再改顶层契约] → 这是有意延后，先避免在没有真实脚本的前提下锁死 API。
- [SQLite 单表承载授权尝试槽位，无法表达多轮历史] → 当前阶段接受只保留“当前/最近一次授权尝试”，后续若需要审计流水再开独立变更。
- [stub 平台适配器可能让第一版缺少真实平台反馈] → 通过单元测试和集成测试确保主流程稳定，并把真实平台适配留给下一轮 change。
- [管理资料回填会引入身份不一致风险] → 平台身份不允许被回填覆盖；一旦校验出 UID 不一致，直接判定为验证失败。

## Migration Plan

1. 先读取并校验 `docs/api/accounts.yaml` 与 `docs/sql/accounts.sql` 是否足以支撑首版实现。
2. 在 `runtime-assets/sql/` 中新增账号模块 SQL 资产，并同步 `src/ports/`、`src/modules/accounts/` 和 `src/adapters/storage/` 的实现骨架。
3. 实现 `AccountPlatformPort` 与 stub 平台适配器，先跑通授权尝试、验证和可用性检查的 provider-neutral 闭环。
4. 接入应用启动装配与 HTTP 路由。
5. 增加单元测试和集成测试，确认账号模块可以在本地运行时独立工作。

## Open Questions

- 当真实二维码平台脚本接入时，顶层账号 API 应扩展 `startAuthorizationAttempt` 返回交互材料，还是单独增加一个 challenge 读取接口。
- 未来真实平台适配器返回的平台资料结果中，`platformMetadata` 采用“覆盖”还是“字段级合并”策略更合适。
