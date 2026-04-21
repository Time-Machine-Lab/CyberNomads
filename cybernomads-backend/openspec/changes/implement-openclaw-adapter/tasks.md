## 1. OpenClaw Research

- [ ] 1.1 调研 OpenClaw 官方文档、源码或现有说明，确认可用的鉴权方式、会话接口、历史查询接口、subagent 接口与能力准备入口
- [ ] 1.2 使用本地 OpenClaw 环境完成最小连通验证，确认关键接口不是“理论存在”而是真实可用
- [ ] 1.3 整理 OpenClaw 实际能力到统一 provider 端口的映射清单，并标记差异点与缺口
- [ ] 1.4 如果调研结果显示当前 design 或端口抽象存在错配，先回改提案或设计，再进入代码实现

## 2. Adapter Contract Alignment

- [ ] 2.1 对齐 Agent 服务接入模块定义的 provider 端口，确认 OpenClaw 适配器所需输入输出语义
- [ ] 2.2 确认当前 OpenClaw 适配实现不会引入新的顶层 API 或 SQL 契约变更
- [ ] 2.3 明确 OpenClaw 错误、状态和结果到统一 provider 语义的映射规则

## 3. OpenClaw Gateway Integration

- [ ] 3.1 在 `src/adapters/agent/openclaw/` 中实现 OpenClaw client 或 gateway 封装
- [ ] 3.2 实现基于地址和凭证的连通性检查能力
- [ ] 3.3 实现会话创建、消息发送和会话历史查询能力
- [ ] 3.4 实现 subagent 调用能力
- [ ] 3.5 实现能力准备能力，并向上层返回统一结果语义

## 4. Integration With Agent Access Runtime

- [ ] 4.1 将 OpenClaw 适配器注册到 Agent 服务接入模块的 provider 装配流程
- [ ] 4.2 验证 Agent 服务接入模块可以通过统一端口调用 OpenClaw 适配器
- [ ] 4.3 验证上层不会直接依赖 OpenClaw 私有请求响应对象

## 5. Local Validation

- [ ] 5.1 使用本地 OpenClaw 环境验证连接校验与能力准备最小闭环
- [ ] 5.2 使用本地 OpenClaw 环境验证会话、消息、历史和 subagent 能力的最小闭环
