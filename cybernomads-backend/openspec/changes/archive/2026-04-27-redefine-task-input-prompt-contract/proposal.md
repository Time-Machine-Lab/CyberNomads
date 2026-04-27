## Why

当前任务领域把 `input_needs_json` 建模为结构化数组，并要求每项包含 `name`、`description`、`source`。但真实业务里，这个字段本质上是一段由任务拆分 Agent 生成、再由任务执行 Agent 消费的输入获取提示词，用来指导执行阶段“去哪里拿输入、怎么理解输入、如何消费输入”。继续维持数组语义会让任务契约、Skill 设计和运行时存储长期偏离真实业务模型，因此需要尽快统一。

## What Changes

- **BREAKING** 将任务契约中的 `inputNeeds` 从结构化数组语义重定义为单段输入提示词语义，并同步调整任务领域类型、API 模型、SQLite 存储映射与校验逻辑。
- **BREAKING** 更新任务拆分 Skill、任务执行 Skill 及其工具脚本，使任务拆分阶段产出输入提示词，任务执行阶段按提示词消费输入，而不再依赖 `name/description/source` 数组结构。
- 更新 `docs/api/`、`docs/sql/`、领域设计文档与 OpenSpec 主 specs，确保顶层契约、开发文档和运行时实现语义一致。
- 调整现有单元测试、集成测试与运行时校验，覆盖“输入提示词”新模型，并决定是否为历史数组数据提供兼容读取策略。

## Capabilities

### New Capabilities

None.

### Modified Capabilities

- `task-contracts`: 任务输入需求契约从结构化输入集合改为 Agent 输入提示词语义，相关读写、详情、任务集写入约束需要同步调整。
- `task-module-runtime`: 任务运行时的持久化、校验、返回模型与错误语义需要按照输入提示词模型更新。
- `agent-task-skills`: 任务拆分 Skill 和任务执行 Skill 需要围绕输入提示词重写生成与消费规则。

## Impact

- Affected code:
  - `src/modules/tasks/**`
  - `src/adapters/storage/sqlite/tasks-sqlite-repository.ts`
  - `runtime-assets/agent/skills/cybernomads-task-decomposition/**`
  - `runtime-assets/agent/skills/cybernomads-task-execution/**`
  - related unit/integration tests
- Affected top-level contracts:
  - `docs/api/tasks.yaml`
  - `docs/sql/tasks.sql`
  - `runtime-assets/sql/008-tasks.sql`
- Affected design/spec artifacts:
  - `docs/design/domain/Cybernomads任务领域设计文档.md`
  - `openspec/specs/task-contracts/spec.md`
  - `openspec/specs/task-module-runtime/spec.md`
  - `openspec/specs/agent-task-skills/spec.md`
- Systems impacted:
  - task decomposition flow
  - task execution flow
  - task persistence and task detail/query APIs
