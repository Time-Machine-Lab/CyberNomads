## 1. Contract Alignment

- [ ] 1.1 确认并同步 Agent 服务接入域的 `docs/sql/` 契约，锁定当前服务配置与状态持久化结构
- [ ] 1.2 确认并同步 Agent 服务接入域的 `docs/api/` 契约，锁定配置、校验、状态查询和能力准备接口
- [ ] 1.3 校验运行时模块的状态命名、输入输出和错误语义与顶层契约保持一致

## 2. Agent Access Runtime Module

- [ ] 2.1 在 `src/modules/agent-access/` 中实现当前 Agent 服务配置与更新的应用服务
- [ ] 2.2 在 `src/modules/agent-access/` 中实现连接校验、状态查询与能力准备的业务流程
- [ ] 2.3 在 `src/ports/` 中定义 provider 访问端口与状态持久化端口
- [ ] 2.4 在 `src/modules/agent-access/` 中提供面向上层的统一 Agent 服务调用入口，用于提交任务规划请求和任务执行请求

## 3. HTTP And Integration Wiring

- [ ] 3.1 新增 Agent 服务接入模块 controller，并将接口挂载到应用启动流程
- [ ] 3.2 接入当前存储实现，完成当前服务配置、连接状态和能力准备状态的读写
- [ ] 3.3 为配置变更、连接异常和能力准备失败建立清晰的错误与状态返回语义

## 4. Implementation Readiness For Provider Adapter

- [ ] 4.1 为 OpenClaw 等 provider 适配器明确所需端口能力: 连通性检查、会话创建、消息发送、会话历史、subagent 调用、能力准备
- [ ] 4.2 通过模块测试或集成验证确认上层不直接依赖 provider 私有实现
