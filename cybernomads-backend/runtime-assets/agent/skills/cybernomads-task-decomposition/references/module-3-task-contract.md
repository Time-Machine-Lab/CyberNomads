# 模块 3：任务元数据结构

本模块解决三个问题：

1. 任务集最终要长什么样
2. 每个任务必须具备哪些属性
3. 哪些字段是任务拆分阶段绝不能省略的

## 最终契约

任务拆分结果必须能被 Cybernomads 任务保存入口直接接收，本体结构是 `TaskSetWriteInput`。

核心组成：

- `source`
- `tasks[]`

每个任务至少必须具备：

- `taskKey`
- `name`
- `instruction`
- `contextRef`
- `condition`
- `inputPrompt`

建议必须具备：

- `documentRef`

## 字段理解

- `taskKey`
  - 稳定英文键
  - 同一次任务集内唯一
- `name`
  - 中文可读任务名
- `instruction`
  - 后续 subagent 的执行说明
- `documentRef`
  - 任务文档在工作目录内的引用
  - 必须写成 `./<taskKey>.md`
  - 必须直接落在当前引流工作目录根目录，不允许写成 `./tasks/<taskKey>.md`
- `contextRef`
  - 后续执行时优先加载的上下文入口
  - 如果是资源路径，必须使用以当前引流工作目录为根的相对路径，例如 `./skills/bilibili-web-api`
- `condition.cron`
  - 定时触发条件，没有就填 `null`
- `condition.relyOnTaskKeys`
  - 依赖哪些上游任务
- `inputPrompt`
  - 使用一段完整提示词说明任务需要哪些输入
  - 必须写清楚输入从哪里拿、怎么理解、怎么消费
  - 如果提示词中引用文件或目录，必须使用相对路径，不能写成绝对路径或 `work/<trafficWorkId>/...`

## 任务必须具备的质量

- 任务边界清晰
- 输入获取方式明确
- 上游依赖明确
- 产出预期明确
- 能够独立交给一个 subagent 执行

## 深入细节

如需完整 JSON 结构和字段规则，读取 [task-shape.md](task-shape.md)。

## 你现在应该做什么

- 先明确这次要输出的 `task-set.json` 长什么样
- 然后继续读取 [模块 4：任务拆分方法论](module-4-decomposition-method.md)
