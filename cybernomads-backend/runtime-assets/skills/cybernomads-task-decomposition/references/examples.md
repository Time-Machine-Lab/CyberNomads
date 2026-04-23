# 示例

## 示例 1：搜索候选视频

任务：

- `taskKey`: `search-candidate-videos`
- `name`: `搜索候选视频`
- `condition`: `{ "cron": "0 */6 * * *", "relyOnTaskKeys": [] }`
- `inputNeeds`: 产品定位、目标受众、策略关键词
- `instruction`: 搜索与产品和策略匹配的近期候选视频，将候选元数据保存到任务数据区域，并为下游任务提供产出说明。

预期产出指导：

- 候选视频列表产物。
- 产出记录描述：`候选视频列表`。
- 数据位置：任务数据区域路径或产物引用。

## 示例 2：寻找潜客并评论

任务：

- `taskKey`: `comment-on-prospects`
- `name`: `寻找潜客并评论`
- `condition`: `{ "cron": null, "relyOnTaskKeys": ["search-candidate-videos"] }`
- `inputNeeds`: 来自 `search-candidate-videos` 的候选视频列表、品牌语气、评论约束
- `instruction`: 加载候选视频，选择相关潜客，撰写上下文化评论，只执行允许的评论动作，保存评论结果，并记录产出数据。

重要协作：

- 依赖条件指向 `search-candidate-videos`。
- 输入需求说明候选数据来自上游产出记录或任务数据区域。

## 示例 3：私信跟进

任务：

- `taskKey`: `private-message-follow-up`
- `name`: `私信跟进`
- `condition`: `{ "cron": "0 10 * * *", "relyOnTaskKeys": ["comment-on-prospects"] }`
- `inputNeeds`: 评论后互动或合格的潜客、私信模板指导、产品行动号召
- `instruction`: 加载合格潜客，撰写简短跟进私信，只通过允许的工具发送，保存跟进结果，并创建产出记录。

边界：

- 任务可以引用平台能力工具，但不要定义工具实现。
- 任务不拥有统一的私信数据 schema。
