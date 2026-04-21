## Why

Cybernomads 当前的 Agent 服务策略是“上层对接统一的 Agent 服务抽象，底层先接入 OpenClaw”。这意味着即使 Agent 服务接入模块已经具备统一接口，如果没有 OpenClaw 适配器，首期 MVP 仍然无法真正连通外部 Agent 服务。

同时，OpenClaw 属于外部系统，不是我们完全自控的内部模块。会话、消息、历史、subagent、能力准备等能力是否真的存在、如何鉴权、如何接入，都不应该靠猜测直接编码。因此这份提案除了适配实现本身，还需要显式包含“接口调研与本地摸底”阶段，先确认真实可用的接入边界，再进入实现。

## What Changes

- 在正式适配前增加 OpenClaw 接口调研与本地摸底阶段，确认实际可用的鉴权方式、会话能力、历史查询、subagent 能力与能力准备方式。
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
- Delivery impact:
  - 适配实现前需要先完成 OpenClaw 接口调研和最小连通验证，避免基于猜测直接编码
- External dependency:
  - OpenClaw 网关地址与鉴权凭证
