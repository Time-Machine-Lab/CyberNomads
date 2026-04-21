## 1. Adapter Contract Alignment

- [ ] 1.1 对齐 Agent 服务接入模块定义的 provider 端口，确认 OpenClaw 适配器所需输入输出语义
- [ ] 1.2 确认当前 OpenClaw 适配实现不会引入新的顶层 API 或 SQL 契约变更
- [ ] 1.3 明确 OpenClaw 错误、状态和结果到统一 provider 语义的映射规则

## 2. OpenClaw Gateway Integration

- [ ] 2.1 在 `src/adapters/agent/openclaw/` 中实现 OpenClaw client 或 gateway 封装
- [ ] 2.2 实现基于地址和凭证的连通性检查能力
- [ ] 2.3 实现会话创建、消息发送和会话历史查询能力
- [ ] 2.4 实现 subagent 调用能力
- [ ] 2.5 实现能力准备能力，并向上层返回统一结果语义

## 3. Integration With Agent Access Runtime

- [ ] 3.1 将 OpenClaw 适配器注册到 Agent 服务接入模块的 provider 装配流程
- [ ] 3.2 验证 Agent 服务接入模块可以通过统一端口调用 OpenClaw 适配器
- [ ] 3.3 验证上层不会直接依赖 OpenClaw 私有请求响应对象

## 4. Local Validation

- [ ] 4.1 使用本地 OpenClaw 环境验证连接校验与能力准备最小闭环
- [ ] 4.2 使用本地 OpenClaw 环境验证会话、消息、历史和 subagent 能力的最小闭环
