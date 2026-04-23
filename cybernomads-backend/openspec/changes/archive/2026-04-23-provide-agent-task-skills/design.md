## Context

Cybernomads 的任务能力不是普通后台 CRUD。任务由 Agent 拆分，并由 Agent/subagent 执行。为了降低 Agent 行为漂移，需要把任务拆分和任务执行沉淀为可复用 Skill 资产。

本 change 使用 `skill-creator` 的原则约束 Skill 工程：Skill 必须轻量、触发描述清晰、正文只保留核心流程，详细格式、示例和受控工具说明放在 `references/` 中按需加载。这样可以避免每次 Agent 执行都塞入过长上下文，也便于后续替换 OpenClaw、SaaS Agent 或自研 Agent 服务。

## Goals / Non-Goals

**Goals:**
- 创建两个独立 Skill：`cybernomads-task-decomposition` 和 `cybernomads-task-execution`。
- 使用 `skill-creator` 的初始化与校验流程生成标准 Skill 目录。
- 明确任务拆分 Skill 的输出规则：任务原子化、condition、input_need、任务上下文引用、产出协作说明。
- 明确任务执行 Skill 的执行规则：加载上下文、执行任务、写入任务数据区域、创建产出记录、回写状态。
- 明确 Agent 只能调用受控工具/API 进行任务创建、状态更新和产出记录写入。

**Non-Goals:**
- 不在 Skill 中实现 OpenClaw adapter。
- 不在 Skill 中实现 B 站脚本或具体平台动作。
- 不把所有任务产出数据定义成统一 schema。
- 不把这些产品内 Skill 安装到开发者个人 Codex 技能目录作为默认行为。

## Decisions

### 1. 拆成两个 Skill，而不是一个大 Skill

任务拆分和任务执行发生在不同阶段，输入输出也不同。拆成两个 Skill 可以降低上下文压力，并减少 Agent 执行单个任务时误加载大量拆分规则的概率。

### 2. Skill 创建必须使用 `skill-creator` 流程

实施时应先阅读并遵守 `skill-creator` 指南，至少完成以下步骤：

- 理解具体使用样例：引流工作创建时拆分 Task1/Task2/Task3，线程规划器提交单个 Task 后执行并回写。
- 规划 Skill 内容：SKILL.md 保留核心步骤，`references/` 保存任务 JSON 形状、受控工具说明、示例任务、失败处理规则。
- 初始化 Skill：使用 `scripts/init_skill.py` 或等价流程创建标准目录，包含 `SKILL.md` 与 `agents/openai.yaml`。
- 编辑 Skill：写清触发描述、执行流程、禁止事项和按需加载引用资料。
- 校验 Skill：运行 `scripts/quick_validate.py <skill-folder>` 或等价校验，确保 frontmatter、命名和目录结构合法。

### 3. 默认创建到产品运行时资产目录

这些 Skill 是 Cybernomads 要交付给外部 Agent 服务的产品资产，不是本机 Codex 开发环境增强工具。因此默认位置应是 `runtime-assets/skills/`。只有用户明确要求时，才考虑同时复制到 `$CODEX_HOME/skills` 进行人工测试。

### 4. SKILL.md 保持短，复杂内容放入 references

每个 Skill 的 `SKILL.md` 应只包含核心工作流、必须遵守的边界和引用导航。以下内容建议放到 references：

- `task-shape.md`：任务拆分输出字段、condition、input_need、任务上下文引用的格式规则。
- `controlled-tools.md`：可调用的 Cybernomads 受控工具/API，以及禁止直接写 SQLite 的规则。
- `examples.md`：B 站热门视频搜索、潜客评论、私信跟进三个任务的拆分与执行示例。
- `failure-rules.md`：任务执行失败时如何判断、如何记录、如何更新状态。

### 5. 受控工具优先于数据库直接写入

Skill 必须明确禁止 Agent/subagent 直接编辑数据库文件或绕过后端模块。所有任务持久化动作都应通过以下受控能力表达：

- 批量创建或替换某个引流工作下的任务集。
- 更新任务状态为 `running`、`completed` 或 `failed`。
- 创建任务产出记录。
- 查询任务详情、任务上下文引用和上游产出记录。

## Skill Shape

```text
runtime-assets/skills/
|-- cybernomads-task-decomposition/
|   |-- SKILL.md
|   |-- agents/
|   |   |-- openai.yaml
|   |-- references/
|       |-- task-shape.md
|       |-- controlled-tools.md
|       |-- examples.md
|-- cybernomads-task-execution/
|   |-- SKILL.md
|   |-- agents/
|   |   |-- openai.yaml
|   |-- references/
|       |-- execution-flow.md
|       |-- controlled-tools.md
|       |-- failure-rules.md
|       |-- examples.md
```

## Risks / Trade-offs

- [风险] Skill 太详细会拖垮 Agent 上下文。
  → 使用渐进加载，SKILL.md 只放核心步骤，细节进入 references。
- [风险] Skill 太抽象会导致 Agent 输出不稳定。
  → 在 references 中提供任务结构示例、受控工具规则和失败处理样例。
- [风险] 直接套用 Codex Skill 目录到产品运行时可能不完全适配 Agent 服务。
  → 使用标准 Skill 结构作为资产源，但 Agent 接入层可以转换或注入给具体 provider。
- [风险] 用户可能误以为本 change 要实现平台脚本。
  → 本 change 只实现任务拆分/执行规则和工具协作，不实现 B 站操作脚本。

## Open Questions

- 是否需要在 Skill 中内置 B 站示例。建议保留为示例，不作为平台实现规则。
- 是否需要在 `agents/openai.yaml` 中配置更强 UI 元信息。当前只要求标准最小元信息。

