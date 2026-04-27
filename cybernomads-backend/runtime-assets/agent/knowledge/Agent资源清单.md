# Agent资源清单

本文档记录当前 Cybernomads 运行时会提供给 Agent 使用的全局资源，供任务拆分、任务执行和后续维护统一查阅。

## Skill 清单

| id                             | skill文件夹名称                | skill作用                                                                                                 |
| ------------------------------ | ------------------------------ | --------------------------------------------------------------------------------------------------------- |
| bilibili-web-api               | bilibili-web-api               | 提供 B 站 Web 能力调用支持，包括登录、Cookie 刷新、账号信息读取、视频搜索、评论操作、通知读取和私信操作。 |
| cybernomads-task-decomposition | cybernomads-task-decomposition | 指导 Agent 基于引流工作上下文、产品和策略信息完成任务拆分，并通过受控方式准备任务所需资源。               |
| cybernomads-task-execution     | cybernomads-task-execution     | 指导 Agent 或 subagent 在单任务边界内执行任务、保存产出，并通过受控方式回写任务状态与产出记录。           |

## Knowledge 清单

| id                             | knowledge文件名称   | knowledge作用                                                                      |
| ------------------------------ | ------------------- | ---------------------------------------------------------------------------------- |
| agent-resource-catalog         | Agent资源清单.md    | 记录当前 Agent 全局可用 Skill 与 Knowledge 资源，供任务拆分时选择和引用。          |
| traffic-task-document-template | 引流任务文档模板.md | 规定引流任务 Markdown 的固定结构、相对路径表达方式和产出要求，供任务拆分阶段参考。 |
