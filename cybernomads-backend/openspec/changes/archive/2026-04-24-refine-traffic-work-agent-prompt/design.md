## Context

当前引流工作创建/更新流程会先准备工作目录骨架，再通过 `traffic-work-context-preparation-adapter` 调用 Agent 服务进行任务拆分。现有实现已经把产品正文、策略正文、对象绑定和工作目录发送给 Agent，但仍有三个问题：

- 业务信息与执行规则混在同一段 prompt 中，可读性弱，难以稳定约束 Agent 的理解顺序
- 只通过 `$cybernomads-task-decomposition` 这样的 Skill 名称提示 Agent，没有把具体 `SKILL.md` 文件路径显式传出
- 缺少对“任务拆分 Skill 文件路径是否存在”“工作目录是否可用”的前置验证，导致链路出错时排查成本高

用户已经明确希望最终提示词只做上下文组织，不重复 Skill 内部的任务拆分规则。同时，新的路径策略是：只单独传一个 Cybernomads 目录绝对路径，其他路径一律改为相对路径，再由 Agent 先基于根目录解析路径、读取 Skill、然后开始任务拆分。

## Goals / Non-Goals

**Goals:**

- 为任务拆分请求建立稳定、可读、可验证的消息结构。
- 在发送给 Agent 的消息中显式提供 Cybernomads 目录绝对路径，以及相对化的引流工作目录和任务拆分 `SKILL.md` 路径。
- 保持数据库仍可继续保存相对引用，不把“绝对路径传给 Agent”扩散成存储层变更。
- 为这条提示词构建链路补充自动化测试，证明关键上下文字段都被加载和传递。

**Non-Goals:**

- 不修改任务拆分 Skill 本身的拆分细节规则。
- 不修改任务表、产品表或任何 SQL 契约。
- 不在本次 change 中重做 OpenClaw provider 协议或引入远程文件访问接口。
- 不调整任务拆分后的 TaskSetWriteInput 结构。

## Decisions

### 1. 采用业务分段 prompt，而不是继续堆叠实现导向句子

任务拆分请求会改成用户已确认的分段结构：

- 引流工作信息
- 产品信息
- 策略信息
- 任务拆分 Skill 信息
- 规则

这样做的原因是当前业务上下文已经稳定，Agent 更需要先知道“每一段是什么、有什么作用”，而不是继续在请求正文里混合实现级细节。任务拆分规则本身仍放在 Skill 中定义，避免双重来源。

### 2. 显式传递绝对引流工作目录与绝对 `SKILL.md` 路径

任务拆分请求会传递：

- `Cybernomads目录绝对路径: <absolute path>`
- `引流工作目录: <relative path>`
- `任务拆分Skill位置: <relative path to SKILL.md>`

这是本次设计最关键的决定。对于本地 OpenClaw，仍然能通过绝对根目录定位真实文件；对于未来远程 Agent，也可以继续复用同一消息结构，只需要把“根目录解析”和“相对路径访问”替换成远程文件代理即可。这样比直接把每一个路径都绝对化更稳，也更利于存储与运行时解耦。

### 3. 将运行时路径解析与请求构建解耦

适配器不应在字符串拼接过程中临时猜测 Skill 路径。实现时应单独解析：

- 当前 Cybernomads 目录绝对路径
- 当前引流工作目录相对路径
- 当前任务拆分 Skill 的运行时 `SKILL.md` 相对路径

只有在这两个路径都成功拿到后，才开始构造请求。这样后续测试可以直接断言解析结果，也避免 prompt 构造和文件定位逻辑缠在一起。

### 4. 在发起 Agent 请求前做显式前置校验

如果引流工作目录快照缺失，或任务拆分 Skill 文件路径无法解析，应直接在 CyberNomads 侧失败，而不是让 Agent 收到一条半残缺消息再报错。这样更符合“确保给出的提示词能把所需数据都加载到”的目标。

### 5. 测试重点放在“请求内容正确性”而不是“Agent 输出质量”

本次 change 的核心不是优化 Agent 智能，而是保证我们发出去的数据完整、结构稳定。因此测试应优先覆盖：

- prompt 是否包含引流工作 ID、产品 ID、策略 ID
- 是否包含产品 markdown 和策略 markdown
- 是否包含 Cybernomads 目录绝对路径
- 是否包含相对化的引流工作目录
- 是否包含相对化的任务拆分 `SKILL.md` 路径
- 是否仍把任务拆分细节留给 Skill，而非写进业务 prompt

## Risks / Trade-offs

- [Risk] 相对路径若没有统一基准目录，Agent 仍可能解析错误。  
  → Mitigation: 明确规定所有相对路径都基于 `Cybernomads目录绝对路径` 解析，并在 prompt 规则中写死这一点。

- [Risk] 业务 prompt 变简后，若 Skill 内容不足，Agent 可能表现变弱。  
  → Mitigation: 明确把任务拆分细节唯一收口到 Skill，并用测试锁定业务 prompt 只承载上下文职责。

- [Risk] 运行时 Skill 路径解析若仍依赖旧目录结构，可能与后续 runtime-assets 重构发生冲突。  
  → Mitigation: 实现时统一通过运行时 Skill 解析器获取 `SKILL.md` 路径，而不是在适配器中硬编码。

## Migration Plan

1. 新增或整理任务拆分请求的 prompt 构建逻辑。
2. 接入任务拆分 Skill 文件绝对路径解析。
3. 在任务拆分请求前增加目录与 Skill 路径校验。
4. 更新测试，覆盖请求构造和失败场景。

## Open Questions

- 当前任务拆分请求是否还需要继续保留 `contextMarkdown` 作为 session 级 system context，还是只保留新的结构化 prompt 即可。
