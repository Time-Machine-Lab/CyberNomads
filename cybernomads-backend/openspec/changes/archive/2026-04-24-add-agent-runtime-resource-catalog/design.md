## Context

Cybernomads 现在已经开始把 Agent Skill 和 Knowledge 作为运行时资源统一放到 `runtime-assets/agent/` 下，并在启动时同步到运行时目录。但这些资源目前还缺少一份正式、可被 Agent 和开发者共同理解的总览清单。任务拆分 Skill 已经明确希望通过 `Agent资源清单.md` 来判断有哪些可复用资源，因此这份清单需要从“临时想法”变成正式资产。

## Goals / Non-Goals

**Goals:**

- 在运行时 Agent knowledge 目录下提供正式的资源清单文件。
- 让清单成为 Agent 读取资源时的稳定入口。
- 将新增运行时 Agent 资源时必须同步更新清单的规约写入开发规范。

**Non-Goals:**

- 不在本 change 中实现自动扫描目录并自动生成清单。
- 不在本 change 中为每一类资源建立复杂元数据系统。
- 不在本 change 中记录运行时 `knowledge` 的全部细节分类结构。

## Decisions

### 1. 资源清单作为运行时 knowledge 资产存在

清单文件放在 `runtime-assets/agent/knowledge/Agent资源清单.md`，而不是放在 docs 目录。因为它首先是给运行时 Agent 读的，不只是给团队成员看的设计文档。

### 2. 第一版先只强制记录 Skill 清单

虽然未来 Knowledge 资源也可能越来越多，但用户当前明确要求的是 Skill 清单表格，因此第一版先把 Skill 记录做好。后续如果 Knowledge 资产增长明显，再扩展表格或增加分节。

### 3. 用开发规范承担治理职责，而不是把治理规则塞进 Skill

“新增 runtime-assets/agent 内容时必须同步更新清单”是一条团队协作规约，应该写进开发规范文档，而不是塞进某个 Skill 或运行时 prompt。

## Risks / Trade-offs

- [Risk] 手工维护清单可能产生漏更。  
  → Mitigation: 在开发规范中明确要求，并在后续需要时增加校验脚本。

- [Risk] 第一版只记录 Skill 可能不够覆盖后续 Knowledge 资源。  
  → Mitigation: 先满足当前任务拆分 Skill 的直接需求，后续再扩展清单结构。

## Migration Plan

1. 在 `runtime-assets/agent/knowledge/` 下新增 `Agent资源清单.md`。
2. 按约定填入当前可用 Skill 的表格。
3. 更新开发规范文档，加入资源清单维护规约。

## Open Questions

- 后续是否需要增加一个轻量校验脚本，检查资源清单里的 Skill 与实际目录是否一致？
