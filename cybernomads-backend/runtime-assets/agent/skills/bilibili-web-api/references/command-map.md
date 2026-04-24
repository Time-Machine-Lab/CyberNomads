# 命令调用手册

## 入口

统一入口：

```bash
node scripts/bili.js <group> <command> [...options]
```

## 总表

| 命令 | 适用目标 | 最少必填参数 | 结果类型 | 高风险误用 |
|---|---|---|---|---|
| `auth qr-start` | 启动扫码登录 | 无 | 读 | 不需要 Cookie |
| `auth qr-poll` | 轮询扫码登录结果 | `qrcodeKey` | 读 | 不会自动恢复历史 key |
| `auth refresh-check` | 检查 Cookie 是否需要刷新 | `cookie` | 读 | 只是检查，不会刷新 |
| `auth refresh-cookie` | 刷新 Cookie | `cookie`、`refreshToken` | 写 | 两者都必须显式传入 |
| `account self-get` | 读取当前账号信息 | `cookie` | 读 | Cookie 不完整时会失败 |
| `video search` | 搜索视频 | `keyword` | 读 | 默认先匿名，不是默认强制用 Cookie |
| `video detail` | 读取单个视频详情 | `id` | 读 | `id` 可以是 `BV` / `AV` / 视频 URL |
| `comment list` | 读取评论分页 | `id` 或 `oid` | 读 | 已知 `oid` 时不要再重复猜 `id` |
| `comment scan-main` | 读取主评论流、热门、置顶 | `id` 或 `oid` | 读 | 不是传统评论分页接口 |
| `comment send` | 发送评论或回复 | `message`、`id/oid`、`cookie` | 写 | `root/parent` 只在回复时传 |
| `notification unread` | 读取未读摘要 | `cookie` | 读 | 只返回摘要，不返回完整通知内容 |
| `notification reply-list` | 读取回复通知列表 | `cookie` | 读 | 翻页参数是 `id` 和 `reply-time` |
| `dm session-list` | 读取私信会话列表 | `cookie` | 读 | 返回会话摘要，不是消息正文 |
| `dm message-list` | 读取某个会话的消息历史 | `talker-id`、`cookie` | 读 | 这里不是 `receiver-id` |
| `dm send` | 向用户发送私信 | `receiver-id`、`message`、`cookie` | 写 | 这里不是 `talker-id` |

## 全局调用规则

- Cookie 输入优先级：
  1. `--cookie-file`
  2. `--cookie-env`
  3. `--cookie`
- refresh token 输入优先级：
  1. `--refresh-token-file`
  2. `--refresh-token-env`
  3. `--refresh-token`
- 默认输出只保留关键字段。
- 需要原始响应时加 `--raw true`。
- 需要执行模式或回退信息时加 `--verbose true`。
- 读命令不会写本地状态。
- 写命令会直接发请求，不负责节流、去重或业务判断。

## 认证命令

### `auth qr-start`

用途：

- 启动 B 站扫码登录流程。
- 当你还没有 Cookie，需要拿到登录二维码时使用。

最少必填参数：

- 无

常用可选参数：

- `--user-agent`

返回重点：

- `qrcodeKey`
- `loginUrl`
- `qrAscii`
- `qrAsciiAvailable`

Agent 调用建议：

- 调用后优先保存 `qrcodeKey`。
- 后续轮询必须显式使用这个 `qrcodeKey`。
- 不要假设脚本会自动记住这次登录状态。

示例：

```bash
node scripts/bili.js auth qr-start
```

### `auth qr-poll`

用途：

- 轮询扫码登录状态。
- 当用户已经扫码，想拿到最终登录结果时使用。

最少必填参数：

- `--qrcodeKey`

常用可选参数：

- `--raw true`
- `--user-agent`

返回重点：

- `status`
- `message`
- 登录成功时：
  - `cookie`
  - `refreshToken`
  - `userInfo`
  - `cookieInfo`

状态理解：

- `waiting_scan`
- `waiting_confirm`
- `expired`
- `success`

Agent 调用建议：

- `status=success` 时立即保存 `cookie` 和 `refreshToken`。
- 不要在没有 `qrcodeKey` 的情况下调用。
- 不要假设会从本地 session 自动恢复上次 `qrcodeKey`。

示例：

```bash
node scripts/bili.js auth qr-poll --qrcodeKey "<key>"
```

### `auth refresh-check`

用途：

- 检查当前 Cookie 是否需要刷新。
- 当调用方持有长期登录态，想先判断是否该刷新时使用。

最少必填参数：

- `--cookie-*`

常用可选参数：

- `--user-agent`

返回重点：

- `refresh`
- `timestamp`
- `csrf`

Agent 调用建议：

- 这个命令只做检查，不做刷新。
- 如果 `refresh=true`，再决定是否继续调用 `auth refresh-cookie`。

示例：

```bash
node scripts/bili.js auth refresh-check --cookie-file ./cookie.txt
```

### `auth refresh-cookie`

用途：

- 刷新当前 Cookie。
- 当 `auth refresh-check` 表示需要刷新，或者调用方主动决定刷新时使用。

最少必填参数：

- `--cookie-*`
- `--refresh-token-*`

常用可选参数：

- `--raw true`
- `--user-agent`

返回重点：

- `cookie`
- `refreshToken`
- `userInfo`
- `cookieInfo`

Agent 调用建议：

- 刷新成功后，必须用新返回值覆盖旧的 `cookie` 和 `refreshToken`。
- 不要只更新其中一个。

示例：

```bash
node scripts/bili.js auth refresh-cookie \
  --cookie-file ./cookie.txt \
  --refresh-token-file ./refresh-token.txt
```

## 账号命令

### `account self-get`

用途：

- 读取当前 Cookie 对应的账号信息。
- 当你拿到一份 Cookie，想确认它属于谁时使用。

最少必填参数：

- `--cookie-*`

常用可选参数：

- `--raw true`
- `--user-agent`

返回重点：

- `mid`
- `uname`
- `avatar`
- `sign`

Agent 调用建议：

- 在多账号场景中，建议先用这个命令做账号确认，再执行评论或私信写操作。

示例：

```bash
node scripts/bili.js account self-get --cookie-env BILI_COOKIE
```

## 视频命令

### `video search`

用途：

- 按关键词搜索视频。
- 用于视频发现、候选视频筛选、按主题拉取结果。

最少必填参数：

- `--keyword`

常用可选参数：

- `--page`
- `--limit`
- `--cookie-*`
- `--verbose true`
- `--raw true`

返回重点：

- `items`
- `page`
- `limit`
- `verbose.searchMode`（开启 `verbose` 时）

执行规则：

- 默认先匿名搜索。
- 当匿名请求明确失败，且调用方提供了 Cookie 时，才回退到 Cookie 搜索。
- “搜索结果为空”不算匿名失败。

Agent 调用建议：

- 如果只是做普通发现，直接传 `keyword` 即可。
- 如果你怀疑匿名搜索被限制，可以同时带 Cookie，并打开 `--verbose true` 看是否发生回退。

示例：

```bash
node scripts/bili.js video search --keyword "AI 编程" --limit 10 --verbose true
```

### `video detail`

用途：

- 读取单个视频详情。
- 当你已经有视频标识，想补齐标题、作者、统计信息、描述时使用。

最少必填参数：

- `--id`

参数说明：

- `id` 可以是：
  - `BV...`
  - `av123456`
  - 完整视频 URL

返回重点：

- `bvid`
- `aid`
- `cid`
- `title`
- `owner`
- `stat`
- `desc`

Agent 调用建议：

- 如果上游给的是视频 URL，不需要先手动提取 BV，直接传进去即可。

示例：

```bash
node scripts/bili.js video detail --id "https://www.bilibili.com/video/BV1xx411c7mD"
```

## 评论命令

### `comment list`

用途：

- 读取传统评论分页。
- 当你想稳定地看第 N 页评论时使用。

最少必填参数：

- `--id` 或 `--oid`

常用可选参数：

- `--page`
- `--size`
- `--sort`
- `--nohot`

参数选择规则：

- 如果你有 `BV` / `AV` / 视频 URL，传 `--id`
- 如果你已经有评论接口所需对象 ID，直接传 `--oid`

返回重点：

- `oid`
- `page`
- `items`

Agent 调用建议：

- 已知 `oid` 时优先直接传 `oid`，减少一次解析链路。
- 只需要快速扫主流评论时，更适合用 `comment scan-main`。

示例：

```bash
node scripts/bili.js comment list --id "BV1xx411c7mD" --page 1 --size 20
```

### `comment scan-main`

用途：

- 读取主评论流、热门评论和置顶评论。
- 当你想快速扫描评论区主干内容时使用。

最少必填参数：

- `--id` 或 `--oid`

常用可选参数：

- `--mode`
- `--next-offset`
- `--seek-rpid`

返回重点：

- `oid`
- `mode`
- `cursor`
- `topReplies`
- `hots`
- `items`

Agent 调用建议：

- 这是“评论流扫描”命令，不是传统分页命令。
- 想做评论区线索挖掘时，优先用它。
- 想做稳定分页读取时，用 `comment list`。

示例：

```bash
node scripts/bili.js comment scan-main --id "BV1xx411c7mD"
```

### `comment send`

用途：

- 发送主评论，或者对已有评论发送回复。

最少必填参数：

- `--message`
- `--id` 或 `--oid`
- `--cookie-*`

常用可选参数：

- `--root`
- `--parent`
- `--raw true`

参数选择规则：

- 不传 `root` / `parent`：发送主评论
- 传了 `root` 或 `parent`：发送回复

返回重点：

- `success`
- `oid`
- `message`
- `root`
- `parent`

Agent 调用建议：

- 如果你要回复某条评论，再传 `root` / `parent`。
- 如果只是对视频发主评论，不要多传回复链参数。
- 这个命令会直接发请求，不做去重或节流保护。

示例：

```bash
node scripts/bili.js comment send \
  --id "BV1xx411c7mD" \
  --message "谢谢分享，这条内容很有帮助" \
  --cookie-file ./cookie.txt
```

## 通知命令

### `notification unread`

用途：

- 读取未读摘要。
- 当你只想知道回复、@、系统消息等还有多少未读时使用。

最少必填参数：

- `--cookie-*`

返回重点：

- `at`
- `reply`
- `recvLike`
- `recvReply`
- `system`

Agent 调用建议：

- 这是摘要接口，不是详情接口。
- 如果你需要具体回复通知内容，再继续调用 `notification reply-list`。

示例：

```bash
node scripts/bili.js notification unread --cookie-env BILI_COOKIE
```

### `notification reply-list`

用途：

- 读取评论回复通知列表。
- 用于承接评论互动、查看最近回复动态。

最少必填参数：

- `--cookie-*`

常用可选参数：

- `--id`
- `--reply-time`

返回重点：

- `cursor`
- `lastViewAt`
- `items`

Agent 调用建议：

- 做翻页时，使用返回里的游标继续请求。
- 这里的翻页参数是 `id` 和 `reply-time`，不是视频 ID。

示例：

```bash
node scripts/bili.js notification reply-list --cookie-file ./cookie.txt
```

## 私信命令

### `dm session-list`

用途：

- 读取私信会话摘要。
- 用于查看当前有哪些私信会话、未读数和最后一条消息概览。

最少必填参数：

- `--cookie-*`

常用可选参数：

- `--session-type`
- `--group-fold`
- `--unfollow-fold`
- `--sort-rule`

返回重点：

- `hasMore`
- `items`
- 每个会话里的 `talkerId`、`unreadCount`、`lastMsg`

Agent 调用建议：

- 如果你接下来想读某个具体会话的历史消息，先从这里拿到 `talkerId`。

示例：

```bash
node scripts/bili.js dm session-list --cookie-file ./cookie.txt
```

### `dm message-list`

用途：

- 读取某个私信会话里的消息历史。

最少必填参数：

- `--talker-id`
- `--cookie-*`

常用可选参数：

- `--begin-seqno`
- `--size`
- `--session-type`

返回重点：

- `hasMore`
- `minSeqno`
- `maxSeqno`
- `items`

Agent 调用建议：

- 这里必须传 `talker-id`。
- 不要把 `receiver-id` 用在这个命令上。
- 如果上一步来自 `dm session-list`，优先直接复用那里的 `talkerId`。

示例：

```bash
node scripts/bili.js dm message-list --talker-id "44556677" --cookie-env BILI_COOKIE
```

### `dm send`

用途：

- 向指定用户发送一条私信。

最少必填参数：

- `--receiver-id`
- `--message`
- `--cookie-*`

常用可选参数：

- `--dev-id`
- `--timestamp`
- `--msg-type`

返回重点：

- `success`
- `receiverId`
- `message`

Agent 调用建议：

- 这里必须传 `receiver-id`。
- 不要把 `talker-id` 误传到这个命令。
- 这个命令会直接发送私信，不做审核、去重或节流。

示例：

```bash
node scripts/bili.js dm send \
  --receiver-id "44556677" \
  --message "你好，想继续交流一下你刚才提到的问题" \
  --cookie-file ./cookie.txt
```
