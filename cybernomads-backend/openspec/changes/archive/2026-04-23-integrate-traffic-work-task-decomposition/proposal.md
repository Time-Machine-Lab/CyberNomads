## Why

当前引流工作运行时规格只说明“创建或更新引流工作后需要进行上下文准备”，任务领域规格也说明“任务由 Agent 基于引流工作拆分创建”。但两者之间还缺少一个明确的实现提案：引流工作创建/更新时，后端如何把产品、策略、对象绑定和工作上下文交给 Agent 服务进行任务拆分，并如何把拆分结果落入任务模块。

如果没有这个桥接 change，团队并行开发时容易出现三类断点：引流工作只创建了业务对象但没有任务；Agent Skill 能拆任务但没有被创建流程调用；任务模块能保存任务但没有统一的批量创建/替换入口。

## What Changes

- 在引流工作创建成功后触发任务拆分准备流程，构造一次面向 Agent 服务的任务拆分输入快照。
- 在引流工作更新重建时触发任务重新拆分，不创建新的引流工作身份，而是在原工作上下文归属下重建任务集。
- 通过 Agent 服务抽象调用任务拆分能力，不让引流工作模块依赖 OpenClaw 或其他 provider 私有协议。
- 通过任务模块的受控批量接口创建或替换该引流工作下的任务集，不允许 Agent 或 subagent 直接修改数据库。
- 只有当任务拆分、上下文准备和任务落库都完成后，才把引流工作的上下文准备状态标记为 `prepared`；失败时保留主状态 `ready` 并标记准备失败。

## Capabilities

### New Capabilities
- `traffic-work-task-decomposition-integration`: 定义引流工作创建/更新与 Agent 任务拆分、任务模块批量落库之间的桥接流程。

### Modified Capabilities
- `traffic-work-runtime`: 补充创建/更新时的任务拆分编排语义。
- `task-module-runtime`: 依赖其提供按引流工作批量创建/替换任务集的受控能力。
- `agent-service-access-runtime`: 依赖其提供 provider-neutral 的任务拆分请求入口。

## Impact

- `src/modules/traffic-works/`
- `src/modules/tasks/`
- `src/modules/agent-access/`
- `runtime-assets/skills/`
- `cybernomads/work/<work-context>/`
- `tests/unit/traffic-work-task-decomposition*.test.ts`
- `tests/integration/traffic-work-create-update*.test.ts`

