## Context

现有 `bilibili-growth-ops` Skill 里，真正可复用的 B 站接口能力集中在 `scripts/lib/bilibili/`，但它仍然带着几层宿主耦合：

- `auth.js` 会读写 session 文件
- `wbi.js` 会读写 runtime cache 文件
- `client.js` 虽然更接近接口层，但默认嵌在增长运营命令总线里
- 顶层 `ops.js + commands.js` 将接口能力和产品、任务、评论外发节流、去重、OperationRecord 写入等业务逻辑混在一起

目标不是复制一个“裁剪版增长运营系统”，而是建立一个新的、边界清晰的 Skill 资产：

- 面向 B 站 Web 接口调用
- 面向脚本执行
- 面向显式输入和显式输出
- 不面向产品业务编排

## Goals / Non-Goals

**Goals**

- 创建一个新的运行时 Skill：`bilibili-web-api`
- 保留并提纯旧 Skill 中真正属于 B 站 Web 接口适配层的能力
- 让脚本支持完整核心能力：
  - 登录
  - Cookie 刷新
  - 当前账号信息
  - 视频搜索与详情
  - 评论读取、扫描、发送
  - 未读通知、回复通知
  - 私信会话、消息、发送
- 让调用方通过显式参数传入 Cookie、Refresh Token、qrcodeKey 等输入
- 默认输出关键字段，并提供 `raw` / `verbose` 开关
- 明确依赖、运行环境和风险边界

**Non-Goals**

- 不保留增长运营业务语义
- 不保留 SQLite、事实层或运行时目录初始化
- 不保留去重、节流、审核、任务阶段、OperationRecord
- 不为调用方托管多账号状态
- 不要求 Cybernomads 后端在本 change 中自动将该 Skill 注入 Agent 请求
- 不试图覆盖 App 私有接口、创作中心专属接口或直播接口

## Decisions

### 1. Skill 名称定为 `bilibili-web-api`

目录名和 Skill 名称统一使用 `bilibili-web-api`。

理由：

- 明确表达这是 B 站 Web 接口能力，而不是泛平台工具箱
- 和现有可复用实现的真实边界一致
- 上层 Agent 在看到 `$bilibili-web-api` 时能快速理解用途
- 为未来可能出现的 `bilibili-creator-api`、`bilibili-live-api` 预留命名空间

### 2. 形态定为“脚本型 Skill 资产”，而不是“自动装配 Skill”

本 Skill 放入 `runtime-assets/skills/`，供人工或指定 prompt 使用。实现内容以 `SKILL.md + references + scripts + tests + package.json` 为主。

本次不要求后端自动：

- 扫描并注入该 Skill
- 把脚本暴露成受控工具
- 将其加入当前固定的任务 Skill 白名单

这样可以先把底层能力提纯，再由后续集成工作决定接入方式。

### 3. 统一脚本入口，但内部按领域拆模块

统一入口采用：

```bash
node scripts/bili.js <group> <command> [...options]
```

但内部不再保留旧 `commands.js` 的业务命令总线，而是按接口领域拆模块：

- `auth`
- `account`
- `video`
- `comment`
- `notification`
- `dm`
- `shared` 基础设施

这样既保留脚本入口的一致性，也避免业务命令膨胀。

### 4. 登录能力保留，但改为纯返回式结果

登录能力属于核心 API 能力，必须保留。

新 Skill 中：

- `auth qr-start` 返回 `qrcodeKey`、`loginUrl`、可选 `qrAscii`
- `auth qr-poll` 必须显式传 `qrcodeKey`
- 轮询成功后直接返回：
  - `cookie`
  - `refreshToken`
  - `userInfo`
  - 其他关键辅助字段
- 不写本地 session 文件
- 不从上一次执行自动恢复状态

### 5. Cookie 管理由调用方负责

新 Skill 不持久化账号状态。调用方负责：

- 保存和选择多账号 Cookie
- 在后续调用中传入正确的 Cookie
- 持有和更新 Refresh Token

脚本侧只负责：

- 接收 Cookie 输入
- 提取 `bili_jct`
- 在需要时执行刷新流程

### 6. Cookie 输入支持三种方式

为了兼顾安全和易用性，脚本统一支持：

- `--cookie "..."`
- `--cookie-file /path/to/file`
- `--cookie-env ENV_NAME`

其中：

- `--cookie-file` 和 `--cookie-env` 为推荐方式
- `--cookie` 允许使用，但不作为推荐路径

同样规则适用于其他敏感输入，例如 `refreshToken`。

### 7. 搜索采用匿名优先、Cookie 回退的混合策略

`video search` 默认先匿名搜索：

- 先访问首页获取匿名 Cookie
- 再调用搜索接口

当匿名流程出现明确失败时，再回退到显式 Cookie：

- 请求失败
- 风控错误
- 权限错误

“无搜索结果”不视为匿名失败，不触发回退。

### 8. 默认输出最小化，按需打开调试信息

每个命令默认只返回关键字段，不默认夹带完整原始响应。

约定：

- 默认：`data`
- `--raw true`：额外返回原始接口响应
- `--verbose true`：额外返回回退路径、请求模式、关键中间状态等调试信息

这样既利于上层消费，也保留排障通道。

### 9. 写接口不承担业务安全判断

评论发送、回复发送、私信发送等写接口属于纯调用能力。

新 Skill 明确不内置：

- 节流策略
- 去重检查
- 评论文案审核
- 任务状态限制
- 产品业务判断

风险提示可以写在 Skill 文档和命令说明里，但脚本不拦截调用。

### 10. 旧 Skill 中必须剔除的内容要彻底剥离

实现时不得把以下内容复制进新 Skill：

- `runtime/bootstrap`
- `runtime/context`
- `runtime/paths`
- `sqlite`
- `store`
- `workflows`
- `session-store`
- `commands catalog`
- `capabilities/strategies/task templates`
- `records/cooldown/review` 相关语义

可以复用并重构的内容包括：

- `http`
- `cookie`
- `wbi`
- `parsers`
- `auth`
- `client` 中的接口调用逻辑

但要去掉所有宿主状态依赖。

### 11. WBI 和登录辅助状态只允许进程内或显式输入，不落磁盘

新 Skill 中：

- `wbi` key 仅允许进程内缓存，或每次重新获取
- 不再使用 `wbiCachePath`
- 登录轮询不依赖历史 session 文件
- 扫码后的结果必须通过返回值交给调用方

### 12. 依赖必须同时写进代码清单和 Skill 文档

实现时至少要在两处清楚声明依赖：

- `package.json`
- `references/dependencies.md` 与 `SKILL.md`

必须说明：

- 最低 Node 版本
- `qrcode` 的用途
- 哪些命令依赖该包
- 缺失依赖时的降级或报错行为

## Proposed Skill Shape

```text
runtime-assets/skills/
|-- bilibili-web-api/
|   |-- SKILL.md
|   |-- agents/
|   |   |-- openai.yaml
|   |-- references/
|   |   |-- command-map.md
|   |   |-- auth-and-cookie.md
|   |   |-- output-fields.md
|   |   |-- dependencies.md
|   |   |-- failure-and-risk.md
|   |   |-- examples.md
|   |-- scripts/
|   |   |-- bili.js
|   |   |-- lib/
|   |       |-- args.js
|   |       |-- output.js
|   |       |-- errors.js
|   |       |-- http.js
|   |       |-- cookie.js
|   |       |-- wbi.js
|   |       |-- parsers.js
|   |       |-- auth.js
|   |       |-- account.js
|   |       |-- video.js
|   |       |-- comment.js
|   |       |-- notification.js
|   |       |-- dm.js
|   |-- test/
|   |   |-- http.test.js
|   |   |-- auth.test.js
|   |   |-- video-search.test.js
|   |   |-- comment.test.js
|   |   |-- dm.test.js
|   |-- package.json
|   |-- package-lock.json
```

## Command Surface

推荐命令面如下：

- `auth qr-start`
- `auth qr-poll`
- `auth refresh-check`
- `auth refresh-cookie`
- `account self-get`
- `video search`
- `video detail`
- `comment list`
- `comment scan-main`
- `comment send`
- `notification unread`
- `notification reply-list`
- `dm session-list`
- `dm message-list`
- `dm send`

内部辅助函数如 `resolve oid`、`sign wbi` 保持为库能力，不直接暴露为独立 CLI 命令。

## Risks / Trade-offs

- [风险] 旧代码里的宿主依赖可能被不小心带入新 Skill。
  → 通过显式“禁止迁移清单”和定向测试约束，确保无 `sqlite`、`store`、`sessionPath`、`runtimeRoot` 依赖。

- [风险] 默认输出过瘦，排障不方便。
  → 提供 `raw` 和 `verbose` 开关，不让默认输出膨胀。

- [风险] 扫码登录依赖 `qrcode` 包，运行环境可能不一致。
  → 在依赖文档和报错信息中明确说明，并允许退化为仅输出 `loginUrl`。

- [风险] 写接口没有节流和去重，可能被误当成安全执行工具。
  → 在 Skill 文档和风险说明中明确“这是纯接口能力，不是安全编排层”。

- [风险] 当前 Cybernomads 运行时 Skill 装配机制偏向文档型资产。
  → 本次只交付产品资产，不把自动集成当成本 change 的目标。

## Open Questions

- 是否需要在后续 change 中把该 Skill 暴露为 Cybernomads 受控工具或远程执行能力。
- 是否需要在后续 change 中把 `runtime-assets/skills` 的装配模型扩展到脚本型 Skill 资产。
