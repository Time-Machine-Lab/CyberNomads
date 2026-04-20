-- 产品模块首版 SQL 契约
-- 目标：定义 MVP 阶段产品模块的最小结构化存储边界。
-- 范围：
--   1. 产品以稳定主键 `product_id` 作为唯一标识。
--   2. 产品名称 `name` 仅承担可读展示语义，不承担唯一性约束。
--   3. 产品完整 Markdown 正文存放于非结构化存储，`content_ref` 负责关联正文引用。
--   4. 当前阶段不引入删除、草稿、发布、归档、版本链等复杂语义。
--   5. 当前阶段只定义一个薄领域所需的最小结构化表，不把策略、任务、平台执行语义混入产品表。

CREATE TABLE products (
    product_id TEXT PRIMARY KEY,
    name TEXT NOT NULL,
    content_ref TEXT NOT NULL,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_products_updated_at ON products(updated_at DESC);

-- 领域语义映射
-- Product -> `products` 表中的单行记录，表达一个稳定的产品对象。
-- Product Identifier -> `product_id`
-- Product Name -> `name`
-- Product Content Reference -> `content_ref`
-- Product Summary -> `product_id` + `name` + `updated_at`
-- Full Product Context -> 通过 `content_ref` 读取完整 Markdown 正文后对外提供
--
-- 说明：
-- 1. SQL 契约只负责结构化元数据和正文引用，不把完整正文直接内嵌到 `products` 表。
-- 2. 这保持了产品域“定义产品对象 + 关联完整正文”的薄领域边界。
-- 3. 产品列表所需的摘要信息可以直接由本表提供，详情语义则由本表与正文引用共同承载。

-- 字段语义约束
-- product_id:
--   - 产品稳定标识。
--   - 由系统生成，不依赖产品名称。
--
-- name:
--   - 产品可读名称。
--   - 不添加 UNIQUE 约束，允许同名产品存在。
--
-- content_ref:
--   - 指向产品完整 Markdown 正文的稳定引用。
--   - 用于表达“一个产品对象对应一份完整正文”的关系。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑列表展示与更新追踪。

-- MVP 语义边界
-- 1. 当前阶段不提供删除语义，因此本表不定义 `deleted_at`、`is_deleted`
--    或任何软删/硬删相关字段。
-- 2. 当前阶段不定义 `status`、`published_at`、`archived_at`、`version`
--    等状态或版本字段。
-- 3. 当前阶段每个产品仅关联一份有效正文，不引入正文版本链或多正文并存。
-- 4. 当前阶段不定义草稿、审核、发布、多语言版本组、产品矩阵等超出 MVP 的复杂语义。
-- 5. 当前阶段不在本表中引入策略绑定、任务调度、平台执行或日志观察相关字段。
