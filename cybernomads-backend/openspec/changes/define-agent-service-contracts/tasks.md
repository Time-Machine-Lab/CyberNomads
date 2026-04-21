## 1. Top-Level Contract Documents

- [x] 1.1 在 `docs/sql/` 中创建 Agent 服务接入域首版 SQL 文档，定义唯一激活 Agent 服务所需的最小存储结构
- [x] 1.2 在 `docs/api/` 中创建 Agent 服务接入域首版 API 文档，覆盖配置、更新、校验、状态查询和能力准备接口
- [x] 1.3 在 SQL 文档中明确 MVP 只支持单个当前激活 Agent 服务，不引入多服务路由和容灾字段
- [x] 1.4 在 API 文档中明确“连接成功即可使用”“能力准备为业务状态”“当前不支持自动恢复与失败重试”

## 2. Contract Alignment

- [x] 2.1 将 Agent 服务接入领域设计中的核心边界映射到 SQL 契约，避免引入任务调度、subagent 生命周期和平台脚本细节
- [x] 2.2 将 Agent 服务接入领域设计中的 provider 解耦要求映射到 API 契约，确保上层契约不绑定 OpenClaw 私有语义
- [x] 2.3 检查 API 文档与 SQL 文档中的状态命名、标识语义和能力准备语义是否一致

## 3. Proposal Readiness For Implementation

- [x] 3.1 为后续运行时实现提炼最小开发功能清单: 配置服务、校验连接、查询状态、准备能力、获取当前激活服务
- [x] 3.2 为后续 OpenClaw 适配提炼最小 provider 能力清单: 连通性检查、会话创建、消息发送、会话历史、subagent 调用、能力准备
