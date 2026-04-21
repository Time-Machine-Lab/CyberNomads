# Cybernomads 策略领域设计文档

## 1. 顶层共识与统一语言 (Ubiquitous Language)

### 1.1 模块职责边界 (Bounded Context)

- **包含**：定义策略这一稳定业务对象，并承载可供 AI 消费的完整 Markdown 策略正文。
- **包含**：管理策略的最小业务属性，例如策略标识、策略名称、策略摘要、策略标签和正文引用关系。
- **包含**：支持在策略编辑过程中将已有策略正文以“整篇快照插入”的方式组合进当前策略，但不形成策略之间的活引用关系。
- **包含**：识别策略正文中的参数占位符与导入块标记，并向上层提供稳定的策略模板输入。
- **包含**：向引流工作域、任务规划服务或后续填写流程提供完整策略正文、参数声明清单和原始 Markdown 模板。
- **不包含**：账号、素材、产品等真实对象的绑定路由与解析，不负责把占位符映射到具体资源实例。
- **不包含**：任务如何拆分、引流工作如何创建、运行时如何调度、执行日志如何回写。
- **不包含**：前端拖拽交互、编辑器高亮渲染、光标行为或页面布局等界面实现细节。
- **不包含**：策略实验、A/B 对照、版本链、草稿/发布状态机、策略运行效果统计等超出 MVP 的复杂能力。
- **不包含**：数据库表结构、文件路径拼接、SQLite 与文件系统适配细节等基础设施设计。

在 Cybernomads 的当前阶段，策略域不是一个复杂的流程编排器，也不是一个策略关系图数据库。它更像一个稳定的“策略提示词资产中心”，负责回答三个核心问题：当前有哪些可被选择的策略资产、某条策略的完整 Markdown 正文是什么、这份正文中声明了哪些可供后续填写的参数占位符。

### 1.2 核心业务词汇表 (Glossary)

- **策略 (Strategy)**：系统中的一个独立业务对象，本质上是一份可被 AI 消费的 Markdown 策略文档。
- **策略标识 (Strategy Identifier)**：系统内部用于唯一识别某条策略的稳定标识。
- **策略名称 (Strategy Name)**：用于列表展示、人工识别和选择策略的可读名称，不承担唯一性约束。
- **策略摘要 (Strategy Summary)**：用于列表展示和快速选择的最小摘要信息，不等同于完整正文。
- **策略标签 (Strategy Tags)**：用于分类、筛选和快速识别的标签集合，不承担组合语义。
- **策略正文 (Strategy Markdown Content)**：策略的完整 Markdown 原文，是 AI 理解策略意图的核心输入。
- **策略正文引用 (Strategy Content Reference)**：策略对象与其 Markdown 正文之间的稳定关联关系。
- **整篇快照插入 (Snapshot Insertion)**：在编辑某条策略时，把另一条策略的完整正文拷贝进当前正文的行为。插入后两者完全解耦，不形成活引用。
- **导入块标记 (Imported Snapshot Marker)**：嵌入在 Markdown 正文中的特殊注释标记，用于标识“这一整块内容最初来自哪条策略”，例如 `<!-- cn-strategy-import:start source-id="..." -->` 与对应结束标记。
- **来源策略 (Source Strategy)**：被作为整篇快照插入来源的原始策略对象，仅承担编辑辅助语义，不承担运行时依赖语义。
- **参数占位符 (Parameter Placeholder Token)**：在策略正文中声明后续需要填写的位置标记，当前建议采用 `{{string:title="默认标题"}}`、`{{string:cta_text=""}}` 或 `{{int:max_retry=3}}` 语法。
- **参数类型 (Parameter Type)**：占位符左侧的类型标识，当前固定为 `string` 或 `int`。
- **参数键 (Parameter Key)**：占位符中的稳定字段名，用于表达“这一处需要填写什么”，例如 `title`、`cta_text`、`max_retry`。
- **参数默认值 (Parameter Default Value)**：占位符中声明的默认值，当前为必填字段；`string` 允许空字符串，`int` 只允许整数。
- **策略模板输入 (Strategy Template Input)**：策略域对外提供的完整 Markdown 模板，由上层自行决定是否进行参数收集与最终填充。
- **占位符清单 (Placeholder Set)**：从策略正文中解析出的参数占位符声明集合，供上层填写流程使用。

## 2. 领域模型与聚合关系 (Domain Models & Aggregates)

```mermaid
classDiagram
    class Strategy {
        <<Aggregate Root>>
        StrategyId
        StrategyName
        StrategySummary
        StrategyTags
        StrategyContentRef
    }

    class StrategyContentReference {
        <<Value Object>>
        ContentRef
    }

    class StrategyTagSet {
        <<Value Object>>
        Tags
    }

    class StrategyMarkdown {
        <<Value Object>>
        MarkdownContent
    }

    class ImportedSnapshotMarkerSet {
        <<Value Object>>
        SourceStrategyIds
    }

    class PlaceholderTokenSet {
        <<Value Object>>
        ParameterPlaceholders
    }

    Strategy --> StrategyContentReference : owns
    Strategy --> StrategyTagSet : owns
    Strategy --> StrategyMarkdown : provides through reference
    Strategy --> ImportedSnapshotMarkerSet : derives from markdown
    Strategy --> PlaceholderTokenSet : derives from markdown
```

策略域当前建议保持单聚合根设计：

- `Strategy` 是策略域的聚合根，负责表达“一个可被识别、可被维护、可被 AI 消费的 Markdown 策略资产”。
- `StrategyContentReference` 是值对象，用于表达策略与其完整正文内容之间的稳定关联。
- `StrategyTagSet` 是值对象，用于表达标签集合这一可整体替换的分类语义。
- `StrategyMarkdown` 是值对象，承载完整 Markdown 正文，是策略语义的核心载体。
- `ImportedSnapshotMarkerSet` 是从正文中派生出的值对象，用于表达当前正文里哪些内容块最初来源于其他策略，但这些来源信息只服务编辑识别，不形成跨策略依赖。
- `PlaceholderTokenSet` 是从正文中派生出的值对象，用于表达当前策略声明了哪些待填写参数。

在领域语义上，`Strategy` 的核心职责不是维护复杂引用图，而是保证“一条策略始终对应一份完整、独立、可解析的 Markdown 正文”，并且能够从这份正文中稳定提取编辑辅助标记与参数声明。

## 3. 核心业务约束 (Invariants & Business Rules)

- **独立资产约束**：每条策略在领域语义上都是一个独立对象，不因被其他策略整篇插入而形成从属关系或活引用关系。
- **单正文约束**：在当前 MVP 设计下，一条策略只关联一份有效 Markdown 正文，不引入多正文并存或正文版本链。
- **快照插入约束**：将已有策略插入当前策略时，语义上是正文内容拷贝，而不是建立跨策略引用；来源策略后续修改不会自动影响已插入内容。
- **来源标记保留约束**：快照插入后形成的导入块标记可以保留在正文中，用于后续编辑识别；即使插入块被人工改写，其来源标记仍可继续存在。
- **来源标记非运行依赖约束**：导入块标记只承担编辑辅助语义，不得被解释为运行时引用、同步依赖或编译前置条件。
- **整篇插入约束**：当前阶段只支持“整篇策略插入”，不支持按段落、按章节或按局部片段建立组合关系。
- **模板透传约束**：策略域对外提供的是完整 Markdown 模板与参数声明，不负责运行时填值或最终字符串编译。
- **占位符语法约束**：参数占位符必须使用稳定、可解析的统一语法 `{{type:key=defaultValue}}`；当前只支持 `{{string:key="..."}}` 与 `{{int:key=123}}` 两种形式。
- **默认值必填约束**：每个参数占位符都必须声明默认值；其中 `string` 可为空字符串，`int` 必须是整数。
- **键一致性约束**：同一条策略中允许同一个 `key` 在正文里出现多次，但其 `type` 与 `defaultValue` 必须完全一致。
- **绑定解耦约束**：策略域只负责识别和暴露参数声明，不负责将参数绑定到具体账号、素材或产品实例。
- **列表摘要约束**：策略列表视图只返回摘要信息，不要求为每一条策略返回完整 Markdown 正文；摘要可以独立维护，也可以在缺省时由正文派生。
- **名称非唯一约束**：策略名称只承担可读展示语义，不承担唯一性约束；系统唯一识别依赖稳定策略标识。
- **最小化约束**：当前阶段不引入草稿、发布、归档、实验、评分、成功率、难度等级或运行统计等非核心业务语义。
- **可读性约束**：一条可被使用的策略必须至少具备有效策略名称和可读取的完整正文。
- **上下文完整性约束**：当上层请求策略详情或完整策略输入时，策略域提供的应是完整正文或去辅助标记后的完整策略模板，而不是仅返回名称、标签或片段摘要。

## 4. 核心用例与行为流转 (Core Behaviors)

### 4.1 用户故事 (User Stories)

- **用户故事 1**：作为用户，我希望创建一条策略并编写完整 Markdown 正文，以便系统能够保存一份可供 AI 理解和后续执行消费的策略资产。
  - **验收标准 (AC)**：创建成功后，系统中存在一个由稳定策略标识识别的策略对象，且该策略能够返回完整 Markdown 正文。

- **用户故事 2**：作为用户，我希望在策略列表中看到各条策略的名称、摘要和标签等最小信息，以便我快速识别并选择合适的策略。
  - **验收标准 (AC)**：策略列表返回结果不依赖完整正文，也足以支撑选择与管理场景。

- **用户故事 3**：作为用户，我希望在编辑某条策略时，把已有策略整篇插入到当前正文中，以便我快速复用已有提示词内容，而不需要手工重复编写。
  - **验收标准 (AC)**：插入完成后，当前策略正文中包含来源策略的完整内容与可识别的导入块标记；后续来源策略修改不会自动影响当前策略。

- **用户故事 4**：作为用户，我希望在策略正文中声明参数占位符，以便后续流程能够根据统一契约收集字段值并填充到模板中。
  - **验收标准 (AC)**：系统能够稳定识别 `{{string:title="默认标题"}}`、`{{string:cta_text=""}}` 或 `{{int:max_retry=3}}` 形式的占位符，并在查询时提供占位符清单。

- **用户故事 5**：作为上层引流工作或任务规划使用方，我希望获取一份完整策略模板和参数声明清单，以便后续流程基于统一契约继续执行填写和消费。
  - **验收标准 (AC)**：当系统请求策略详情时，返回内容保留完整正文语义和占位符声明；运行时是否填值由上层自行决定。

- **用户故事 6**：作为用户，我希望更新已有策略的名称、摘要、标签或正文内容，以便策略资产能够随着我的增长方法迭代而保持最新。
  - **验收标准 (AC)**：更新成功后，系统对外暴露的策略元数据、正文内容和占位符解析结果均为最新状态。

### 4.2 核心领域事件/命令 (Commands & Events)

- **命令 (Command)**：`CreateStrategyCommand`（创建策略）
- **命令 (Command)**：`UpdateStrategyCommand`（更新策略）
- **命令 (Command)**：`ListStrategySummaryCommand`（获取策略摘要列表）
- **命令 (Command)**：`GetStrategyDetailCommand`（获取策略详情）
- **命令 (Command)**：`InsertStrategySnapshotCommand`（整篇插入来源策略快照）
- **命令 (Command)**：`ExtractStrategyPlaceholdersCommand`（提取策略占位符清单）
- **事件 (Event)**：`StrategyCreatedEvent`（策略已创建）
- **事件 (Event)**：`StrategyUpdatedEvent`（策略已更新）
- **事件 (Event)**：`StrategySnapshotInsertedEvent`（策略快照已插入）
- **事件 (Event)**：`StrategyPlaceholdersExtractedEvent`（策略占位符清单已提取）

### 4.3 核心业务流图 (Behavior Flow)

```mermaid
sequenceDiagram
    actor User as 用户
    participant Editor as 策略编辑器
    participant StrategyDomain as 策略域
    participant WorkOrPlanner as 引流工作域/任务规划服务

    User->>Editor: 编辑当前策略
    User->>Editor: 从左侧选择一条已有策略并执行整篇插入
    Editor->>StrategyDomain: 请求来源策略完整正文
    StrategyDomain-->>Editor: 返回来源策略 Markdown 正文
    Editor->>Editor: 在正文中写入导入块标记 + 插入正文内容

    User->>Editor: 保存策略名称、摘要、标签和正文
    Editor->>StrategyDomain: 创建/更新策略
    StrategyDomain->>StrategyDomain: 解析导入块标记与参数占位符
    StrategyDomain-->>Editor: 返回策略详情与最新解析结果

    WorkOrPlanner->>StrategyDomain: 请求策略模板详情
    StrategyDomain->>StrategyDomain: 读取完整 Markdown 正文并提取占位符清单
    StrategyDomain-->>WorkOrPlanner: 返回原始策略模板 + PlaceholderSet
```

这条核心行为流表达的是策略域当前最重要的稳定闭环：

- 用户可以把其他策略整篇插入当前策略，但插入的本质是内容快照，而不是跨策略依赖。
- 编辑器中的导入块标记会随着正文一起保存，从而支持后续继续识别来源区块。
- 当上层消费策略时，策略域负责输出原始 Markdown 模板与参数声明清单，后续是否填值、如何填值由其它模块自行决定。

在这个闭环中，策略域只负责“定义、维护、识别和提供策略提示词资产”，不负责“这些对象最终绑定到谁”、"任务如何被拆出来"或“AI 在运行时如何执行这些策略”。
