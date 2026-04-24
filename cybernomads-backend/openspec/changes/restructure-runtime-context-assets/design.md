## Context

当前后端启动只会创建 `cybernomads/product`、`cybernomads/strategy`、`cybernomads/work` 三类目录；引流工作上下文也只会在创建或更新时生成 `work/<trafficWorkId>/scripts` 并写入一个统一的 `task.md`。这套结构与当前产品设计已经不再一致，因为新的 Agent 运行方式要求同时具备：

- 一个全局运行时层，向外部 Agent 暴露稳定的 `agent/skills` 与 `agent/knowledge`
- 一个工作级上下文层，为每个引流工作预留 `skills`、`tools`、`knowledge`、`data` 等运行空间
- 一个职责分离边界，明确“后端铺设上下文骨架”和“Agent 产出任务文档/补充资产”分别由谁负责

另外，现有 Skill 资源仍直接驻留在 `runtime-assets/skills` 下，Agent 适配层拿到的也是后端工程内部路径。这不利于后续把 Skill 和 Knowledge 作为产品运行时资产稳定暴露给外部 Agent。

## Goals / Non-Goals

**Goals:**

- 在不改变单机本地运行模式的前提下，统一 Cybernomads 的全局运行时目录结构。
- 建立“打包资源源目录”和“运行时暴露目录”的双层语义：`runtime-assets` 负责随代码交付，`cybernomads/agent` 负责随产品运行。
- 让引流工作在创建或更新时先拿到标准化上下文骨架，再由 Agent 在该目录内生成任务文件与补充资产。
- 为后续新增 Skill、Knowledge 内容预留稳定目录，不要求到时再重构启动流程。
- 同步文档边界：架构文档负责具体目录树说明，引流工作领域文档只补充和领域语义直接相关的“工作上下文骨架 + 任务文件职责分离”。

**Non-Goals:**

- 不在本次 change 中设计或实现具体 Skill 内容、Knowledge 内容。
- 不引入新的 API 或 SQL 契约。
- 不在本次 change 中重做任务领域、调度器逻辑或 Agent provider 协议。
- 不在本次 change 中设计文件同步版本管理、回滚机制或复杂差异合并。

## Decisions

### 1. 将 `runtime-assets/agent` 作为内置资源源目录，将 `cybernomads/agent` 作为运行时暴露目录

后端工程内部保留内置资源源目录，用于随代码提交和发布；运行时根目录下保留 Agent 可直接消费的暴露目录，用于被 Agent 提示词、路径引用和后续运行时排查稳定访问。

推荐结构：

```text
runtime-assets/
└── agent/
    ├── skills/
    └── knowledge/

cybernomads/
├── agent/
│   ├── skills/
│   └── knowledge/
├── product/
├── strategy/
└── work/
```

之所以不继续直接让适配器使用后端工程内路径，是因为运行时目录才是产品真实交付物的一部分。这样后续无论是本地 Agent 还是远端 Agent，只要需要引用 Skill/Knowledge，都可以围绕 `cybernomads/agent` 这个稳定根目录来组织提示词和上下文。

备选方案是继续把 `runtime-assets/skills` 当作唯一目录并直接暴露给 Agent，但这会把“打包源目录”和“运行时工作目录”混在一起，不利于产品运行时心智模型，因此不采用。

### 2. 启动阶段对 Agent 运行时资源采用“非破坏性同步”而非“首次创建后永不处理”

启动时除了创建固定目录，还需要把 `runtime-assets/agent/skills` 与 `runtime-assets/agent/knowledge` 同步到 `cybernomads/agent/` 下。同步语义采用：

- 缺失目录自动创建
- 缺失文件自动复制
- 同名内置资源允许被刷新
- 不主动删除运行时目录下额外存在的文件

这样做的原因是：运行时目录应始终拿到最新的内置资源，但又不能在每次启动时做破坏性清理，避免误删用户为排查或实验临时放入的文件。

备选方案是完全镜像并删除额外文件，但这会提高启动风险；另一种备选是只在首次启动复制一次，但后续更新 Skill/Knowledge 时又无法自动生效，因此都不采用。

### 3. 引流工作目录改为“固定骨架 + Agent 产物”模型

每个引流工作目录在创建或更新准备阶段先由后端建立固定骨架：

```text
work/<trafficWorkId>/
├── skills/
├── tools/
├── knowledge/
└── data/
```

其中：

- `skills/` 用于该工作级可附带或特化的 Skill 资产
- `tools/` 用于该工作级可调用的脚本或辅助工具
- `knowledge/` 用于该工作级上下文知识
- `data/` 用于任务产出数据

后端不再预写统一的 `task.md`。任务文档（例如 `task1.md`）以及补充工具文件由 Agent 在任务拆分阶段生成。这样可以让任务文档真正成为 Agent 规划结果的一部分，而不是后端预置的占位文件。

### 4. 引流工作更新沿用原工作目录所有权，只刷新骨架并在原位重建任务上下文

当引流工作处于允许更新的状态时，更新流程不创建新的工作目录，而是继续使用原 `trafficWorkId` 对应目录。运行时只需确保骨架目录仍完整存在，再把更新后的产品、策略、对象信息连同该工作目录路径一起发给 Agent，由 Agent 在原目录内重建任务文件与补充资产。

这样既符合现有领域语义中的“更新不更换工作身份”，也避免后续任务、日志、产出记录因为工作目录迁移而丢失可追踪性。

### 5. 文档同步采用“架构写结构，领域写语义”的最小改动原则

用户明确要求同步 [Cybernomads架构设计文档.md](D:/Code/Project/Github/CyberNomads/docs/design/Cybernomads架构设计文档.md) 与 [Cybernomads引流工作领域设计文档.md](D:/Code/Project/Github/CyberNomads/docs/design/domain/Cybernomads引流工作领域设计文档.md)。本次设计建议：

- 架构文档负责给出完整的全局目录树与工作目录树
- 引流工作领域文档只补充“工作上下文骨架由系统预创建、任务文件由 Agent 生成、更新沿用原工作目录”这类直接影响领域语义的内容

这样既响应当前需求，也尽量避免把过多基础设施细节重新灌进领域模型。

## Risks / Trade-offs

- [Risk] 现有运行时代码可能仍直接读取后端工程内的 `runtime-assets/skills` 路径。  
  → Mitigation: 在实现中统一收口到运行时路径解析器，优先暴露 `cybernomads/agent/skills`，必要时保留短期兼容读取。

- [Risk] 非破坏性同步不会自动清理运行时中的陈旧文件。  
  → Mitigation: MVP 先接受“只增量刷新、不自动删除”的保守策略；后续若需要严格镜像，再引入 manifest 或版本校验。

- [Risk] 任务文件完全由 Agent 生成后，文件命名与组织可能出现不一致。  
  → Mitigation: 在后续任务拆分 Skill 与任务拆分实现中补充命名规则，例如 `task-<taskKey>.md` 的稳定约定。

- [Risk] 领域文档若写入过多目录细节，可能再次侵入基础设施边界。  
  → Mitigation: 文档同步时只写“工作上下文骨架”和“任务文档职责归属”，具体物理路径细节仍留在架构文档。

## Migration Plan

1. 在 `runtime-assets/` 下引入或整理 `agent/skills` 与 `agent/knowledge` 目录。
2. 更新运行时启动逻辑，使其创建新的固定目录树，并在启动时同步 Agent 资源到 `cybernomads/agent/`。
3. 更新引流工作上下文存储与准备逻辑，改为创建标准工作骨架目录，停止预写统一 `task.md`。
4. 更新任务拆分集成逻辑，使 Agent 获得预创建的工作目录，并在该目录内产出任务文件和补充资产。
5. 同步更新架构文档与引流工作领域文档，确保文档与实现方向一致。

## Open Questions

- 是否需要在本次实现中就把任务文件命名规则固定为 `task-<taskKey>.md`，还是先允许 Agent 自主命名，后续再收口？
