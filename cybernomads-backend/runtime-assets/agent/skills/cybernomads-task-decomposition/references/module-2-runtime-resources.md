# 模块 2：可用资源

本模块解决三个问题：

1. 什么是当前 Skill 可用的资源
2. 这些资源分别是干嘛的
3. 当前引流工作应该选哪些资源进入工作目录

## 资源分类

当前任务拆分阶段只关心两类全局资源：

- 全局 Skill：复制到当前引流工作目录的 `skills/`
- 全局 Knowledge：复制到当前引流工作目录的 `knowledge/`

这些资源来自 Cybernomads 全局运行时 `agent/` 目录，而不是任意本地路径。

## 资源清单

开始前先读取当前运行时资源清单：

- `./agent/knowledge/Agent资源清单.md`

如果当前提示词给了 Cybernomads 根目录绝对路径，就以该目录为基准定位清单。

## 选择原则

- `cybernomads-task-execution` 默认必须复制，因为后续单任务执行要统一依赖它
- 平台相关 Skill 按真实平台需求复制，例如 B 站场景复制 `bilibili-web-api`
- 共享 Knowledge 只在多个任务都会重复使用时才复制
- 某个任务专用的小脚本优先放在工作目录 `tools/`，不要误当成全局 Skill

## 动作边界

- 只允许从全局 `agent/skills/` 或 `agent/knowledge/` 复制
- 只能通过 `scripts/copy-runtime-resource.js` 执行复制
- 每次复制结果都要保存到 `data/task-decomposition/`

## 深入细节

如需资源选择细则，读取 [runtime-resource-selection.md](runtime-resource-selection.md)。

## 你现在应该做什么

- 先列出本次引流工作需要的 Skill 和 Knowledge
- 然后继续读取 [模块 3：任务元数据结构](module-3-task-contract.md)
