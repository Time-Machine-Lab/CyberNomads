# 模块 6：任务归档至系统

本模块解决三个问题：

1. 任务集如何保存到 Cybernomads
2. 归档时必须经过哪些受控步骤
3. 保存失败后应该如何处理

## 归档入口

任务拆分阶段不要自己写接口请求，优先使用：

- `scripts/batch-save-tasks.js`
- `scripts/report-context-preparation.js`

## 必须遵循的顺序

1. 先生成并检查 `task-set.json`
2. 立即调用 `scripts/batch-save-tasks.js` 保存任务元数据
3. 只有 `batch-save-tasks` 成功后，才能开始创建任务 Markdown 文档
4. 任务文档、资源复制、自检都完成后，再调用 `scripts/report-context-preparation.js --status prepared`
5. 如果中间任一步失败，调用 `scripts/report-context-preparation.js --status failed --reason <失败原因>`

## 保存模式

- 首次创建引流工作：`mode=create`
- 更新已有引流工作并重建任务集：`mode=replace`

## 标准产物

任务归档后至少应留下：

- `data/task-decomposition/task-set.json`
- `data/task-decomposition/save-result.json`
- `data/task-decomposition/preparation-status.json`

## 失败处理

- 如果任务保存失败，必须根据字段级错误修正 `task-set.json`
- 保存失败时，不要继续创建任务文档
- 不要绕过受控入口直接改数据库
- 失败原因要足够具体，便于 Agent 基于原因重试

## 深入细节

- 工具和接口：读取 [controlled-tools.md](controlled-tools.md)
- 脚本命令：读取 [available-tools.md](available-tools.md)

## 你现在应该做什么

- 完成任务元数据保存
- 保存成功后再进入任务文档与状态回写步骤
- 然后继续读取 [模块 7：全流程自检](module-7-self-check.md)
