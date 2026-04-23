## 1. Skill Creator Workflow

- [ ] 1.1 阅读并遵循 `skill-creator` 指南，确认 Skill 命名、目录结构、frontmatter 和校验规则
- [ ] 1.2 明确产品内 Skill 默认输出位置为 `runtime-assets/skills/`，不默认写入个人 `$CODEX_HOME/skills`
- [ ] 1.3 初始化 `cybernomads-task-decomposition` Skill 标准目录
- [ ] 1.4 初始化 `cybernomads-task-execution` Skill 标准目录

## 2. Task Decomposition Skill

- [ ] 2.1 编写 `cybernomads-task-decomposition/SKILL.md`，包含任务拆分触发描述、核心步骤和禁止事项
- [ ] 2.2 新增 `references/task-shape.md`，说明任务名称、任务说明、condition、input_need、上下文引用和产出指导
- [ ] 2.3 新增 `references/controlled-tools.md`，说明批量创建/替换任务集只能通过受控工具/API 完成
- [ ] 2.4 新增 `references/examples.md`，覆盖搜索视频、寻找潜客并评论、私信跟进的拆分示例

## 3. Task Execution Skill

- [ ] 3.1 编写 `cybernomads-task-execution/SKILL.md`，包含加载任务上下文、执行任务、产出数据、回写状态的核心步骤
- [ ] 3.2 新增 `references/execution-flow.md`，说明单任务执行流程和不重新规划整个引流工作的边界
- [ ] 3.3 新增 `references/failure-rules.md`，说明任务失败由 Agent 判断并回写 `failed` 的规则
- [ ] 3.4 新增 `references/controlled-tools.md`，说明状态更新和产出记录创建的受控工具/API

## 4. Runtime Asset Integration

- [ ] 4.1 在 Skill 资产加载适配层中暴露这两个 Skill 的可发现位置
- [ ] 4.2 在 Agent 能力准备或任务拆分请求中明确引用任务拆分 Skill
- [ ] 4.3 在线程规划器提交任务执行请求时明确引用任务执行 Skill

## 5. Verification

- [ ] 5.1 为两个 Skill 运行 `quick_validate.py` 或等价校验
- [ ] 5.2 补充资产打包/加载测试，确认运行时能读取两个 Skill
- [ ] 5.3 补充静态检查或快照测试，确认 Skill 不包含直接写 SQLite、OpenClaw 私有协议或平台脚本实现细节
- [ ] 5.4 使用一个典型引流工作样例前向验证拆分 Skill 输出任务集结构可被任务模块接受

