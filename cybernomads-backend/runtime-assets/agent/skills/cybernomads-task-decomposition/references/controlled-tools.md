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
- 以 `create` 或 `replace` 模式批量保存任务元数据

保存模式：

- 首次创建引流工作后的任务拆分：`mode = "create"`
- 引流工作更新后的任务重建：`mode = "replace"`

### 3. 引流工作准备状态回写工具

- 脚本：`scripts/report-context-preparation.js`
- 封装接口：`POST /api/task-decomposition-support-tools/context-preparation-status`

用途：

- 当任务元数据、任务文档、资源准备和自检都完成后，回写引流工作的 `contextPreparationStatus`
- 成功时回写 `prepared`
- 失败时回写 `failed`，并附带明确失败原因

### 4. 自检工具

- 脚本：`scripts/run-self-check.js`
- 作用：不直接调用后端接口，但会校验任务结构、资源复制结果和任务保存结果是否闭环

## 关键顺序

必须遵循以下固定顺序：

1. 生成 `task-set.json`
2. 调用批量保存任务工具，把任务元数据保存到 `task` 表
3. 只有任务元数据保存成功后，才能继续创建各个任务文档
4. 准备资源、补齐数据文件、完成自检
5. 最后回写引流工作的准备状态

## 资源复制规则

- 只允许从 Cybernomads 全局 `agent/skills/` 或 `agent/knowledge/` 复制资源
- Skill 只能复制到当前工作目录的 `skills/`
- Knowledge 只能复制到当前工作目录的 `knowledge/`
- 不要把资源复制到工作目录之外

## 保存规则

- 一次提交完整任务集
- 失败时必须关注返回的字段级错误原因
- 如保存失败，不要继续创建任务文档并假装成功

## 禁止事项

- 不要直接编辑数据库文件
- 不要使用临时脚本绕过任务模块写任务记录
- 不要在本 Skill 中手工篡改引流工作状态，必须通过受控回写工具
- 不要把路径越界请求伪装成资源复制
