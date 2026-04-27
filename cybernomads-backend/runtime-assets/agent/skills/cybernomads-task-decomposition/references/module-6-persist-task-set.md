# 模块 6：任务归档至系统

本模块解决三个问题：

1. 任务集如何保存到 Cybernomads
2. 归档时必须经过哪些受控步骤
3. 保存失败后应该如何处理

## 归档入口

任务拆分阶段不要自己写接口请求，优先使用：

- `scripts/batch-save-tasks.js`

它会：

1. 读取本地 `task-set.json`
2. 先做结构校验
3. 调用受控任务保存接口
4. 输出保存结果 JSON

## 保存模式

- 首次创建引流工作：`mode=create`
- 更新已有引流工作并重建任务集：`mode=replace`

## 标准产物

任务归档后至少应留下：

- `data/task-decomposition/task-set.json`
- `data/task-decomposition/save-result.json`

## 失败处理

- 如果保存失败，必须根据字段级错误修正 `task-set.json`
- 不要忽略错误后继续宣布完成
- 不要绕过受控入口改数据库

## 深入细节

- 工具和接口：读取 [controlled-tools.md](controlled-tools.md)
- 脚本命令：读取 [available-tools.md](available-tools.md)

## 你现在应该做什么

- 完成任务保存
- 然后继续读取 [模块 7：全流程自检](module-7-self-check.md)
