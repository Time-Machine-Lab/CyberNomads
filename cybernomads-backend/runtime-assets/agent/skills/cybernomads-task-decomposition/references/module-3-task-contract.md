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
  - 默认填写当前引流工作目录，即 `./`
  - 只有当任务确实需要更窄的上下文入口时，才使用以当前引流工作目录为根的相对路径，例如 `./skills/bilibili-web-api`
- `condition.cron`
  - 定时触发条件，没有就填 `null`
- `condition.relyOnTaskKeys`
  - 依赖哪些上游任务
- `inputPrompt`
  - 这是任务保存接口字段名，保存到数据库后对应 `input_needs_json`
  - 它是任务执行 Agent 获取必要输入的提示词，不是普通说明文字
  - 如果任务需要前置数据、外部素材或上游产出，必须写清楚输入从哪里拿、怎么理解、怎么消费
  - 如果任务确实不需要任何前置输入，例如定时搜索或定时查看私信，可以填写空字符串
  - 如果提示词中引用文件或目录，必须使用相对路径，不能写成绝对路径或 `work/<trafficWorkId>/...`

## inputPrompt 填写示例

- 依赖上游视频数据的评论任务：`执行前先读取 ./data/search-candidate-videos.json。该文件由 search-candidate-videos 任务产出，JSON 顶层为数组，每项包含 bvid、title、url、authorName、reason、collectedAt。请基于 reason 判断视频是否适合评论，并将评论结果写入 ./data/comment-on-prospects.json。`
- 需要 AI 图片输入的任务：`执行前先从 ./data/ai-images/ 读取可用图片；如果该目录为空，请使用 ./tools/generate-ai-image.js 生成图片，并将图片路径登记到 ./data/ai-images/index.json 后再执行发送流程。`
- 无前置输入的任务：填写空字符串。

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
