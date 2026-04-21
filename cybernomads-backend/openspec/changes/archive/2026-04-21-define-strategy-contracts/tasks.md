## 1. 顶层契约文档

- [x] 1.1 创建 `docs/sql/strategies.sql`，定义策略模块的最小结构化存储边界，并与策略领域设计保持一致
- [x] 1.2 创建 `docs/api/strategies.yaml`，定义策略模块的创建、更新、列表和详情接口契约
- [x] 1.3 在 API 契约中明确策略详情返回完整 Markdown 正文、标签与占位符派生信息，并排除独立的快照插入接口

## 2. 契约一致性校验

- [x] 2.1 校验 `docs/sql/strategies.sql` 与 `openspec/specs/strategy-contracts/spec.md` 的 requirement 是否逐项对齐
- [x] 2.2 校验 `docs/api/strategies.yaml` 与 `docs/design/domain/Cybernomads策略领域设计文档.md` 的术语、字段命名和语义边界是否一致
- [x] 2.3 确认策略契约未引入删除、状态机、版本链、对象绑定路由和运行时调度等超出 MVP 的语义

## 3. 交付准备

- [x] 3.1 运行 `openspec status --change define-strategy-contracts`，确认 proposal、design、specs、tasks 全部处于完成状态
- [x] 3.2 为后续 `implement-strategy-module` 变更整理可复用的契约结论，包括最小元数据集合、`content_ref` 语义和占位符规范
