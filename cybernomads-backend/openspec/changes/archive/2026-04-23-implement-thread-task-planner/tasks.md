## 1. Planner Foundation

- [x] 1.1 新增线程规划器应用服务，支持启动、停止和周期性 tick
- [x] 1.2 将规划器接入应用启动/关闭生命周期，避免 import 即启动
- [x] 1.3 接入引流工作与任务模块查询，扫描 running 引流工作下的 ready 任务

## 2. Condition Evaluation

- [x] 2.1 实现 cron 条件 MVP 判断
- [x] 2.2 实现 rely_on 依赖更新时间 MVP 判断
- [x] 2.3 对未知 condition 形状进行安全跳过或诊断反馈，不盲目提交

## 3. Dispatch Flow

- [x] 3.1 满足条件时将任务标记为 running
- [x] 3.2 通过 Agent 服务统一入口提交任务执行请求，并采用 fire-and-forget 流程
- [x] 3.3 提交请求中明确引用任务执行 Skill 或等价运行时能力
- [x] 3.4 处理提交失败反馈，MVP 不重试但避免任务处于不可观察的中间状态

## 4. Verification

- [x] 4.1 补齐规划器单元测试，覆盖扫描过滤、cron、rely_on、未知条件和重复提交防护
- [x] 4.2 补齐应用启动/关闭相关测试，确认规划器生命周期可控
- [x] 4.3 补齐 Agent 服务提交失败测试，确认 MVP 不重试且状态可观察
