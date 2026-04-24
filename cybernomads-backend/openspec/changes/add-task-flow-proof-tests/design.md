## Context

任务领域主流程涉及多个模块：

```mermaid
flowchart LR
    A["Agent 服务配置"] --> B["产品/策略准备"]
    B --> C["创建引流工作"]
    C --> D["Agent 拆分任务"]
    D --> E["任务集落库"]
    E --> F["引流工作 prepared"]
    F --> G["启动 running"]
    G --> H["planner 扫描 ready 任务"]
    H --> I["提交 Agent 执行"]
    I --> J["任务 running"]
    J --> K["Agent/工具回写 completed"]
    K --> L["任务产出记录"]
```

现有测试已经覆盖了一些局部行为，但对于团队来说，仍需要一条可复现、可阅读、可交付给其他 Agent 执行的主流程证明。

## Goals / Non-Goals

**Goals:**
- 验证任务领域从引流工作创建到任务运行的完整 happy path。
- 使用真实应用运行环境、真实 SQLite 和真实本地文件目录。
- 使用 Fake Agent Provider 固定 Agent 拆分和执行输出。
- 生成明确证据文件，证明每一步都符合领域预期。
- 让测试失败时能看出断在哪个业务阶段，而不是只看到一个断言失败。

**Non-Goals:**
- 不验证真实 OpenClaw 服务质量。
- 不依赖前端页面。
- 不测试 B 站脚本或真实平台动作。
- 不实现新的业务能力。
- 不覆盖所有失败边界；失败边界由 `add-task-domain-edge-case-tests` 负责。

## Decisions

### 1. 主流程测试使用 Fake Agent Provider

主流程测试要验证 Cybernomads 后端领域闭环，而不是验证外部 Agent 服务是否稳定。Fake Provider 应固定返回一个包含至少 3 个任务的任务集，并记录所有 Agent 消息，作为证据产物。

### 2. 使用真实应用启动而不是纯 service mock

测试应通过 `startApplication` 或等价入口启动应用，使用临时 working directory、真实 SQLite 和真实文件系统。这样才能证明 runtime bootstrap、文件上下文、HTTP API 和模块集成都可用。

### 3. planner 使用可控 tick

不要依赖真实 1 秒轮询等待。测试应直接调用 planner tick 或通过测试可控入口触发 tick，记录 tick 结果，避免时间不稳定。

### 4. 证据产物是验收核心

测试必须输出可阅读证据，而不是只依赖 test runner 的 pass/fail。证据产物建议包含：

- `report.md`：面向人的测试报告。
- `evidence.json`：结构化流程证据。
- `agent-messages.json`：Agent 拆分与执行消息摘要。
- `planner-ticks.json`：planner tick 扫描与提交结果。
- `final-state.json`：最终引流工作、任务、产出记录状态。
- `runtime-tree.txt`：临时 cybernomads 目录关键结构。

### 5. 产出记录用受控 API 模拟 Agent Skill 回写

真实 Agent 执行 Skill 最终会调用受控工具/API 回写状态和产出记录。主流程测试可以在 Agent 提交执行后，通过受控任务 API 模拟该回写，以证明系统支持闭环。

## Evidence Criteria

主流程测试通过后，`evidence.json` 至少应证明：

- Agent 服务已配置、连接验证成功、能力准备成功。
- 引流工作创建后为 `ready + prepared`。
- Agent 拆分请求已发出，并包含任务拆分 Skill 语义。
- 至少 3 个任务已归属于同一个引流工作。
- 下游任务能表达 `rely_on` 依赖。
- 工作上下文文件存在且包含产品/策略/对象绑定快照。
- 引流工作启动后为 `running`。
- planner tick 扫描到 running 引流工作和 ready 任务。
- planner 成功提交至少一个任务给 Agent 服务。
- 被提交任务状态变为 `running`，随后可通过受控回写变为 `completed`。
- 任务产出记录可查询。

## Risks / Trade-offs

- [风险] 证据文件写入测试目录可能产生噪音。
  → 将产物写到 `tests/artifacts/task-flow-proof/<run-id>/`，并确保 `.gitignore` 或测试规范处理运行时产物。
- [风险] Fake Agent Provider 与真实 OpenClaw 行为不同。
  → 这是有意取舍；主流程证明先固定领域逻辑，真实 OpenClaw smoke test 可另行设计。
- [风险] 主流程测试过长导致失败定位困难。
  → 报告按阶段记录，失败时仍能看到阶段证据。

