-- 引流工作模块首版 SQL 契约
-- 目标：定义 MVP 阶段引流工作模块的最小结构化存储边界。
-- 范围：
--   1. 引流工作以稳定主键 `traffic_work_id` 作为唯一标识，`display_name` 只承担可读展示语义。
--   2. 引流工作只保存产品引用 `product_id`、策略引用 `strategy_id` 与聚合对象绑定 `object_bindings_json`，
--      不复制产品或策略全文。
--   3. 生命周期状态 `lifecycle_status` 与上下文准备状态 `context_preparation_status` 分离建模。
--   4. 当前阶段不把任务拆分、调度条件、执行日志、平台脚本细节或运行统计混入本表。
--   5. 当前阶段对“删除”只定义业务语义，不约束底层是否执行物理删除。

CREATE TABLE traffic_works (
    traffic_work_id TEXT PRIMARY KEY,
    display_name TEXT NOT NULL,
    product_id TEXT NOT NULL,
    strategy_id TEXT NOT NULL,
    object_bindings_json TEXT NOT NULL DEFAULT '[]',
    lifecycle_status TEXT NOT NULL
        CHECK (lifecycle_status IN (
            'ready',
            'running',
            'ended',
            'archived',
            'deleted'
        )),
    lifecycle_status_reason TEXT,
    context_preparation_status TEXT NOT NULL
        CHECK (context_preparation_status IN (
            'pending',
            'prepared',
            'failed'
        )),
    context_preparation_status_reason TEXT,
    context_prepared_at TEXT,
    last_started_at TEXT,
    ended_at TEXT,
    archived_at TEXT,
    deleted_at TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    CHECK (
        (lifecycle_status = 'ended' AND ended_at IS NOT NULL)
        OR (lifecycle_status IN ('ready', 'running', 'archived', 'deleted'))
    ),
    CHECK (
        (lifecycle_status = 'archived' AND archived_at IS NOT NULL)
        OR (lifecycle_status IN ('ready', 'running', 'ended', 'deleted'))
    ),
    CHECK (
        (lifecycle_status = 'deleted' AND deleted_at IS NOT NULL)
        OR (lifecycle_status IN ('ready', 'running', 'ended', 'archived') AND deleted_at IS NULL)
    ),
    CHECK (
        (context_preparation_status = 'prepared' AND context_prepared_at IS NOT NULL)
        OR (context_preparation_status IN ('pending', 'failed'))
    )
);

CREATE INDEX idx_traffic_works_updated_at
    ON traffic_works(updated_at DESC);

CREATE INDEX idx_traffic_works_product_id
    ON traffic_works(product_id);

CREATE INDEX idx_traffic_works_strategy_id
    ON traffic_works(strategy_id);

CREATE INDEX idx_traffic_works_management_state
    ON traffic_works(
        lifecycle_status,
        context_preparation_status
    );

-- 领域语义映射
-- TrafficWork -> `traffic_works` 表中的单行记录，表达一个稳定的引流工作对象。
-- Traffic Work Identifier -> `traffic_work_id`
-- Traffic Work Display Name -> `display_name`
-- Product Reference -> `product_id`
-- Strategy Reference -> `strategy_id`
-- Object Binding Set -> `object_bindings_json`
-- Lifecycle Status -> `lifecycle_status` + `lifecycle_status_reason`
-- Context Preparation Status -> `context_preparation_status` + `context_preparation_status_reason`
-- Context Prepared Time -> `context_prepared_at`
-- Lifecycle Milestones -> `last_started_at` + `ended_at` + `archived_at` + `deleted_at`
--
-- 说明：
-- 1. `product_id` 与 `strategy_id` 承担稳定引用语义；本契约不要求在引流工作表内复制产品或策略正文，
--    以保持产品域、策略域与工作域的边界清晰。
-- 2. `object_bindings_json` 采用聚合表达，描述“策略对象槽位绑定到了哪些具体资源”，
--    当前阶段不提前拆成独立关系表，以免把尚未稳定的对象域实现写死。
-- 3. 生命周期状态与上下文准备状态显式分离，允许表达“工作仍为 ready，但上下文准备失败”的业务场景。
-- 4. `ended`、`archived`、`deleted` 都是业务状态语义，SQL 契约不规定调度器内部实现，也不规定物理删除策略。

-- 字段语义约束
-- traffic_work_id:
--   - 引流工作稳定标识。
--   - 由系统生成，不依赖展示名称、产品名称或策略名称。
--
-- display_name:
--   - 引流工作的可读展示名称。
--   - 不添加 UNIQUE 约束，允许同名工作存在。
--
-- product_id / strategy_id:
--   - 分别指向工作当前绑定的产品与策略稳定标识。
--   - 只承担引用语义，不在本表内复制目标领域内容。
--
-- object_bindings_json:
--   - 对象绑定集合的 JSON 数组文本。
--   - 每一项表达一个策略对象槽位与具体资源对象之间的绑定关系。
--   - 当前阶段不在本表中引入任务分配、调度条件或资源运行时统计字段。
--
-- lifecycle_status:
--   - `ready`: 工作已存在且未处于运行中。
--   - `running`: 工作当前正在运行。
--   - `ended`: 工作业务上已经结束。
--   - `archived`: 工作业务上已归档。
--   - `deleted`: 工作业务上已删除。
--
-- context_preparation_status:
--   - `pending`: 尚未完成上下文准备，或更新后需要重新准备。
--   - `prepared`: 当前工作上下文已准备完成，可为启动提供前提。
--   - `failed`: 最近一次上下文准备失败。
--
-- context_prepared_at:
--   - 最近一次上下文准备成功完成的时间。
--   - 仅当 `context_preparation_status = prepared` 时允许存在。
--
-- last_started_at:
--   - 最近一次成功启动工作并进入 `running` 的时间。
--
-- ended_at / archived_at / deleted_at:
--   - 分别表达进入对应业务状态的时间。
--   - 只在相应状态成立时要求存在。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑列表排序、详情展示与状态追踪。

-- MVP 语义边界
-- 1. 当前阶段不定义 `paused` 独立状态；暂停语义通过从 `running` 回到 `ready` 表达。
-- 2. 当前阶段不定义任务表、任务日志表、调度计划表或平台脚本执行结果字段。
-- 3. 当前阶段不定义产品快照、策略快照或工作上下文产物的独立结构化表；
--    如需保存非结构化产物，应通过工作域外部的非结构化存储承担。
-- 4. 当前阶段不定义工作版本链、草稿、副本、实验分支或运行统计字段。
-- 5. 当前阶段不通过数据库层约束具体的产品表、策略表外键实现，以保持存储介质与装配实现可替换。
