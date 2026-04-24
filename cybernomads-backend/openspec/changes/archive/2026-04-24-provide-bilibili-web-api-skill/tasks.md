## 1. Change Scaffold

- [x] 1.1 创建 `runtime-assets/skills/bilibili-web-api/` 标准目录
- [x] 1.2 编写 `SKILL.md`，明确触发语义、核心工作流、边界与依赖入口
- [x] 1.3 编写 `agents/openai.yaml`，提供清晰的显示名、简述和默认 prompt

## 2. Extract Pure Web API Core

- [x] 2.1 从旧 `bilibili-growth-ops` 中提取并重构 `http`、`cookie`、`wbi`、`parsers`、`auth`、`client` 相关能力
- [x] 2.2 删除所有对 runtime 路径、SQLite、事实层、任务系统、会话文件和操作记录的依赖
- [x] 2.3 将 B 站接口调用按领域拆成 `auth`、`account`、`video`、`comment`、`notification`、`dm` 模块
- [x] 2.4 保留登录与 Cookie 刷新能力，但改为显式输入/返回，不落本地状态
- [x] 2.5 将 WBI key 缓存改为进程内缓存或即时获取，不再写磁盘

## 3. Build Script Interface

- [x] 3.1 提供统一脚本入口 `node scripts/bili.js <group> <command> [...options]`
- [x] 3.2 支持敏感输入的三种方式：直接参数、环境变量名、文件路径
- [x] 3.3 为搜索命令实现匿名优先、显式 Cookie 回退的混合模式
- [x] 3.4 为所有命令统一输出结构：默认关键字段，按需打开 `raw` 与 `verbose`
- [x] 3.5 为写接口保留纯发送行为，不添加去重、节流、审核或任务约束

## 4. Write Skill References

- [x] 4.1 新增 `references/command-map.md`，说明所有命令、参数和用途
- [x] 4.2 新增 `references/auth-and-cookie.md`，说明登录流、Cookie 输入方式、刷新流程和安全建议
- [x] 4.3 新增 `references/output-fields.md`，定义默认关键字段、`raw` 和 `verbose` 约定
- [x] 4.4 新增 `references/dependencies.md`，说明 Node 版本、npm 依赖和缺失依赖行为
- [x] 4.5 新增 `references/failure-and-risk.md`，说明常见错误、风控信号和纯接口边界
- [x] 4.6 新增 `references/examples.md`，覆盖登录、搜索、评论读取、评论发送、私信发送等示例

## 5. Verification

- [x] 5.1 新增最小测试，覆盖 `http`、登录辅助流程、匿名搜索模式、写接口请求构造和输出协议
- [x] 5.2 验证新 Skill 不再引用 `sqlite`、`store`、`runtime/bootstrap`、`session-store`、`records` 等旧业务模块
- [x] 5.3 验证 `package.json` 与 Skill 文档中的依赖说明一致
- [x] 5.4 运行 Skill 校验或等价检查，确认目录结构、frontmatter 和文档入口合法
