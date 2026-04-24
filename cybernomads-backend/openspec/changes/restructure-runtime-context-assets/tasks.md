## 1. Runtime Asset Layout

- [ ] 1.1 整理 `runtime-assets` 目录结构，补齐 `agent/skills` 与 `agent/knowledge` 的内置资源源目录
- [ ] 1.2 调整运行时路径模型，支持 `cybernomads/agent/skills`、`cybernomads/agent/knowledge` 等新的固定目录解析
- [ ] 1.3 在启动流程中实现 Agent 运行时资源同步，将内置资源复制到运行时根目录且保持非破坏性同步语义

## 2. Traffic Work Context Skeleton

- [ ] 2.1 重构引流工作上下文存储逻辑，创建 `skills/`、`tools/`、`knowledge/`、`data/` 标准骨架目录
- [ ] 2.2 移除后端预写统一 `task.md` 的逻辑，保留工作目录所有权与上下文引用语义
- [ ] 2.3 确保引流工作更新时沿用原工作目录，并在原目录中刷新骨架而不是新建第二份上下文

## 3. Agent Decomposition Integration

- [ ] 3.1 调整任务拆分输入构造逻辑，向 Agent 传递新的工作上下文目录引用
- [ ] 3.2 更新相关 Skill 资产解析或引用路径，使运行时优先围绕 `cybernomads/agent/skills` 暴露给 Agent 使用
- [ ] 3.3 补充创建与更新流程测试，验证“先铺骨架、后由 Agent 产出任务文件”的完整行为

## 4. Documentation And Verification

- [ ] 4.1 同步更新 `docs/design/Cybernomads架构设计文档.md` 中的全局运行时目录树与引流工作目录树
- [ ] 4.2 同步更新 `docs/design/domain/Cybernomads引流工作领域设计文档.md` 中与工作上下文骨架、任务文件职责归属相关的描述
- [ ] 4.3 运行 OpenSpec 校验，确认 proposal、design、specs、tasks 全部可用于后续实现
