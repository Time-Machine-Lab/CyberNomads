# 任务文档模板

任务拆分阶段生成的每一个任务 Markdown，都必须遵循全局模板：

- 模板文件：`./agent/knowledge/引流任务文档模板.md`

## 强制规则

- 每个任务文档都必须放在当前引流工作目录根目录
  - 正确示例：`./search-candidate-videos.md`
  - 错误示例：`./tasks/search-candidate-videos.md`
- 任务文档文件名必须和 `taskKey` 对齐
  - 即：`documentRef = ./<taskKey>.md`
- 文档中提到的 Skill、Tools、Knowledge、Data 路径必须全部使用相对路径
  - 正确示例：`./skills/bilibili-web-api/SKILL.md`
  - 错误示例：`work/<trafficWorkId>/skills/bilibili-web-api/SKILL.md`
  - 错误示例：`D:/Code/.../cybernomads/work/<trafficWorkId>/skills/...`

## 你需要怎么使用模板

1. 先阅读模板文件，理解每个必填模块的目的。
2. 拆分任务时，同时思考每个任务文档在模板中的各个章节该写什么。
3. `task-set.json` 中至少要把以下信息准备完整，便于后续系统生成规范化任务文档：
   - `taskKey`
   - `name`
   - `instruction`
   - `documentRef`
   - `contextRef`
   - `condition`
  - `inputPrompt`
4. 如果某个任务会使用特定 Skill、工具、知识文件或数据文件，必须在 `instruction` 和 `inputPrompt` 中把相对路径说清楚。

## 结果判断标准

- 拿到任何一个任务文档后，不看额外上下文，也能知道：
  - 这个任务要做什么
  - 从哪里获取输入
  - 能使用哪些资源
  - 产出要保存到哪里
  - 下游任务怎么接着用
