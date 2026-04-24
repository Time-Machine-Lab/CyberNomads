## 1. 顶层设计与契约

- [x] 1.1 重写 `docs/design/domain/Cybernomads账号池领域设计文档.md`，用“包装对象 + 当前令牌 + access session + PlatformAccessProvider” 替换旧模型。
- [x] 1.2 重写 `docs/api/accounts.yaml`，收敛账号主对象的创建、查询、更新、删除与恢复契约。
- [x] 1.3 新增 `docs/api/account-access-sessions.yaml`，定义手工令牌、二维码登录、轮询、验证与日志读取契约。
- [x] 1.4 重写 `docs/sql/accounts.sql` 并新增 `docs/sql/account_access_sessions.sql`，删除旧 connection-attempt/onboarding 相关表与列语义。
- [x] 1.5 校准 OpenSpec 主规格，新增 `account-access-sessions`，修改账号运行时、前端集成、平台能力和 Bilibili skill 规格，退役旧 connection-attempt / onboarding 规格。

## 2. 后端运行时重构

- [x] 2.1 重构 `src/modules/accounts/` 与对应仓储，删除“平台 UID 唯一身份”和“availability 主导接入流程”的旧语义。
- [x] 2.2 新增 `access-sessions` 模块、controller、SQLite 仓储和 secret/log store 读写语义，实现单账号单活跃 session 规则。
- [x] 2.3 将平台能力抽象重构为 `PlatformAccessProvider` 风格接口，并引入脚本命令执行层。
- [x] 2.4 实现 `BilibiliPlatformAccessProvider`，打通二维码开始、扫码轮询、手工令牌校验和平台资料回填。
- [x] 2.5 清理旧 onboarding / connection-attempt / availability-check 主流程代码，不保留兼容分支。

## 3. 前端页面与交互重构

- [x] 3.1 重构账号前端 API 层、DTO 和 view-model，使其对齐新账号对象和 access session 契约。
- [x] 3.2 调整账号列表页，只保留新增、删除、状态概览和进入详情的核心能力，去掉旧“可消费”中心语义。
- [x] 3.3 调整新增页，保留最小建档表单并优化响应式密度、标签录入和必填标识。
- [x] 3.4 重做详情页，固定“左侧基础信息 / 中间接入区域 / 右侧状态与日志”的工作台布局，移除 availability-check 主按钮。
- [x] 3.5 统一前端产品话术为“令牌”，保留深色高保真视觉风格，不回退到通用后台样式。

## 4. 验证与收尾

- [x] 4.1 增补后端测试，覆盖账号建档、单活跃 session、二维码轮询、手工令牌验证、成功切换令牌、失败保留旧令牌和日志读取。
- [x] 4.2 增补前端测试，覆盖列表页、新增页、详情页、二维码区域、令牌验证、标签录入和日志面板交互。
- [ ] 4.3 进行 Bilibili 真实链路冒烟，确认“新增账号 -> 启动扫码/提交令牌 -> 验证 -> 平台资料回填 -> 日志可见”主链路可跑通。
- [ ] 4.4 清理旧文档、旧接口和旧测试残留，确保仓库中不再保留旧模型的主要入口。
