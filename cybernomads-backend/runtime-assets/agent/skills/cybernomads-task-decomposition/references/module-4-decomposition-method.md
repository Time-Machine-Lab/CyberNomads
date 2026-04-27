# 模块 4：任务拆分方法论

本模块解决四个问题：

1. 应该如何拆任务
2. 拆任务的底层原理是什么
3. 基于底层原理，任务该拆到什么粒度
4. 一个合格任务样例应该长什么样

## 任务运行的底层原理

当前 Cybernomads 的任务运行不是“整份策略一次执行到底”，而是：

- 引流工作长期驻留
- 任务按 `cron` 和 `relyOnTaskKeys` 被反复扫描
- 满足条件的任务再交给后续 subagent 执行

因此任务拆分必须服务这个运行原理：

- 任务要可重复判断是否执行
- 任务要能独立读写自己的输入输出
- 任务之间的协作必须通过结构化依赖和数据位置完成

## 拆分方法

推荐顺序：

1. 从策略中找出必须完成的阶段
2. 从每个阶段中提取可独立执行的原子任务
3. 为每个任务定义输入、依赖、产出、执行频率
4. 再决定该任务需要哪些 Skill、Knowledge、工具和数据文件

## 粒度判断

一个任务通常应该同时满足：

- 只有一个清晰目标
- 能明确说明输入来源
- 能明确说明主要产出
- 不需要无限扩张上下文才能执行

避免：

- 一个任务承接整份策略
- 一个任务同时覆盖多个平台或多条执行链
- 一个任务既搜集、又筛选、又发布、又跟进

## 合格任务样例

典型样例：

- `search-candidate-videos`
  - 周期性搜索候选视频
  - 产出 `data/search-candidate-videos.json`
- `comment-on-prospects`
  - 依赖候选视频任务
  - 使用候选视频数据筛选潜客并评论
- `private-message-follow-up`
  - 依赖前序互动结果
  - 周期性检查私信并跟进

## 深入细节

- 方法论细节：读取 [decomposition-method.md](decomposition-method.md)
- 协作与产出：读取 [output-and-collaboration.md](output-and-collaboration.md)
- 真实示例：读取 [examples.md](examples.md)

## 你现在应该做什么

- 基于方法论生成 `task-set.json`
- 然后继续读取 [模块 5：上下文与数据准备](module-5-context-preparation.md)
