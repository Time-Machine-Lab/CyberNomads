## Context

当前任务拆分能力已经不再只是“让 Agent 返回一个任务数组”。按照最新产品设计，任务拆分 Skill 需要理解引流工作目录结构、识别当前 Cybernomads 的全局 Agent 资源、判断应该把哪些资源复制到当前引流工作上下文、为每个任务设计输入需求与数据协作关系，并在结束前做一次自检。现有 Skill 能力与这个目标有明显差距。

同时，用户明确提出两条新的建设原则：

- 任务拆分 Skill 的创建与更新必须遵循 `skill-creator` 工作流
- 任务拆分 Skill 应以中文为主语言，让 Agent 优先按中文业务语义理解产品、策略和资源约束

## Goals / Non-Goals

**Goals:**

- 重建一个面向 Cybernomads 最新任务拆分职责的正式运行时 Skill。
- 明确 `SKILL.md` 与 `references/` 的分工，让 Skill 既完整又不过载。
- 让 Skill 内部流程稳定覆盖资源识别、任务拆分、上下文准备、数据协作和自检。
- 把“中文提示与中文规则”提升为正式约束，而不是临时偏好。

**Non-Goals:**

- 不在本 change 中实现后端工具或接口本身。
- 不在本 change 中改造任务执行 Skill。
- 不在本 change 中重写交通工作创建时的业务 prompt 构建逻辑。

## Decisions

### 1. 使用 `skill-creator` 作为唯一 Skill 创建与重建入口

这次不直接手工拼目录，而是要求通过 `skill-creator` 工作流创建或重建任务拆分 Skill。这样可以保证 Skill 目录结构、`agents/openai.yaml`、校验流程和资源组织方式与团队其他 Skill 保持一致。

### 2. 以中文作为任务拆分 Skill 的主说明语言

任务拆分面对的输入核心是产品、策略、引流工作和资源语义，这些内容当前都以中文沉淀为主。与其让 Agent 在业务理解阶段做一次“中文输入到英文中间理解”的额外跳转，不如直接要求 Skill 主体用中文表达。对外部 provider 的具体协议细节仍然不放进 Skill。

### 3. 用“主 Skill + references”结构承载复杂规则

`SKILL.md` 保留以下内容：

- Skill 的主职责
- 工作流程导航
- 关键边界与禁区
- 何时读取哪个 reference

而以下详细内容下沉到 `references/`：

- 引流工作目录结构说明
- 任务拆分方法论
- 任务元数据与数据协作规则
- 自检清单

这样可以避免 `SKILL.md` 过重，也更适合后续单独迭代某一类规则。

### 4. Skill 的最终职责包含“收口确认”，而不只是“拆出任务”

这次 Skill 的完成标准不再只是“想出几个任务”，而是需要在流程上把任务拆分结果收口到两个层面：

- 文件层：任务文档、数据文件、工具脚本、公共知识
- 结构层：调用受控工具完成任务批量保存

在正式实现里，即便某些文件落地动作仍由后端协助完成，Skill 也必须在规则上明确这些成果应当存在。

## Risks / Trade-offs

- [Risk] 中文 Skill 可能让部分英文模型样例或元数据生成不够自然。  
  → Mitigation: 保留 `agents/openai.yaml` 的机器可消费元数据，但 `SKILL.md` 正文以中文为主。

- [Risk] 任务拆分职责过多，可能让单个 Skill 变得过重。  
  → Mitigation: 通过 `references/` 拆分内容，并把工具实现从 Skill 中剥离出去。

- [Risk] 如果后端工具迟迟未补齐，重建后的 Skill 仍无法完全闭环。  
  → Mitigation: 将后端工具拆成独立 change，与 Skill 重建并行推进。

## Migration Plan

1. 使用 `skill-creator` 工作流重建或刷新 `cybernomads-task-decomposition` Skill 目录。
2. 重写 `SKILL.md` 为中文主说明版本。
3. 把复杂规则拆分到 `references/`。
4. 跑 Skill 校验流程，确保结构合法。
5. 后续与工具 change 集成时，再根据真实接口名称微调 Skill 文案。

## Open Questions

- 当前是否要在同一次重建里同步清理 `runtime-assets/skills/` 下的旧副本，还是先保留兼容副本，后续统一迁移？
