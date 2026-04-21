## Context

Cybernomads 的整体方向不是自己在第一期就实现完整 Agent，而是先接入外部 Agent 服务。当前已确认 OpenClaw 作为首个 provider，并且用户本地已有可访问的 OpenClaw 服务地址。与此同时，领域和架构文档都要求上层只依赖统一 Agent 服务抽象，而不直接依赖 OpenClaw 私有接口。

这意味着 OpenClaw 适配器必须承担两个角色:
- 向下与 OpenClaw 网关通信
- 向上实现统一 provider 端口所要求的最小原子能力

它不应吸收任务规划编排、任务调度或平台脚本执行职责，这些都属于更上层的业务模块。

## Goals / Non-Goals

**Goals:**
- 在 `src/adapters/agent/openclaw/` 中实现首个可运行 provider 适配器。
- 支持最小原子能力: 连通性检查、会话创建、消息发送、会话历史查询、subagent 调用、能力准备。
- 将 OpenClaw 的私有接口语义转译为统一端口语义。
- 为 Agent 服务接入模块提供真实可用的 provider 实现。

**Non-Goals:**
- 不修改上层领域边界，使 OpenClaw 语义泄漏到业务层。
- 不实现多 provider 聚合、负载均衡、自动切换与失败重试。
- 不把任务规划器、任务执行调度器或平台脚本运行器写进适配器层。
- 不在本提案中扩展除 OpenClaw 之外的其他 provider。

## Decisions

### 1. 适配器只实现原子 provider 能力, 不承载业务编排

**Decision**
- OpenClaw 适配器只实现统一端口定义的原子能力，不直接实现引流工作创建逻辑或任务调度逻辑。

**Rationale**
- 这样可以保证 provider 层职责单一，也避免把 OpenClaw 行为错误上升为业务语义。

**Alternatives Considered**
- 在适配器中直接实现任务规划和执行编排。
  - 放弃原因: 会让 provider 适配层侵入业务域。

### 2. 通过单独 client/gateway 封装 OpenClaw 交互细节

**Decision**
- 适配器内部应把 OpenClaw 的 HTTP 调用、鉴权、错误映射和响应解析聚合到专门的 client 或 gateway 封装中。

**Rationale**
- 这有利于测试，也能让 provider 适配器保持围绕端口语义组织，而不是被 HTTP 细节主导。

**Alternatives Considered**
- 在每个适配器方法中分散直接发请求。
  - 放弃原因: 容易造成重复逻辑和错误映射不一致。

### 3. 能力准备按“provider 交互驱动”落地

**Decision**
- OpenClaw 的能力准备通过 provider 交互实现，当前可以采用 prompt 驱动方式，但对上层只暴露成功/失败及必要状态。

**Rationale**
- 这符合用户当前对“能力准备”而非“安装动作”的表述，也给后续更换准备方式留出空间。

**Alternatives Considered**
- 直接把 Skill 安装命令固化为上层接口。
  - 放弃原因: 会把实现细节固化到业务边界。

### 4. 错误语义统一映射到 provider-neutral 结果

**Decision**
- OpenClaw 适配器需要把连接失败、认证失败、调用失败和返回异常映射为统一的 provider-neutral 错误语义。

**Rationale**
- 这样上层 Agent 服务接入模块才可以稳定处理状态与失败，而不理解 OpenClaw 私有错误细节。

**Alternatives Considered**
- 原样透传 OpenClaw 错误。
  - 放弃原因: 会让上层耦合 provider 实现。

## Risks / Trade-offs

- [OpenClaw 实际接口可能存在调研偏差] -> 先围绕最小能力集合设计端口，若接口细节不符再在适配层调整。
- [prompt 驱动的能力准备结果可能不稳定] -> 上层只依赖显式成功/失败状态，不依赖 provider 返回的自由文本语义。
- [首期只支持 OpenClaw 会让抽象看起来“只有一个实现”] -> 通过端口和错误映射持续保持抽象边界，避免为单实现放弃解耦。

## Migration Plan

1. 对齐 Agent 服务接入模块定义的 provider 端口能力。
2. 在 `src/adapters/agent/openclaw/` 中实现 OpenClaw client/gateway 封装。
3. 实现连通性检查、会话相关能力、subagent 调用和能力准备能力。
4. 将 OpenClaw 适配器注册到 Agent 服务接入模块的 provider 装配流程中。
5. 通过本地 OpenClaw 环境完成最小集成验证。

## Open Questions

- OpenClaw 当前稳定可用的会话、历史查询和 subagent 接口边界，需要在真正实现前做一次接口确认。
- 凭证模式是统一走 header、query 还是其他鉴权方式，需要在适配实现前锁定。
