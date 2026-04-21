## Why

Cybernomads 当前的 Agent 服务策略是“上层对接统一的 Agent 服务抽象，底层先接入 OpenClaw”。这意味着即使 Agent 服务接入模块已经具备统一接口，如果没有 OpenClaw 适配器，首期 MVP 仍然无法真正连通外部 Agent 服务。

因此需要把 OpenClaw 作为首个 provider 实现落下来，提供最小的原子能力集合，包括连通性检查、会话创建、消息发送、会话历史、subagent 调用和能力准备。这样系统才能在不破坏解耦设计的前提下完成真实接入。

## What Changes

- 在 `src/adapters/agent/openclaw/` 中实现 OpenClaw provider 适配器。
- 支持基于 OpenClaw 网关地址和凭证的连通性检查。
- 支持会话创建、消息发送、会话记录查询、subagent 调用等最小原子能力。
- 支持通过 provider 交互完成 Cybernomads 所需“能力准备”流程。
- 将 OpenClaw 私有请求响应语义转换为上层可消费的统一 provider 抽象输出。
- 明确当前阶段不扩展其他 provider，也不在适配器层实现任务调度、失败重试和自动恢复。

## Capabilities

### New Capabilities
- `openclaw-adapter-runtime`: 实现 OpenClaw 作为首个 Agent provider 的适配运行时能力。

### Modified Capabilities
None.

## Impact

- Affected code:
  - `src/adapters/agent/openclaw/`
  - `src/ports/`
  - 可能涉及 `src/modules/agent-access/` 的 provider 接入装配
- Affected systems:
  - 当前 MVP 唯一实际可连接的外部 Agent 服务实现
  - 后续引流工作创建与任务执行场景所依赖的真实 Agent 能力入口
- External dependency:
  - OpenClaw 网关地址与鉴权凭证
