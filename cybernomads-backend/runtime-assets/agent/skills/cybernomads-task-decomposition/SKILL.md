---
name: cybernomads-task-decomposition
description: 指导 Cybernomads Agent 进行任务拆分。适用于 Agent 需要把引流工作快照、产品和策略上下文、对象绑定以及工作上下文资产拆成原子任务集的场景，并要求输出任务说明、cron 或依赖条件、输入需求、上下文引用、产出指导，并通过受控任务集接口持久化。
---

# Cybernomads 任务拆分

## 概览

使用本 Skill 将一个 Cybernomads 引流工作拆分为当前任务集。输出必须聚焦任务领域契约：请求内任务身份、任务名称、任务说明、执行条件、输入需求、上下文引用和预期产出指导。

## 工作流

1. 加载引流工作快照、产品摘要或正文、策略摘要或正文、对象绑定，以及可用的工作上下文资产。
2. 在起草任务集前阅读 [task-shape.md](references/task-shape.md)。
3. 将引流工作拆成可由后续任务执行 Agent 独立执行的原子任务。
4. 如需声明任务协作，同时写入两处：`condition.relyOnTaskKeys` 和下游任务的 `inputNeeds`。
5. 使用上下文引用表达文件、目录、工具说明或任务数据区域。不要把平台脚本或产出数据本体嵌进任务契约。
6. 在持久化任务前阅读 [controlled-tools.md](references/controlled-tools.md)。
7. 只通过 Cybernomads 受控任务集创建或替换 API/工具持久化完整任务集。
8. 需要具体拆分模式时，参考 [examples.md](references/examples.md)。

## 边界

- 不要创建脱离引流工作的任务。
- 不要直接编辑数据库文件或运行时元数据存储。
- 不要定义调度器轮询间隔、重试策略、线程内部实现、provider 协议或平台自动化实现。
- 不要发明任务状态。受控持久化后的新任务初始状态为 `ready`。
- 不要只靠自然语言暗示任务协作。如果任务 B 需要任务 A 的产出，必须同时表达依赖条件和输入需求。
