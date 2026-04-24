---
name: bilibili-web-api
description: 通过可执行脚本调用 B 站 Web 接口。适用于需要执行扫码登录、Cookie 刷新、当前账号信息读取、视频搜索与详情、评论读取与发送、通知读取、私信读取与发送的场景。调用方显式传入 Cookie 或接收登录结果，不做本地账号持久化、任务编排、节流、去重或业务入库。
---

# B 站 Web 接口调用

## 概览

使用本 Skill 调用 B 站 Web 接口脚本资产。这个 Skill 直接提供登录、刷新 Cookie、读取账号信息、视频搜索与详情、评论读取与发送、通知读取和私信操作。

统一入口：

```bash
node scripts/bili.js <group> <command> [...options]
```

## 快速选择

先按目标选择命令组：

- 需要登录或刷新 Cookie：`auth`
- 想确认当前 Cookie 对应哪个账号：`account`
- 想搜视频或看视频详情：`video`
- 想看评论或发评论：`comment`
- 想看未读或回复通知：`notification`
- 想看私信会话、私信历史或发私信：`dm`

如果只是想快速命中正确命令，优先看下面的“命令速查”和“参数辨析”。

## 命令速查

| 目标 | 命令 | 最少必填参数 | 结果类型 | 关键提醒 |
|---|---|---|---|---|
| 启动扫码登录 | `auth qr-start` | 无 | 读 | 返回 `qrcodeKey`、`loginUrl`，依赖可用时附带 `qrAscii` |
| 轮询扫码结果 | `auth qr-poll` | `--qrcodeKey` | 读 | 成功后返回 `cookie`、`refreshToken`、`userInfo` |
| 检查 Cookie 是否需要刷新 | `auth refresh-check` | `--cookie-*` | 读 | 用于判断是否进入刷新流程 |
| 刷新 Cookie | `auth refresh-cookie` | `--cookie-*`、`--refresh-token-*` | 写 | 返回新的 `cookie` 与新的 `refreshToken` |
| 读取当前账号信息 | `account self-get` | `--cookie-*` | 读 | 用于确认 Cookie 对应账号 |
| 搜索视频 | `video search` | `--keyword` | 读 | 默认先匿名搜索，失败后才回退到 Cookie |
| 读取视频详情 | `video detail` | `--id` | 读 | `id` 可传 `BV`、`AV` 或视频 URL |
| 读取评论分页 | `comment list` | `--id` 或 `--oid` | 读 | 已知 `oid` 时优先直接传 |
| 扫描主评论流 | `comment scan-main` | `--id` 或 `--oid` | 读 | 返回主评论、热门评论、置顶评论 |
| 发送评论或回复 | `comment send` | `--message`、`--id/oid`、`--cookie-*` | 写 | 不传 `root/parent` 是主评论，传了才是回复 |
| 读取未读摘要 | `notification unread` | `--cookie-*` | 读 | 返回回复、@、系统消息等未读数 |
| 读取回复通知列表 | `notification reply-list` | `--cookie-*` | 读 | 可带 `--id`、`--reply-time` 做翻页 |
| 读取私信会话列表 | `dm session-list` | `--cookie-*` | 读 | 返回会话摘要 |
| 读取私信历史 | `dm message-list` | `--talker-id`、`--cookie-*` | 读 | 这里用的是 `talker-id` |
| 发送私信 | `dm send` | `--receiver-id`、`--message`、`--cookie-*` | 写 | 这里用的是 `receiver-id` |

## 参数辨析

下面这些参数最容易传错，优先按这里理解：

- `id`
  含义：视频标识，可传 `BV`、`AV`、视频 URL。
  常用命令：`video detail`、`comment list`、`comment scan-main`、`comment send`。

- `oid`
  含义：评论接口使用的目标对象 ID，通常对应视频 `aid`。
  常用命令：`comment list`、`comment scan-main`、`comment send`。
  规则：如果你已经明确拿到了 `oid`，优先直接传；不要重复猜。

- `qrcodeKey`
  含义：扫码登录轮询 key。
  常用命令：`auth qr-poll`。
  规则：必须显式传入。

- `talker-id`
  含义：要读取消息历史的会话对端用户 ID。
  常用命令：`dm message-list`。
  规则：只用于“读取私信历史”。

- `receiver-id`
  含义：要发送私信的目标用户 ID。
  常用命令：`dm send`。
  规则：只用于“发送私信”。

- `root` / `parent`
  含义：评论回复链路参数。
  常用命令：`comment send`。
  规则：不传则发主评论；传了才是回复。

## Cookie 与 refresh token 输入

推荐顺序：

1. `--cookie-file /path/to/cookie.txt`
2. `--cookie-env BILI_COOKIE_ENV_NAME`
3. `--cookie "SESSDATA=...; bili_jct=..."`

refresh token 同理：

- `--refresh-token-file`
- `--refresh-token-env`
- `--refresh-token`

登录成功后，优先保存这些字段：

- `cookie`
- `refreshToken`
- `userInfo`
- `cookieInfo`

## 登录与刷新最短路径

登录：

1. `auth qr-start`
2. 用户扫码
3. `auth qr-poll --qrcodeKey <key>`
4. 保存返回的 `cookie` 和 `refreshToken`

刷新：

1. `auth refresh-check --cookie-*`
2. 如果需要刷新，再执行 `auth refresh-cookie --cookie-* --refresh-token-*`
3. 用新返回值覆盖旧值

## 搜索与输出约定

- `video search` 默认先匿名搜索。
- 只有匿名请求失败且你提供了 Cookie 时，才会回退到 Cookie 搜索。
- “没有搜索结果”不等于匿名失败。

- 默认只返回关键字段。
- `--raw true`：附加原始接口响应。
- `--verbose true`：附加执行模式、中间状态和回退信息。

## 依赖

- Node：`>=22.13`
- npm 依赖：`qrcode`
- `qrcode` 用于 `auth qr-start` 的终端二维码输出；缺失时仍会返回 `qrcodeKey` 和 `loginUrl`

## 什么时候再读 references

大多数场景先看这个文件就够了。只有这些情况再去读 references：

- 想复制现成命令示例：看 [examples.md](references/examples.md)
- 想看更短的命令清单：看 [command-map.md](references/command-map.md)
- 想看更完整的 Cookie 与登录说明：看 [auth-and-cookie.md](references/auth-and-cookie.md)
- 想查输出模式：看 [output-fields.md](references/output-fields.md)
- 想看依赖与错误说明：看 [dependencies.md](references/dependencies.md) 和 [failure-and-risk.md](references/failure-and-risk.md)
