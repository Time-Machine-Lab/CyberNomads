---
name: cybernomads-task-execution
description: 指导 Cybernomads Agent 执行单个任务。适用于 Agent 或 subagent 收到一个 Cybernomads 任务后，需要加载任务详情和上下文、使用声明的执行输入提示词与上游产出、生成任务数据、创建产出记录，并通过受控 Cybernomads 工具或 API 更新任务状态的场景，且不得重新规划整个引流工作。
---

# Cybernomads 任务执行

## 概览

使用本 Skill 执行一个且仅一个 Cybernomads 任务。保持在提交的任务边界内，使用任务声明的上下文和执行输入提示词，并通过受控 Cybernomads API/工具回写状态和产出。

## 工作流

1. 加载任务详情，包括任务 ID、任务说明、执行条件、执行输入提示词、上下文引用和当前状态。
2. 开始执行前阅读 [execution-flow.md](references/execution-flow.md)。
3. 加载引用的工作或任务上下文，以及 `inputPrompt` 指向的上游产出记录或数据文件。
4. 只使用可用工具和资产执行任务说明。
5. 将产出的任务数据保存到任务数据区域或其他可引用的产物位置。
6. 阅读 [controlled-tools.md](references/controlled-tools.md)，然后为产出的数据创建任务产出记录。
7. 当任务目标达成时将任务标记为 `completed`；无法完成时标记为 `failed`。失败处理参考 [failure-rules.md](references/failure-rules.md)。

## 边界

- 不要重新规划整个引流工作，也不要替换任务集。
- 不要直接编辑数据库文件或运行时元数据存储。
- 不要发明 `ready`、`running`、`completed`、`failed` 之外的状态。
- 不要在任务中实现 provider 消息协议、会话处理或平台自动化细节。
- 不要把所有产出强行塞进一个通用 schema。任务产出数据应单独保存，并创建抽象产出记录。
