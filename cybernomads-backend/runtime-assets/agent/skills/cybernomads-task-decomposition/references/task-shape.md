# 任务形状

## 输出契约

返回可被 Cybernomads 任务集创建或替换 API 接收的请求体：

```json
{
  "source": {
    "kind": "agent-decomposition",
    "requestId": "optional-request-id",
    "description": "short source summary"
  },
  "tasks": [
    {
      "taskKey": "search-candidate-videos",
      "name": "搜索候选视频",
      "instruction": "目标、步骤、可用上下文、预期数据和完成标准。",
      "documentRef": "optional-task-doc-ref",
      "contextRef": "work/<traffic-work-id>/task/search-candidate-videos",
      "condition": {
        "cron": null,
        "relyOnTaskKeys": []
      },
      "inputNeeds": [
        {
          "name": "strategy-context",
          "description": "用于判断相关性的策略与产品定位。",
          "source": "traffic-work-context"
        }
      ]
    }
  ]
}
```

## 必填字段

- `taskKey`：在本次请求内稳定。使用小写短横线命名，不要依赖展示名称。
- `name`：简短的人类可读任务名称。
- `instruction`：面向 Agent 的执行说明。包含目标、步骤、要加载的工具或资产、预期产出和完成标准。
- `documentRef`：可选的任务说明文档引用。
- `contextRef`：后续执行 Agent 可加载的上下文资产引用。
- `condition.cron`：时间条件；如果不是定时任务则为 `null`。
- `condition.relyOnTaskKeys`：执行前需要考虑的上游任务键。
- `inputNeeds`：执行 Agent 工作前必须加载的数据。每项必须包含 `name`、`description` 和 `source`。

## 协作规则

- 用 `condition.relyOnTaskKeys` 表达执行顺序。
- 用 `inputNeeds` 表达数据依赖语义。
- 如果下游任务消费上游产出，必须同时声明上游依赖和输入需求。
- 将产出指导写在 `instruction` 中；不要定义一个覆盖所有任务的通用产出数据 schema。

## 任务质量

- 优先拆成只有一个清晰结果的原子任务。
- 每个任务都应有可控上下文，便于后续 subagent 执行。
- 避免“运行整个策略”这类过宽任务；应拆成搜索、评估、草拟、发布或请求、观察、跟进等任务。
- 不要写入调度算法、重试策略、provider 协议或平台自动化实现细节。
