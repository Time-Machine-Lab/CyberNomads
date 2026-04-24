## Why

当前引流工作创建后发给 Agent 的任务拆分消息虽然已经包含产品正文、策略正文和路径信息，但路径表达仍不够稳定：工作目录和 Skill 路径直接以绝对路径发出，会让消息耦合具体机器目录结构，也不利于后续切换远程 Agent。现在需要把这条链路收紧为“提供一个 Cybernomads 根目录绝对路径，其余路径统一相对化”，这样既能满足本地 OpenClaw 的真实文件访问需求，也能为后续远程化保留更清晰的适配边界。

## What Changes

- 重构引流工作创建/更新时发给 Agent 的任务拆分提示词，改为稳定的业务上下文结构：引流工作信息、产品信息、策略信息、任务拆分 Skill 信息、规则。
- 在任务拆分请求中显式传递 Cybernomads 目录绝对路径，并把引流工作目录和任务拆分 `SKILL.md` 路径改为相对该目录的相对路径。
- 收敛提示词职责，只负责告诉 Agent 各部分是什么、路径怎么解析、作用是什么，不在业务提示词里重复描述任务拆分细节。
- 增加运行时校验，确保任务拆分请求发出前，所需的引流工作目录和任务拆分 Skill 文件路径都可解析。
- 增加测试覆盖，证明构造出的任务拆分请求已经加载了所需数据，并且传递给 Agent 服务的内容符合预期。

## Capabilities

### New Capabilities

- None.

### Modified Capabilities

- `traffic-work-task-decomposition-integration`: 更新任务拆分请求的消息结构、路径传递语义与前置校验要求，确保 Agent 能稳定拿到引流工作业务上下文、Cybernomads 根目录绝对路径，以及相对化的工作目录和任务拆分 Skill 路径。

## Impact

- `src/adapters/agent/traffic-work-context-preparation-adapter.ts`
- `src/shared/agent-task-skill-instructions.ts`
- `src/modules/traffic-works/`
- `src/adapters/skill/local/`
- `tests/unit/`
- `tests/integration/`
