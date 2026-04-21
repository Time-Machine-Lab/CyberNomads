-- 策略模块首版 SQL 契约
-- 目标：定义 MVP 阶段策略模块的最小结构化存储边界。
-- 范围：
--   1. 策略以稳定主键 `strategy_id` 作为唯一标识。
--   2. 策略名称 `name` 仅承担可读展示语义，不承担唯一性约束。
--   3. 策略摘要 `summary` 与标签集合 `tags_json` 作为结构化元数据保存在 SQLite 中。
--   4. 策略完整 Markdown 正文存放于非结构化存储，`content_ref` 负责关联正文引用。
--   5. 导入块标记属于 Markdown 正文的一部分，不单独建关系表。
--   6. 当前阶段只定义一个薄领域所需的最小结构化表，不把删除、状态机、参数绑定、任务调度或运行统计语义混入策略表。

CREATE TABLE strategies (
    strategy_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    summary TEXT NOT NULL,
    tags_json TEXT NOT NULL DEFAULT '[]',
    content_ref TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_strategies_updated_at ON strategies(updated_at DESC);

-- 领域语义映射
-- Strategy -> `strategies` 表中的单行记录，表达一个稳定的策略对象。
-- Strategy Identifier -> `strategy_id`
-- Strategy Name -> `name`
-- Strategy Summary -> `summary`
-- Strategy Tags -> `tags_json`
-- Strategy Content Reference -> `content_ref`
-- Strategy Summary View -> `strategy_id` + `name` + `summary` + `tags_json` + `updated_at`
-- Full Strategy Detail -> 通过 `content_ref` 读取完整 Markdown 正文后对外提供
--
-- 说明：
-- 1. SQL 契约只负责结构化元数据和正文引用，不把完整正文直接内嵌到 `strategies` 表。
-- 2. 这保持了策略域“定义策略对象 + 关联完整正文”的薄领域边界。
-- 3. 导入块标记与参数占位符属于正文级语义，在运行时由正文解析得到，不作为本表的独立列。

-- 字段语义约束
-- strategy_id:
--   - 策略稳定标识。
--   - 由系统生成，不依赖策略名称。
--
-- name:
--   - 策略可读名称。
--   - 不添加 UNIQUE 约束，允许同名策略存在。
--
-- summary:
--   - 策略摘要信息。
--   - 可由调用方显式提供；若缺省，运行时可从正文自动派生后再持久化。
--
-- tags_json:
--   - 策略标签集合的 JSON 数组表示。
--   - 用于列表筛选、分类与快速识别，不承担运行时组合语义。
--
-- content_ref:
--   - 指向策略完整 Markdown 正文的稳定引用。
--   - 用于表达“一个策略对象对应一份完整正文”的关系。
--   - 参数占位符声明也只存在于这份 Markdown 模板中，不单独做结构化存储。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑列表展示与更新追踪。

-- MVP 语义边界
-- 1. 当前阶段不提供删除语义，因此本表不定义 `deleted_at`、`is_deleted`
--    或任何软删/硬删相关字段。
-- 2. 当前阶段不定义 `status`、`published_at`、`archived_at`、`version`
--    等状态或版本字段。
-- 3. 当前阶段每个策略仅关联一份有效正文，不引入正文版本链或多正文并存。
-- 4. 当前阶段不为导入块标记建立独立表，也不表达任何策略间活引用关系。
-- 5. 当前阶段不在本表中引入参数绑定结果、对象路由、任务调度、实验统计、成功率或运行日志相关字段。
