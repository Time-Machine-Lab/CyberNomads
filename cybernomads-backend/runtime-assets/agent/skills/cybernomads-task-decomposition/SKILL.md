---
name: cybernomads-task-decomposition
description: 指导 Cybernomads Agent 基于引流工作信息、产品正文、策略正文、对象绑定和引流工作目录，完成任务拆分、资源准备、任务集落库与全流程自检。用于需要把一个引流工作拆成可执行任务，并且要按模块化结构理解工具、资源、任务契约、拆分方法、上下文准备、系统归档和自检闭环的场景。
---

# Cybernomads 任务拆分

本 Skill 采用“主入口 + 模块化说明”的结构。

先阅读模块 1 建立全局视角，再按顺序阅读模块 2 到模块 7。不要跳读到某个局部细节后就直接开始拆分任务，否则很容易漏掉资源复制、任务落库或自检收口。

## 阅读顺序

1. [模块 1：总览与入口](references/module-1-overview.md)
2. [模块 2：可用资源](references/module-2-runtime-resources.md)
3. [模块 3：任务元数据结构](references/module-3-task-contract.md)
4. [模块 4：任务拆分方法论](references/module-4-decomposition-method.md)
5. [模块 5：上下文与数据准备](references/module-5-context-preparation.md)
6. [模块 6：任务归档至系统](references/module-6-persist-task-set.md)
7. [模块 7：全流程自检](references/module-7-self-check.md)

## 执行原则

- 先理解模块，再执行动作。
- 先生成 `task-set.json`，再复制资源、保存任务、自检收口。
- 受控动作优先使用 Skill 自带脚本，不要手写等价接口调用。
- 只有当“任务结构 + 资源复制 + 任务保存 + 自检报告”全部完成后，才算任务拆分完成。

## 输出要求

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
