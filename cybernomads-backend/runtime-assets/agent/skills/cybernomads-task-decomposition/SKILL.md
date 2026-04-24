---
name: cybernomads-task-decomposition
description: 指导 Cybernomads Agent 为一个引流工作完成任务拆分、资源识别、上下文准备和最终自检。适用于 Agent 已拿到引流工作信息、产品正文、策略正文、对象绑定、引流工作目录和任务拆分 Skill 路径后，需要把一份引流工作拆成可执行任务集、准备后续 subagent 会使用的上下文资源，并通过受控 Cybernomads 工具或 API 持久化任务集的场景。
---

# Cybernomads 任务拆分

## 概览

使用本 Skill 为一个 Cybernomads 引流工作完成完整的任务拆分收口。你的目标不只是“想出几个任务”，而是让这份引流工作具备后续可执行的任务集、上下文准备计划、数据协作说明和受控持久化路径。

## 工作流

1. 先理解当前提示里提供的引流工作信息、产品信息、策略信息、对象绑定、Cybernomads 根目录和引流工作目录。
2. 先阅读 [work-context-layout.md](references/work-context-layout.md)，确认当前引流工作上下文目录各自承担什么职责。
3. 再阅读 [runtime-resource-selection.md](references/runtime-resource-selection.md)，基于 `Agent资源清单` 判断需要复制哪些全局 Skill 或 Knowledge 到当前工作上下文。
4. 开始拆分任务前，阅读 [decomposition-method.md](references/decomposition-method.md)，按原子化、可协作、可执行的原则设计任务边界。
5. 输出任务集时，严格遵循 [task-shape.md](references/task-shape.md) 的字段约束；如果任务之间要共享数据或协作，再阅读 [output-and-collaboration.md](references/output-and-collaboration.md)。
6. 需要准备资源或保存任务集时，阅读 [controlled-tools.md](references/controlled-tools.md)，只通过受控工具或 API 完成复制与持久化。
7. 收尾前必须逐条执行 [self-checklist.md](references/self-checklist.md)，确认任务、资源、数据和保存路径都已闭环。
8. 如果需要一个真实样例校准思路，参考 [examples.md](references/examples.md)。

## 完成标准

- 你已经得到一组属于同一引流工作的任务。
- 每个任务都具备稳定英文 `taskKey`、中文可读名称、任务说明、执行条件、输入需求、上下文引用和任务文档引用。
- 你已经明确后续 subagent 需要哪些 Skill、Knowledge、工具脚本和数据文件。
- 你已经明确任务之间如何通过依赖关系和数据位置协作。
- 你已经确定任务集将通过受控 Cybernomads 工具或 API 持久化，而不是直接修改数据库。

## 边界

- 不要直接编辑数据库文件、运行时元数据存储或任何数据库内容。
- 不要把 provider 协议、线程规划实现、平台自动化底层代码写进任务契约。
- 不要把整套策略直接塞进一个超大任务，也不要把任务拆到只剩零碎动作。
- 不要发明 `ready`、`running`、`completed`、`failed` 之外的任务状态。
- 不要省略数据协作说明。如果下游任务依赖上游产出，必须同时表达依赖条件和输入需求。
- 不要把任务文档、数据文件或工具路径写到引流工作目录之外。
- 不要忽略当前提示里给出的真实本地路径；路径理解以当前提示为准，而不是靠猜测。
