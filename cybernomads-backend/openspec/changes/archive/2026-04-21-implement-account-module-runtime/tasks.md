## 1. 顶层契约校验

- [x] 1.1 读取并校验 `docs/sql/accounts.sql`，确认其已覆盖首版账号模块实现所需的最小结构化状态；如发现缺口先更新顶层 SQL 文档。
- [x] 1.2 读取并校验 `docs/api/accounts.yaml`，确认其已覆盖首版账号模块实现所需的 HTTP 行为边界；如发现缺口先更新顶层 API 文档。

## 2. 运行时存储与抽象边界

- [x] 2.1 创建 `runtime-assets/sql/004-accounts.sql`，使运行时 SQLite 结构与 `docs/sql/accounts.sql` 对齐。
- [x] 2.2 在 `src/ports/` 中定义账号模块所需的状态存储、secret 存储和平台能力抽象接口。
- [x] 2.3 在 `src/adapters/storage/` 中实现账号模块的 SQLite 状态仓储与文件系统 secret/ref 存储。

## 3. 模块主流程实现

- [x] 3.1 在 `src/modules/accounts/` 中实现账号模块的类型、错误定义和应用服务，覆盖账号创建、列表、详情、更新、逻辑删除、恢复和受控生效凭证解析。
- [x] 3.2 实现授权尝试启动、授权验证、状态切换和可用性检查流程，确保当前生效凭证与待验证授权尝试严格分离。
- [x] 3.3 在 `src/adapters/platform/` 中实现账号平台 stub 适配器与平台能力注册逻辑，使账号模块可在不依赖真实平台脚本的前提下跑通主流程。

## 4. 应用接线与测试

- [x] 4.1 实现账号模块 HTTP Controller，并将其接入 `src/app/start-application.ts` 与 `src/app/http-server.ts`。
- [x] 4.2 增加账号模块单元测试，覆盖授权验证成功/失败、身份冲突、软删恢复和可消费条件判断。
- [x] 4.3 增加账号模块集成测试，覆盖 HTTP 接口、SQLite、文件系统 secret/ref 存储与 stub 平台适配器联动主流程。
