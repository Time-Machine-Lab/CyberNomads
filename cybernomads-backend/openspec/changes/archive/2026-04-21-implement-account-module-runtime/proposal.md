## Why

账号池领域设计、顶层 API 契约和 SQL 契约已经完成，但后端运行时仍然没有真正的账号模块实现。当前系统既不能管理平台账号、授权尝试和三维状态，也没有为后续平台 JS 脚本接入准备统一的账号平台能力抽象。

现在需要一个独立的实现提案，把账号模块从“文档定义”推进到“可运行能力”，同时先把平台脚本边界抽出来，让后续不同平台只需实现统一接口，而不把账号业务流程直接写死到具体脚本里。

## What Changes

- 实现账号模块的核心运行时能力，覆盖账号创建、列表、详情、更新、逻辑删除、恢复、授权尝试、授权验证、可用性检查和受控生效凭证解析。
- 实现账号模块的领域服务、HTTP Controller、SQLite 状态存储、文件系统 secret/ref 存储，并接入应用启动链路。
- 新增账号模块运行时所需的 provider-neutral 平台能力抽象，用于承接“发起授权挑战”“基于凭证获取平台账号信息”“验证授权尝试”“检查账号可用性”等能力。
- 提供首个非真实平台的 stub 账号平台适配器，使账号模块可以在不依赖真实 JS 脚本的前提下先完成运行时闭环和测试闭环。
- 新增账号模块对应的运行时 SQL 资产，并确保其与 `docs/sql/accounts.sql` 保持一致。
- 在进入代码开发前先校验现有 `docs/api/accounts.yaml` 与 `docs/sql/accounts.sql` 是否足够支撑实现；若发现真实实现所需契约缺口，先补顶层文档再继续。
- 当前阶段不实现真实平台脚本接入、不实现 Bilibili 二维码登录脚本、不实现凭证加密方案和授权尝试历史流水。

## Capabilities

### New Capabilities
- `account-platform-capability-runtime`: 定义账号模块依赖的统一平台能力抽象，使后续不同平台都可以通过同一接口承接授权挑战、凭证校验、平台信息解析和可用性检查。

### Modified Capabilities
- `account-module-runtime`: 补充账号模块运行时如何通过平台能力抽象完成授权验证与可用性判断，并明确首个实现阶段允许先使用 stub 适配器而不直接接入真实平台脚本。

## Impact

- Affected code:
  - `src/modules/accounts/`
  - `src/ports/`
  - `src/adapters/platform/`
  - `src/adapters/storage/`
  - `src/app/`
  - `runtime-assets/sql/`
  - `tests/unit/`
  - `tests/integration/`
- Affected docs:
  - 依赖 `docs/api/accounts.yaml`
  - 依赖 `docs/sql/accounts.sql`
  - 若实现发现接口或存储契约缺口，需要先更新对应顶层文档
- Affected systems:
  - 本地后端账号配置流程
  - 后续平台 JS 脚本接入边界
  - 未来工作区、对象绑定和任务模块对账号资源的消费方式
- Out of scope:
  - 真实 Bilibili 平台脚本接入
  - 二维码授权真实链路
  - 多平台真实实现并行落地
  - 凭证加密和密钥托管方案
