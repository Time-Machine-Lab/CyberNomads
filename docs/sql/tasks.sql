-- 任务模块首版 SQL 契约
-- 目标：定义 MVP 阶段任务与任务产出记录的最小结构化存储边界。
-- 范围：
--   1. 任务以稳定主键 `task_id` 作为唯一标识，必须归属于一个引流工作 `traffic_work_id`。
--   2. 任务由 Agent 基于引流工作拆分后通过任务模块受控入口创建或替换；
--      普通用户不直接逐条手工创建完整任务集合。
--   3. 任务状态固定为 `ready`、`running`、`completed`、`failed`，不引入复杂状态机。
--   4. 执行条件与输入需求以结构化 JSON 文本保存，但不把调度算法写入存储契约。
--   5. 任务产出记录只保存抽象追踪信息，不承载视频、评论、私信、图片、文章等产出数据本体。

CREATE TABLE tasks (
    task_id TEXT PRIMARY KEY,
    traffic_work_id TEXT NOT NULL,
    task_key TEXT,
    name TEXT NOT NULL,
    instruction TEXT NOT NULL,
    document_ref TEXT,
    context_ref TEXT NOT NULL,
    condition_json TEXT NOT NULL DEFAULT '{"cron":null,"relyOnTaskIds":[]}',
    input_needs_json TEXT NOT NULL DEFAULT '[]',
    status TEXT NOT NULL
        CHECK (status IN (
            'ready',
            'running',
            'completed',
            'failed'
        )),
    status_reason TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL
);

CREATE INDEX idx_tasks_traffic_work_id
    ON tasks(traffic_work_id);

CREATE INDEX idx_tasks_traffic_work_status
    ON tasks(
        traffic_work_id,
        status
    );

CREATE INDEX idx_tasks_updated_at
    ON tasks(updated_at DESC);

CREATE UNIQUE INDEX idx_tasks_traffic_work_task_key
    ON tasks(
        traffic_work_id,
        task_key
    )
    WHERE task_key IS NOT NULL;

CREATE TABLE task_output_records (
    output_record_id TEXT PRIMARY KEY,
    task_id TEXT NOT NULL,
    description TEXT NOT NULL,
    data_location TEXT NOT NULL,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_task_output_records_task_id
    ON task_output_records(
        task_id,
        created_at DESC
    );

-- 领域语义映射
-- Task -> `tasks` 表中的单行记录，表达一个稳定的任务对象。
-- Task Identifier -> `task_id`
-- Owner Traffic Work -> `traffic_work_id`
-- Task Set Local Key -> `task_key`
-- Task Name -> `name`
-- Task Instruction -> `instruction`
-- Task Document Reference -> `document_ref`
-- Task Context Reference -> `context_ref`
-- Task Condition Set -> `condition_json`
-- Task Input Need Set -> `input_needs_json`
-- Task Status -> `status` + `status_reason`
-- Task Output Record -> `task_output_records` 表中的单行记录。
-- Task Output Data Location -> `data_location`
--
-- 说明：
-- 1. `traffic_work_id` 承担任务归属语义。任务不能脱离引流工作独立存在。
-- 2. `task_key` 是同一引流工作当前任务集内的可选稳定键，用于承接 Agent 拆分结果中的依赖引用；
--    全局稳定身份仍由 `task_id` 承担。
-- 3. `condition_json` 保存任务执行条件声明，当前推荐形态为：
--    `{"cron": "0 * * * *", "relyOnTaskIds": ["task_x"]}`。
--    该字段只表达条件，不定义规划器扫描线程、轮询间隔或依赖更新时间比较算法。
-- 4. `input_needs_json` 保存输入需求声明数组，当前推荐每项至少包含 `name`、`description`、`source`。
--    输入需求描述 Agent 如何找到数据，不承载输入数据本体。
-- 5. `task_output_records.data_location` 只保存产物位置引用；真实产出数据可位于任务数据区域、
--    本地文件系统、对象存储或其他实现层位置。

-- 字段语义约束
-- task_id:
--   - 任务稳定标识。
--   - 由系统生成，不依赖任务名称、任务说明或 Agent 请求内键。
--
-- traffic_work_id:
--   - 所属引流工作稳定标识。
--   - 当前 SQL 契约不强制定义数据库外键，以保持存储介质与迁移策略可替换。
--
-- task_key:
--   - 同一引流工作当前任务集内的可选稳定键。
--   - 可用于把 Agent 拆分请求内的依赖引用映射为持久化后的 `task_id`。
--   - 在同一 `traffic_work_id` 下若存在则必须唯一。
--
-- name:
--   - 任务可读名称。
--   - 不添加全局 UNIQUE 约束，允许不同工作或同一工作内出现相似任务名称。
--
-- instruction:
--   - 面向 Agent / subagent 的任务执行说明。
--   - 必须足够表达任务目标、执行流程、可用工具、输入需求和产出要求。
--
-- document_ref:
--   - 任务说明文档引用，可为空。
--   - 语义上表达说明入口，不等同于具体操作系统路径。
--
-- context_ref:
--   - 任务上下文引用。
--   - 语义上表达 Agent 执行时可加载的上下文入口，不绑定具体文件系统实现。
--
-- condition_json:
--   - 执行条件声明 JSON 文本。
--   - 当前只承载 `cron` 与 `relyOnTaskIds` 两类条件语义。
--   - `ready` 任务是否真正可执行，必须由规划器结合该字段判断。
--
-- input_needs_json:
--   - 输入需求声明 JSON 数组文本。
--   - 描述任务执行前需要哪些输入，以及 Agent 应如何定位和消费这些输入。
--
-- status:
--   - `ready`: 任务已进入可被规划器判断的范围，但不表示必然可执行。
--   - `running`: 任务已被提交执行，当前契约不定义重复提交语义。
--   - `completed`: 任务执行结束且达成目标。
--   - `failed`: 任务执行未达成目标。
--
-- status_reason:
--   - 最近一次状态变化原因。
--   - 可用于失败说明或观察展示，但不承载完整日志。
--
-- created_at / updated_at:
--   - 使用 ISO 8601 UTC 时间字符串。
--   - 支撑列表排序、调度扫描与状态追踪。
--
-- output_record_id:
--   - 任务产出记录稳定标识。
--   - 由系统生成，不依赖产物描述或位置。
--
-- task_id:
--   - 产出记录所属任务稳定标识。
--   - 当前 SQL 契约不强制定义数据库外键，以保持替换存储实现的灵活性。
--
-- description:
--   - 产出记录的人类可读描述，例如“候选视频列表”或“首批评论草稿”。
--
-- data_location:
--   - 产物位置引用。
--   - 不要求也不允许在本表内展开具体产出数据结构。

-- MVP 语义边界
-- 1. 当前阶段不定义 `blocked`、`cancelled`、`retrying`、`paused` 等额外任务状态。
-- 2. 当前阶段不定义任务失败自动重试、手动恢复、取消任务、并发锁或调度器内部线程字段。
-- 3. 当前阶段不定义任务历史归档、任务版本链、任务集版本号或旧任务对比语义。
-- 4. 当前阶段不定义完整日志表、平台动作流水表或 Agent provider 私有协议字段。
-- 5. 当前阶段不把视频、评论、私信、图片、文章等产出数据本体字段写入任务表或产出记录表。
-- 6. Agent 或 subagent 不应直接编辑 SQLite 文件；任务集创建/替换必须经过任务模块受控 API、
--    工具或服务入口完成。
