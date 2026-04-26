# 受控工具与接口

任务拆分阶段优先使用 Skill 自带脚本，而不是在提示词里手写接口调用。

## 首选工具

### 1. 资源复制工具

- 脚本：`scripts/copy-runtime-resource.js`
- 封装接口：`POST /api/task-decomposition-support-tools/runtime-resource-copy`

用途：

- 复制全局 `agent/skills/` 下的 Skill 到当前引流工作目录 `skills/`
- 复制全局 `agent/knowledge/` 下的 Knowledge 到当前引流工作目录 `knowledge/`

### 2. 批量保存任务工具

- 脚本：`scripts/batch-save-tasks.js`
- 封装接口：`POST /api/task-decomposition-support-tools/batch-save-tasks`

用途：

- 校验 `task-set.json`
- 以 `create` 或 `replace` 模式批量保存任务集

保存模式：

- 首次创建引流工作后的任务拆分：`mode = "create"`
- 引流工作更新后的任务重建：`mode = "replace"`

### 3. 自检工具

- 脚本：`scripts/run-self-check.js`
- 作用：不直接调用后端接口，但会校验任务结构、资源复制结果和保存结果是否闭环

## 兼容接口

如果当前环境暂时没有暴露专门的任务拆分支持工具接口，而是只暴露任务模块 API，则可兼容：

- `POST /api/traffic-works/{trafficWorkId}/task-set`
- `PUT /api/traffic-works/{trafficWorkId}/task-set`

但在当前 Skill 中，优先使用已封装的 JS 工具，而不是自行拼接兼容请求。

## 资源复制规则

- 只允许从 Cybernomads 全局 `agent/skills/` 或 `agent/knowledge/` 复制资源
- Skill 只能复制到当前工作目录的 `skills/`
- Knowledge 只能复制到当前工作目录的 `knowledge/`
- 不要把资源复制到工作目录之外

## 保存规则

- 一次提交完整任务集
- 失败时必须关注返回的字段级错误原因
- 不要忽略校验错误后继续声称“任务拆分完成”

## 禁止事项

- 不要直接编辑数据库文件
- 不要使用临时脚本绕过任务模块写任务记录
- 不要在本 Skill 中修改引流工作生命周期状态
- 不要把路径越界请求包装成“资源复制”
