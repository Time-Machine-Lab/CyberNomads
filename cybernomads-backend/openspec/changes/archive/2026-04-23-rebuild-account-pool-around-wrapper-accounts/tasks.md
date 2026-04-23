## 1. 顶层文档与契约重写

- [x] 1.1 重写 `docs/design/domain/Cybernomads账号池领域设计文档.md`，将账号主体改为“运营包装对象”，并明确连接尝试、登录状态、内部资料与已解析平台资料的边界。
- [x] 1.2 重写 `docs/api/accounts.yaml`，让账号创建只要求最小建档字段，并用 `internalDisplayName`、`resolvedPlatformProfile`、`loginStatus` 等新语义替换旧模型字段。
- [x] 1.3 新增 `docs/api/account-connection-attempts.yaml`，定义账号绑定的连接尝试创建、详情、解析、校验、日志读取接口，并废弃旧 `account-onboarding-sessions` 主流程。
- [x] 1.4 重写 `docs/sql/accounts.sql` 并新增 `docs/sql/account_connection_attempts.sql`，移除旧 `platform + platformAccountUid` 唯一约束与内嵌授权尝试槽位，同时废弃 `docs/sql/account_onboarding_sessions.sql`。

## 2. 后端运行时重构

- [x] 2.1 重构 `src/modules/accounts/`、账号主表仓储与对应 DTO/映射，使账号对象支持未登录创建、内部资料与已解析平台资料分离、登录状态重建。
- [x] 2.2 新增账号连接尝试模块、Controller、SQLite 仓储与运行时 SQL 资产，围绕 `account_connection_attempts` 实现手工令牌、扫码 challenge、解析、校验与日志读取流程。
- [x] 2.3 重构 `src/ports/account-platform-port.ts` 与 `bilibili` stub adapter，使平台能力改为统一的 connection-attempt start / resolve / validate / availability 语义，并返回规范化日志输出。
- [x] 2.4 重写运行时组装与存储引用逻辑，删除旧 `account-onboarding` 模块和旧 authorization-attempt 内嵌模型，补齐新的 secret/log store 引用与受控当前令牌解析能力。

## 3. 前端页面与交互重构

- [x] 3.1 重写账号前端 API、类型与 mapper，使其完全对齐新的账号 DTO、连接尝试 DTO、日志读取模型和登录状态语义。
- [x] 3.2 重构账号列表页与新增页：列表页只负责状态概览和入口跳转，新增页只做最小建档，并保持 `/Users/mac/Code/CyberNomads/temp/新版ui/账号池` 的视觉风格。
- [x] 3.3 重构账号详情页，按“左侧基础信息、右上令牌输入与二维码校验、右下日志区”的布局实现新的主工作台，并明确展示内部资料与已解析平台资料。
- [x] 3.4 删除旧 onboarding/session 相关前端流程、占位逻辑和兼容分支，确保账号模块只围绕新模型运行。

## 4. 测试与联调验证

- [x] 4.1 重写后端单元测试与集成测试，覆盖未登录账号创建、连接尝试生命周期、校验成功写入当前令牌、校验失败保留旧令牌、日志读取与可用性检查。
- [x] 4.2 重写前端账号模块测试，覆盖列表展示、新增建档、详情页连接尝试、二维码 / 手工令牌校验、日志展示和状态变化。
- [x] 4.3 进行本地联调冒烟，确认 `bilibili` 平台在新模型下能够完整跑通“新增账号 -> 详情接入 -> 校验成功/失败 -> 日志查看”的主链路。
