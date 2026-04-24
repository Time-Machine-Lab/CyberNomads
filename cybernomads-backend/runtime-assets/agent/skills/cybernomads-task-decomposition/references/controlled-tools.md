# 受控工具与接口

## 优先使用的受控入口

当前任务拆分阶段优先使用以下受控入口：

- 复制运行时 Agent 资源  
  `POST /api/task-decomposition-support-tools/runtime-resource-copy`

- 批量保存任务集  
  `POST /api/task-decomposition-support-tools/batch-save-tasks`

## 批量保存模式

- 首次创建引流工作后的任务拆分：`mode = "create"`
- 引流工作更新后的任务重建：`mode = "replace"`

## 兼容入口

如果当前环境没有暴露专门的任务拆分支撑工具入口，而是只暴露任务模块 API，则可以使用：

- `POST /api/traffic-works/{trafficWorkId}/task-set`
- `PUT /api/traffic-works/{trafficWorkId}/task-set`

但无论走哪种入口，都必须遵守同一条原则：整批成功或整批失败，不允许你直接编辑数据库。

## 资源复制规则

- 只能从 Cybernomads 全局 `agent/skills/` 或 `agent/knowledge/` 复制到当前引流工作目录。
- Skill 复制到当前工作 `skills/`
- Knowledge 复制到当前工作 `knowledge/`
- 不要把资源复制到工作目录之外

## 保存规则

- 一次提交完整任务集
- 失败时要关注返回的字段级错误原因
- 不要忽略校验错误继续声称“任务拆分完成”

## 禁止事项

- 不要直接编辑数据库文件
- 不要使用临时脚本绕过任务模块写任务记录
- 不要在本 Skill 中修改引流工作生命周期状态
- 不要把路径越界请求包装成“资源复制”
