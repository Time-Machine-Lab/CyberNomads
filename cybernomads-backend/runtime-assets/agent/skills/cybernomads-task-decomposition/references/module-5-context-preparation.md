# 模块 5：上下文与数据准备

本模块解决三个问题：

1. 引流工作目录是什么结构
2. 每个目录分别是干嘛的
3. 任务拆分时应该如何准备数据和上下文

## 工作目录结构

当前引流工作目录的稳定骨架：

```text
<trafficWorkId>/
├── skills/
├── tools/
├── knowledge/
└── data/
```

## 目录职责

- `skills/`
  - 放后续 subagent 直接使用的 Skill
- `tools/`
  - 放当前引流工作专用的 JS 工具脚本
- `knowledge/`
  - 放多个任务共享的知识、规则、经验、产品补充说明
- `data/`
  - 放任务执行过程中的产出数据和中间数据

## 准备原则

- 工作目录内要预留 `data/task-decomposition/` 保存拆分阶段产物
- `task-set.json`、复制结果、保存结果、自检报告都放在这里
- 任务文档必须留在当前工作目录内部
- 所有路径都要兼容 macOS、Windows、Linux

## 你需要准备的内容

- 必需 Skill 的复制目标
- 必需 Knowledge 的复制目标
- 各任务将来会读写的数据文件位置
- 是否需要在 `tools/` 下生成专用脚本

## 深入细节

如需查看目录职责和路径原则，读取 [work-context-layout.md](work-context-layout.md)。

## 你现在应该做什么

- 明确工作目录内各类文件的落点
- 然后继续读取 [模块 6：任务归档至系统](module-6-persist-task-set.md)
