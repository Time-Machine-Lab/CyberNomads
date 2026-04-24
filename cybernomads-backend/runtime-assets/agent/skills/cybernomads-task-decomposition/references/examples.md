# 真实样例

## 样例：AI 产品广撒网宣传工作（B 站首期）

这是一个真实风格的前向检查样例，用来校准任务拆分是否足够落地。

### 输入背景

- 引流工作名称：`AI产品广撒网宣传工作`
- 产品方向：一个面向普通创作者的 AI 效率产品
- 策略方向：先通过 B 站搜索相关热门内容广撒网曝光，再对潜在互动用户进行评论和私信跟进
- 目标平台：B 站
- 可用对象：评论账号、私信账号、产品介绍素材

### 资源识别结果

应该复制的全局 Skill：

- `cybernomads-task-execution`
- `bilibili-web-api`

应该准备的共享知识：

- 产品卖点摘要
- 评论语气约束
- 私信跟进边界说明

### 任务拆分示例

#### 任务 1：搜索候选视频

- `taskKey`: `search-candidate-videos`
- `name`: `搜索候选视频`
- `cron`: `0 */6 * * *`
- `relyOnTaskKeys`: `[]`
- 主要产出：`data/search-candidate-videos.json`

#### 任务 2：筛选潜客并评论

- `taskKey`: `comment-on-prospects`
- `name`: `筛选潜客并评论`
- `cron`: `null`
- `relyOnTaskKeys`: `["search-candidate-videos"]`
- 输入来源：候选视频列表、评论语气规则、产品摘要
- 主要产出：`data/comment-on-prospects.json`

#### 任务 3：私信跟进

- `taskKey`: `private-message-follow-up`
- `name`: `私信跟进`
- `cron`: `0 */1 * * *`
- `relyOnTaskKeys`: `["comment-on-prospects"]`
- 输入来源：评论互动结果、可联系对象、私信边界规则
- 主要产出：`data/private-message-follow-up.json`

### 收口检查

- 每个任务都能独立交给一个 subagent
- 上游依赖和下游输入都已声明
- 资源复制目标明确
- 数据文件位置明确
- 本样例应通过受控批量保存入口，首次创建使用 `mode = "create"`
