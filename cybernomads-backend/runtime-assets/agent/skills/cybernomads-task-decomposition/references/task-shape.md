# 任务输出契约

## 最终输出形状

任务拆分的最终结构要能被 Cybernomads 受控任务保存入口接收：

```json
{
  "source": {
    "kind": "agent-decomposition",
    "requestId": "optional-request-id",
    "description": "本次拆分的简短说明"
  },
  "tasks": [
    {
      "taskKey": "search-candidate-videos",
      "name": "搜索候选视频",
      "instruction": "目标、步骤、使用资源、预期产出和完成标准。",
      "documentRef": "task-search-candidate-videos.md",
      "contextRef": "work/<trafficWorkId>/skills/bilibili-web-api",
      "condition": {
        "cron": "0 */6 * * *",
        "relyOnTaskKeys": []
      },
      "inputNeeds": [
        {
          "name": "strategy-context",
          "description": "用于判断视频相关性的策略与产品定位。",
          "source": "traffic-work-context"
        }
      ]
    }
  ]
}
```

## 字段规则

- `taskKey`
  - 必填
  - 使用稳定英文短横线命名
  - 在同一次任务集请求内必须唯一
- `name`
  - 必填
  - 使用中文可读任务名
- `instruction`
  - 必填
  - 必须能指导后续 subagent 独立执行
- `documentRef`
  - 建议填写
  - 必须落在当前引流工作目录内
- `contextRef`
  - 必填
  - 表达后续执行时应优先加载的上下文入口
- `condition.cron`
  - 不需要定时时写 `null`
- `condition.relyOnTaskKeys`
  - 不依赖上游任务时写空数组
- `inputNeeds`
  - 必填数组
  - 每一项都要明确名称、说明和来源

## 元数据质量要求

- 每个任务必须有稳定英文 `taskKey`
- 每个任务必须有任务文档引用或明确的文档计划
- 每个任务必须能看出输入、过程、产出和完成标准
- 每个任务必须能解释为什么它要独立存在

## 依赖映射规则

- `relyOnTaskKeys` 只能引用本次请求内已经声明的任务键。
- 不要引用不存在的任务键。
- 不要只写自然语言“依赖上游任务”，而不写结构化依赖。
