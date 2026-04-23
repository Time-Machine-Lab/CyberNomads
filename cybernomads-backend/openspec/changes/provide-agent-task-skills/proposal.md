## Why

任务领域依赖 Agent 完成两件关键工作：创建引流工作时拆分任务，执行任务时按任务说明产出数据、更新状态并记录产出。但这两类能力不能靠散落提示词临时拼接，否则任务粒度、condition、input_need、产出记录和失败回写都会漂移。

同时，这些能力本质上是交付给 Agent 服务使用的产品内 Skill 资产，而不是普通开发文档。它们需要按 `skill-creator` 的方法论创建、校验和维护，确保 SKILL.md 触发描述清晰、正文简洁、可渐进加载、可被打包进运行时资产，并且不会把 OpenClaw 私有协议或平台脚本细节写死在业务语义里。

## What Changes

- 新增 Cybernomads 任务拆分 Skill，用于指导 Agent 基于引流工作快照生成任务集、任务说明、执行条件、输入需求、上下文资产规划和任务协作关系。
- 新增 Cybernomads 任务执行 Skill，用于指导 Agent/subagent 加载任务上下文、执行单个任务、写入任务数据区域、创建产出记录、并通过受控工具更新任务状态。
- 明确 Skill 开发必须遵循 `skill-creator` 工作流：理解用例、规划资源、初始化 Skill、编辑 SKILL.md 与引用资料、运行 quick validation、必要时做前向测试。
- 明确这些 Skill 默认作为 Cybernomads 产品运行时资产交付，例如 `runtime-assets/skills/`，而不是安装到开发者个人 `$CODEX_HOME/skills`。
- 明确 Agent 不允许直接修改 SQLite 或绕过后端模块；任务创建、状态更新、产出记录写入都必须通过 Cybernomads 受控工具/API。

## Capabilities

### New Capabilities
- `agent-task-skills`: 提供任务拆分与任务执行的 Agent Skill 资产、创建规范、验证规则和受控工具协作约束。

### Modified Capabilities
- None.

## Impact

- `runtime-assets/skills/cybernomads-task-decomposition/`
- `runtime-assets/skills/cybernomads-task-execution/`
- `runtime-assets/skills/**/SKILL.md`
- `runtime-assets/skills/**/agents/openai.yaml`
- `runtime-assets/skills/**/references/`
- `src/adapters/skill/` 或等价 Skill 资产加载适配层
- `src/modules/agent-access/`
- `src/modules/tasks/`
- `tests/unit/skill-assets*.test.ts`

