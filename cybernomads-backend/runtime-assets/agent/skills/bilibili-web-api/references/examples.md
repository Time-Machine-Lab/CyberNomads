# 示例

## 启动扫码登录

```bash
node scripts/bili.js auth qr-start
```

## 轮询扫码结果

```bash
node scripts/bili.js auth qr-poll --qrcodeKey "<key>"
```

## 用 Cookie 检查刷新状态

```bash
node scripts/bili.js auth refresh-check --cookie-file ./cookie.txt
```

## 搜索视频

```bash
node scripts/bili.js video search --keyword "AI 编程"
```

## 显式提供 Cookie 搜索

```bash
node scripts/bili.js video search --keyword "AI 编程" --cookie-env BILI_COOKIE
```

## 读取评论主流

```bash
node scripts/bili.js comment scan-main --id "BV1xx411c7mD"
```

## 发送评论

```bash
node scripts/bili.js comment send \
  --id "BV1xx411c7mD" \
  --message "这条内容挺有启发，谢谢分享" \
  --cookie-file ./cookie.txt
```

## 发送私信

```bash
node scripts/bili.js dm send \
  --receiver-id "44556677" \
  --message "你好，想继续聊聊你刚才提到的问题" \
  --cookie-env BILI_COOKIE
```
