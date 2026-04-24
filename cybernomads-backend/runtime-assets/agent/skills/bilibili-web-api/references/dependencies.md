# 运行依赖

## Node

- 最低版本：`>=22.13`
- 依赖 Node 内置的：
  - `fetch`
  - `crypto`
  - `zlib`
  - `node:test`

## npm 依赖

- `qrcode`
  - 用途：为 `auth qr-start` 生成终端二维码文本
  - 如果缺失：
    - 命令仍会返回 `qrcodeKey` 和 `loginUrl`
    - `qrAscii` 为空
    - `qrAsciiAvailable` 为 `false`

## 不应出现的旧依赖

这个 Skill 不应依赖：

- `node:sqlite`
- runtime bootstrap
- session-store
- 旧增长运营 Skill 的事实层或任务层模块
