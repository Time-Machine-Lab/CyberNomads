# 输出约定

## 默认输出

默认只返回关键字段，结构如下：

```json
{
  "ok": true,
  "command": "video.search",
  "data": {},
  "timestamp": "..."
}
```

## `--raw true`

- 保留接口原始响应
- 适合排障、对账和字段扩展
- 默认关闭

## `--verbose true`

- 保留执行模式和关键中间信息
- 常见内容包括：
  - 搜索命中的是匿名模式还是 Cookie 回退模式
  - 是否发生回退
  - 回退原因

## 关键字段原则

- 搜索和读取接口默认返回规范化字段
- 发送接口默认返回最小成功结果
- 登录成功默认返回：
  - `cookie`
  - `refreshToken`
  - `userInfo`
  - `cookieInfo`
