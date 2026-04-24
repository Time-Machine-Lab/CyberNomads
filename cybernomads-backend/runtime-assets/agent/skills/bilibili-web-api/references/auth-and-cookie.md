# 认证与 Cookie

## Cookie 输入方式

推荐顺序：

1. `--cookie-file /path/to/cookie.txt`
2. `--cookie-env BILI_COOKIE_ENV_NAME`
3. `--cookie "SESSDATA=...; bili_jct=..."`

同样规则适用于 refresh token：

- `--refresh-token-file`
- `--refresh-token-env`
- `--refresh-token`

## 登录流程

1. 运行 `auth qr-start`
2. 使用返回的 `loginUrl` 或 `qrAscii` 完成扫码
3. 运行 `auth qr-poll --qrcodeKey <key>`
4. 成功后保存返回的：
   - `cookie`
   - `refreshToken`
   - `userInfo`
   - `cookieInfo`

## 刷新流程

1. 用 `auth refresh-check` 判断是否需要刷新
2. 如果需要刷新，运行 `auth refresh-cookie`
3. 用返回的新 `cookie` 和新 `refreshToken` 覆盖调用方持有的旧值

## 多账号原则

- 账号状态由调用方负责保存和选择
- 本 Skill 不写 session 文件
- 本 Skill 不管理账号池
- 本 Skill 不从历史执行结果自动恢复 `qrcodeKey`、Cookie 或 refresh token
