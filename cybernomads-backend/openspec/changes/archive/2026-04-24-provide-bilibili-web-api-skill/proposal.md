## Why

当前仓库里的 B 站接口能力主要沉淀在 `TML-Skills/skills/bilibili-growth-ops` 中，但这套实现把接口调用、增长运营业务、SQLite 事实层、运行时目录、会话持久化、节流、去重、任务阶段和操作记录写入紧紧绑在了一起。它适合“B 站增长运营系统”，却不适合被 Cybernomads 作为一个干净、可复用、可执行脚本型 Skill 资产复用。

现在需要把这部分能力提纯成一个新的产品内 Skill：它专门提供 B 站 Web 接口调用能力，包含登录、Cookie 刷新、视频、评论、通知、私信等核心能力，但不负责任何运营业务判断，也不承担账号持久化、多账号调度、任务编排或风控策略。这样后续同事可以在上层系统里按需接入，而底层脚本保持原子、清晰、可复用。

## What Changes

- 新增一个产品运行时脚本型 Skill：`bilibili-web-api`，默认放在 `runtime-assets/skills/` 下。
- 将旧 `bilibili-growth-ops` 中真正属于 B 站 Web 接口适配层的能力抽离出来，重组为纯接口脚本，不再依赖 runtime/db/store/task/records/session 文件。
- 为新 Skill 提供统一脚本入口、领域化子模块、依赖说明、命令说明、输出约定、风险边界和使用示例。
- 明确该 Skill 包含登录能力：
  - 扫码登录
  - 登录结果轮询
  - Cookie 刷新检查
  - Cookie 刷新
- 明确该 Skill 默认由调用方显式传入 Cookie 或接收登录结果，不做本地账号持久化或 session 文件写入。
- 明确搜索类能力采用“先匿名，匿名失败再回退到显式 Cookie”的混合模式。
- 明确默认输出只返回关键字段，`raw` 和 `verbose` 信息通过显式开关打开。
- 明确该 Skill 只是产品资产，供人工或指定 prompt 使用；本次不要求 Cybernomads 后端自动注入或自动装配到 Agent 接入链路。

## Capabilities

### New Capabilities
- `bilibili-web-api-skill`: 提供一个纯净的、可执行脚本型的 B 站 Web API Skill 资产，覆盖认证、视频、评论、通知和私信接口调用能力，并定义输入、输出、依赖和系统边界。

### Modified Capabilities
- None.

## Impact

- `runtime-assets/skills/bilibili-web-api/`
- `runtime-assets/skills/bilibili-web-api/SKILL.md`
- `runtime-assets/skills/bilibili-web-api/agents/openai.yaml`
- `runtime-assets/skills/bilibili-web-api/references/`
- `runtime-assets/skills/bilibili-web-api/scripts/`
- `runtime-assets/skills/bilibili-web-api/test/`
- `runtime-assets/skills/bilibili-web-api/package.json`
- Skill 运行时资产的打包、校验和文档说明流程
