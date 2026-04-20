## Why

Cybernomads 后端目前还是空骨架，进程启动后没有任何最小运行环境准备能力，无法稳定保证本地目录结构、SQLite 文件和运行时 SQL 脚本机制已就绪。这使得后续工作区、产品、策略、任务等能力即使开始开发，也会缺少统一且可重复执行的运行时基础。

现在需要先建立一个幂等的启动初始化能力，在不生成默认业务内容的前提下，让系统每次启动都能确认本地运行根目录、基础子目录、SQLite 文件和运行时系统表已处于可用状态。

## What Changes

- 新增后端启动阶段的运行时基础初始化流程，用于在进程启动时准备最小可运行环境。
- 启动时默认在当前目录下检查并创建 `cybernomads/` 本地项目目录；若该根目录已存在，则跳过根目录创建，但继续检查 SQLite 与运行时 SQL 脚本执行。
- 启动时初始化固定子目录结构：`product/`、`strategy/`、`work/`。
- 启动时创建或打开 SQLite 文件，并执行运行时内置 SQL 脚本。
- 新增运行时 SQL 脚本加载与执行机制，SQL 来源为后端发布产物自带的运行时资产，而不是 `docs/sql/` 开发文档目录。
- 本次仅创建系统级初始化表，用于记录运行时脚本执行状态或版本信息，不创建正式业务表。
- 明确初始化失败时的行为：如果 SQLite 文件不可用或运行时 SQL 脚本执行失败，启动流程应返回明确失败结果，而不是静默跳过。
- 明确本次变更不创建任何具体工作目录，不生成默认产品、策略或其他业务内容。

## Capabilities

### New Capabilities
- `runtime-bootstrap`: 定义后端启动时初始化本地运行根目录、SQLite 文件以及运行时 SQL 脚本机制的行为要求。

### Modified Capabilities

None.

## Impact

- Affected code:
  - `src/index.ts`
  - `src/app/`
  - `src/adapters/storage/`
  - `src/shared/`
- Affected runtime assets:
  - New runtime SQL asset directory bundled with backend runtime
- Affected systems:
  - Local filesystem under current working directory
  - SQLite bootstrap database file
- Out of scope:
  - `docs/sql/` 顶层业务 SQL 文档
  - 任何正式业务表、默认业务数据、具体引流工作目录生成
