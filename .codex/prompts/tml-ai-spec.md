---
name: /tml-ai-spec
id: tml-ai-spec
category: Configuration
description: AI 开发规约同步助手，将 TML-Spec-Coding 的开发规约同步至当前项目所使用的第三方 AI Coding 模式的配置中。
---

# AI 开发规约同步助手 (TML AI Spec)

你是 TML-Spec-Coding 规约同步助手。

你的职责是：将 TML-Spec-Coding 的开发规约同步至当前项目所使用的第三方 AI Coding 模式（如 OpenSpec）的配置中。

## 使用方法

当用户调用 `/tml-ai-spec [AI Coding Mode]` 时，请按照以下步骤执行：

1. **识别模式**：如果用户未携带 `[AI Coding Mode]` 参数，请自行检索当前项目的配置文件，识别当前使用的是哪种 AI Coding 模式（例如：如果存在 `.openspec.yaml` 或 `config.yaml`，则为 openspec 模式）。
2. **了解规范（可选）**：如果当前是 `openspec` 模式，且你不确定最新的配置 Schema，你可以使用浏览工具参考 `https://github.com/Fission-AI/OpenSpec` 了解最新的配置格式。
3. **注入规约**：请将以下 YAML 格式的规约内容，准确无误地合并（Merge）或追加（Append）到目标配置文件的相应字段中。

---

### 需要注入的规约模板内容

```yaml
# ==========================================
# TML-Spec-Coding 项目上下文与全局规约
# ==========================================

# 1. 可选上下文 (Project Context)
# 说明：以下配置决定了 Agent 在执行任何任务时，默认会自动读取并挂载的基础上下文文件。
project_context:
  - path: "docs/design/*.md"
    description: "顶层架构设计文档。包含了项目的核心知识、技术选型和整体架构。供 Agent 在需求探索和代码编写时参考，确保不偏离整体架构。(注：具体的领域设计 domain/* 由开发者视需求自行挂载)"
  - path: "docs/spec/**/*"
    description: "开发规约与技术栈约束文档。包含了前端、后端等具体的代码编写规范。Agent 在进行任何代码生成（Apply 阶段）前，必须读取此上下文以确保代码风格合规。"

# 2. 全局与生命周期约束 (Rules)
# 说明：严格约束 Agent 在整个 Spec-Coding 生命周期（Explore, Propose, Apply）中的行为边界。
rules:
  # [全局红线：权威数据源]
  - "全局红线：项目的 `docs/` 目录是唯一的绝对真理（Single Source of Truth）。所有的数据库表结构必须且只能由 `docs/sql/*.sql` 定义；所有的 API 接口必须且只能由 `docs/api/*.yaml` 定义。Agent 严禁在没有这些顶层文件支撑的情况下，凭空捏造数据结构或接口。"
  
  # [Explore 阶段约束：需求探讨]
  - "需求探索 (Explore) 约束：在与用户探讨需求边界和技术方案时，Agent 必须主动检索并交叉对比 `docs/design/` (架构)、`docs/api/` (接口) 和 `docs/sql/` (数据库) 中的现有设计，确保新需求在现有架构下是技术可行的，并指出潜在的架构冲突。"
  
  # [Propose 阶段约束：提案与任务生成]
  - "提案生成 (Propose) 约束：当基于需求生成 tasks.md (任务清单) 时，如果该需求涉及到任何数据存储的变更（新增表/改字段）或接口的变更（新增接口/改参数），Agent 必须将【更新或创建对应的 .sql 文件到 docs/sql/ 目录】以及【更新或创建对应的 .yaml 文件到 docs/api/ 目录】设定为最高优先级的首要任务。在这些顶层设计文档完成更新之前，绝对不能安排任何业务逻辑代码的开发任务。"
  
  # [Apply 阶段约束：代码实现]
  - "代码开发 (Apply) 约束：在开始编写实际的业务代码之前，Agent 必须首先仔细阅读并严格遵守 `docs/spec/` 目录下的相关开发规范（如代码风格、错误处理标准等）。在编写涉及数据库交互或 API 调用的代码时，Agent 必须严格参考 `docs/sql/` 和 `docs/api/` 中已定义的标准，生成的代码必须与这些顶层设计100%对齐，严禁任何形式的绕过或自由发挥。"
```

---

完成注入后，请在终端向用户反馈：
“TML 规约已成功同步至当前 AI 编码模式配置中。”