# 受控工具

## 读取操作

使用 Cybernomads 受控 API/工具加载任务状态：

- 获取任务详情：`GET /api/tasks/{taskId}`
- 查询任务产出记录：`GET /api/tasks/{taskId}/outputs`
- 通过产品提供的上下文引用加载工作或任务上下文资产。

## 写入操作

使用 Cybernomads 受控 API/工具执行任务写入：

- 更新任务状态：`PATCH /api/tasks/{taskId}/status`
- 创建产出记录：`POST /api/tasks/{taskId}/outputs`

## 状态规则

- 只有任务确实被提交执行时，才标记为 `running`。
- 只有任务目标和必需产出处理都完成时，才标记为 `completed`。
- 当任务无法满足说明要求时，标记为 `failed`。
- 不要使用 `ready`、`running`、`completed`、`failed` 之外的状态。

## 禁止事项

- 不要直接编辑数据库文件或运行时元数据存储。
- 不要通过本执行 Skill 创建或替换任务集。
- 不要改变引流工作生命周期状态。
- 不要实现 provider 会话、消息传输或平台自动化内部细节。
