# Agent资源清单

本文档记录 Cybernomads 当前随运行时一并提供给 Agent 使用的可复用 Skill 资源，供任务拆分、任务执行和后续资源维护时统一查阅。

## Skill 清单

| id | skill文件夹名称 | skill作用 |
| --- | --- | --- |
| bilibili-web-api | bilibili-web-api | 提供 B 站 Web 接口调用能力，支持扫码登录、Cookie 刷新、账号信息读取、视频搜索、评论操作、通知读取和私信操作。 |
| cybernomads-task-decomposition | cybernomads-task-decomposition | 指导 Agent 基于引流工作上下文、产品和策略信息完成任务拆分，并通过受控方式持久化任务集。 |
| cybernomads-task-execution | cybernomads-task-execution | 指导 Agent 或 subagent 在单任务边界内执行任务、保存产出并通过受控方式回写任务状态与产出记录。 |
