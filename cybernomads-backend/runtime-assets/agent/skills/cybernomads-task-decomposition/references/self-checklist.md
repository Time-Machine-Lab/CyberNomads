# 自检清单

结束本次任务拆分前，逐条确认以下事项。

## 任务本体

- 每个任务都有稳定英文 `taskKey`
- 每个任务都有中文 `name`
- 每个任务都有清晰 `instruction`
- 每个任务都有 `contextRef`
- 每个任务都声明了 `condition`
- 每个任务都声明了 `inputPrompt`
- 每个任务的 `contextRef` 默认是 `./`，除非有明确理由缩小上下文入口
- 需要上游产出、外部素材或前置数据的任务，`inputPrompt` 已写清楚数据位置、数据结构和消费方式
- 只有确实不需要任何前置输入的任务，`inputPrompt` 才允许为空字符串
- 需要任务文档时，已经为任务准备稳定 `documentRef`
- 任务文档没有把 `condition` 或 `inputPrompt` 作为独立章节填写

## 协作与数据

- 下游任务的依赖关系已经写入 `relyOnTaskKeys`
- 下游任务的数据来源已经写入 `inputPrompt`
- 任务文档的“任务上下文前提”已经列出所需 Skill、Tools、Knowledge、Data 及相对路径
- 任务文档的“任务流程”已经按步骤说明执行路径
- 任务文档的“任务产出与协作”已经说明数据结构、产出方式、保存位置、保存格式和下游消费方式
- 每个任务都能说明产出放到哪里
- 没有把所有任务的数据都塞进一个含义不清的大文件

## 上下文准备

- 已识别需要复制的全局 Skill
- 已识别需要复制的共享 Knowledge
- 已明确是否需要在 `tools/` 下补充专用脚本
- 已明确哪些数据文件应放在 `data/`

## 受控落地

- 已通过 `scripts/copy-runtime-resource.js` 完成必需资源复制
- 已通过 `scripts/batch-save-tasks.js` 尝试保存任务集
- 已通过 `scripts/run-self-check.js` 生成自检报告
- 没有直接编辑数据库或运行时元数据

## 最终判断

只有当任务、资源、数据规划、任务保存结果和自检报告都已明确时，才能把本次任务拆分视为完成。
