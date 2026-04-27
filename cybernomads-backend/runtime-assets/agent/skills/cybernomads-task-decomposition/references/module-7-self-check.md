# 模块 7：全流程自检

本模块解决两个问题：

1. 怎么确认前面 6 个模块都落实到了
2. 什么情况下才允许宣布任务拆分完成

## 自检目标

确认本次任务拆分已经形成完整闭环：

- 任务结构合法
- 必需资源已复制
- 任务集已保存
- 保存结果与任务集一致
- 没有跳过关键步骤

## 自检工具

使用：

- `scripts/run-self-check.js`

至少传入：

- `task-set.json`
- `save-result.json`
- 所有资源复制结果文件

自检结果保存为：

- `data/task-decomposition/self-check-report.json`

## 完成标准

只有当自检报告 `ok=true` 时，才允许把本次任务拆分视为完成。

如果自检失败：

- 回到对应模块修正问题
- 不要跳过失败项
- 不要直接输出“完成”

## 深入细节

如需逐条检查清单，读取 [self-checklist.md](self-checklist.md)。

## 最终动作

- 生成并检查自检报告
- 确认 `ok=true`
- 最终仅输出 `task-set.json` 的 JSON 对象本体
