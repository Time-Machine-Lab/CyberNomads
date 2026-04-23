# 受控工具

## 允许的持久化边界

只能通过 Cybernomads 受控 API/工具持久化任务集：

- 为引流工作创建当前任务集：`POST /api/traffic-works/{trafficWorkId}/task-set`
- 为引流工作替换当前任务集：`PUT /api/traffic-works/{trafficWorkId}/task-set`

首次引流工作拆分后使用创建接口。引流工作更新并重新拆分后使用替换接口。

## 禁止事项

- 不要直接编辑数据库文件或运行时元数据存储。
- 不要通过临时脚本写入任务记录。
- 不要让 Agent 或 subagent 绕过任务模块。
- 不要从本 Skill 修改引流工作生命周期状态。

## 持久化检查清单

- 确认任务集只归属于一个 `trafficWorkId`。
- 确认每个任务都有 `taskKey`、`name`、`instruction`、`condition`、`inputNeeds` 和 `contextRef`。
- 确认每个 `relyOnTaskKey` 都指向同一请求内的另一个任务。
- 用一次受控请求提交完整任务集。
- 将持久化错误视为任务准备失败反馈给调用方。
