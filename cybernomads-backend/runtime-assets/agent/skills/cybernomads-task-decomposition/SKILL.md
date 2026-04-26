---
name: cybernomads-task-decomposition
description: 指导 Cybernomads Agent 基于引流工作信息、产品正文、策略正文、对象绑定和引流工作目录，完成任务拆分、资源准备、任务集落库与自检收口。用于需要把一个引流工作拆成可执行任务，并且优先通过 Skill 内置 JS 工具而不是手写接口请求来复制资源、保存任务集和执行自检的场景。
---

# Cybernomads 任务拆分

按顺序执行本 Skill。不要跳过“资源复制”“任务落库”“自检”三个收口步骤，也不要把原始接口调用重新手写一遍。

## 可用工具

| 工具 | 路径 | 作用 |
| --- | --- | --- |
| 资源复制工具 | `scripts/copy-runtime-resource.js` | 将全局 `agent/skills` 或 `agent/knowledge` 下的资源复制到当前引流工作目录 |
| 任务批量保存工具 | `scripts/batch-save-tasks.js` | 校验 `task-set.json` 并通过受控接口批量保存任务 |
| 自检工具 | `scripts/run-self-check.js` | 检查任务结构、资源复制结果、任务保存结果是否完整闭环 |

需要查看参数、输出格式和示例命令时，读取 [available-tools.md](references/available-tools.md)。

## 执行流程

### 第 1 步：理解工作上下文

1. 先读取 [work-context-layout.md](references/work-context-layout.md)。
2. 再读取 [runtime-resource-selection.md](references/runtime-resource-selection.md)。
3. 如需查看有哪些工具可直接执行，再读取 [available-tools.md](references/available-tools.md)。
4. 在当前引流工作目录下预留 `data/task-decomposition/`，把本次拆分过程中的中间产物都放进去。

完成标准：

- 你已经理解当前引流工作目录的 `skills/`、`tools/`、`knowledge/`、`data/` 分工。
- 你已经知道应该从 `Agent资源清单.md` 中有哪些全局资源可以在后续任务中使用。

### 第 2 步：设计任务集

1. 读取 [decomposition-method.md](references/decomposition-method.md)。
2. 读取 [task-shape.md](references/task-shape.md)。
3. 如有上下游协作，再读取 [output-and-collaboration.md](references/output-and-collaboration.md)。
4. 产出一份严格符合 `TaskSetWriteInput` 契约的 `data/task-decomposition/task-set.json`。

完成标准：

- 每个任务都有稳定英文 `taskKey`。
- 每个任务都有中文 `name`、清晰 `instruction`、`contextRef`、`condition`、`inputNeeds`。
- 依赖关系和输入来源是结构化的，不是自然语言含糊描述。

### 第 3 步：准备执行资源

1. 必须复制 `cybernomads-task-execution` 到当前工作目录。
2. 根据策略和平台需求，复制额外的 Skill 或 Knowledge。
3. 只能通过 `scripts/copy-runtime-resource.js` 完成复制。
4. 每次复制后的结果都保存到 `data/task-decomposition/` 下，例如：
   - `copy-skill-cybernomads-task-execution.json`
   - `copy-skill-bilibili-web-api.json`
   - `copy-knowledge-agent-resource-catalog.json`

完成标准：

- 当前任务执行必需的 Skill 已进入工作目录。
- 当前任务共用的 Knowledge 已进入工作目录。
- 每一次复制都有可追溯的结果文件。

### 第 4 步：保存任务集

1. 使用 `scripts/batch-save-tasks.js`。
2. 首次创建引流工作时使用 `mode=create`。
3. 更新已有引流工作并重建任务集时使用 `mode=replace`。
4. 保存结果写入 `data/task-decomposition/save-result.json`。

完成标准：

- 任务集已经通过受控工具尝试保存。
- 如果保存失败，你已经拿到明确的字段级错误并返回修正任务集，而不是直接宣布完成。

### 第 5 步：执行自检

1. 读取 [self-checklist.md](references/self-checklist.md)。
2. 使用 `scripts/run-self-check.js`，至少传入：
   - `task-set.json`
   - `save-result.json`
   - 所有资源复制结果文件
3. 自检报告保存到 `data/task-decomposition/self-check-report.json`。
4. 只有当自检结果 `ok=true` 时，才允许结束本次任务拆分。

完成标准：

- 任务结构合法。
- 必备资源已复制。
- 任务保存结果与 `task-set.json` 一致。
- 没有跳过关键步骤。

## 最终输出

最终回答只输出 `task-set.json` 的 JSON 对象本体：

- 不要加 Markdown 代码块
- 不要加解释文字
- 不要加“已完成”之类的额外说明

## 强约束

- 不要直接编辑数据库文件。
- 不要手写原始 HTTP 请求替代已有脚本。
- 不要跳过任务保存步骤。
- 不要跳过自检步骤。
- 不要在自检失败时声称任务拆分完成。
- 不要把任务文档、数据文件或工具脚本写到当前引流工作目录之外。
