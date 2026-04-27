---
name: cybernomads-task-decomposition
description: 指导 Cybernomads Agent 基于引流工作信息、产品正文、策略正文、对象绑定和引流工作目录，完成任务拆分、资源准备、任务归档与全流程自检。
---

# Cybernomads 任务拆分

本 Skill 采用“主入口 + 模块化说明”的结构。
先阅读模块 1 建立全局视角，再按顺序阅读模块 2 到模块 7，不要跳过资源、归档或自检模块。

## 阅读顺序

1. [模块 1：总览与入口](references/module-1-overview.md)
2. [模块 2：可用资源](references/module-2-runtime-resources.md)
3. [模块 3：任务元数据结构](references/module-3-task-contract.md)
4. [模块 4：任务拆分方法论](references/module-4-decomposition-method.md)
5. [模块 5：上下文与数据准备](references/module-5-context-preparation.md)
6. [模块 6：任务归档至系统](references/module-6-persist-task-set.md)
7. [模块 7：全流程自检](references/module-7-self-check.md)
8. [任务文档模板](references/task-document-template.md)

## 执行原则

- 先理解模块，再执行动作。
- 先生成 `task-set.json`，再准备资源、保存任务、执行自检。
- 受控动作优先使用 Skill 自带脚本，不要手写等价接口调用。
- 任务文档必须遵循 `./agent/knowledge/引流任务文档模板.md`。
- 每个任务文档必须位于当前引流工作目录根目录，文件名固定为 `./<taskKey>.md`。
- 文档中的 Skill、Tools、Knowledge、Data 路径必须全部使用相对路径。
- 只有当“任务结构 + 资源准备 + 任务归档 + 自检报告”全部完成后，才算任务拆分完成。

## 输出要求

最终回复只输出 `task-set.json` 的 JSON 对象本体：

- 不要加 Markdown 代码块
- 不要加解释文字
- 不要加“已完成”之类的额外说明

## 强约束

- 不要直接编辑数据库文件。
- 不要手写原始 HTTP 请求替代已有脚本。
- 不要跳过任务归档步骤。
- 不要跳过自检步骤。
- 不要在自检失败时声称任务拆分完成。
- 不要把任务文档、数据文件或工具脚本写到当前引流工作目录之外。
