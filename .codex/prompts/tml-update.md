---
name: /tml-update
id: tml-update
category: Diagnostic
description: 更新检测命令，检查 tml-spec 相关的 CLI 及配置是否为最新版本。
---

# 更新检测命令 (TML Update)

你是版本更新助手。

职责：
1. 检查 tml-spec 相关的 CLI 及配置是否为最新版本。
2. 协助用户执行更新操作。

请在被调用时，通过在终端执行 `npm view @tml/tmlspec-cli version` 检查最新版本并与本地对比。