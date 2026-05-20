-- 任务拆分运行批次 SQL 契约
-- 目标：定义 Cybernomads Agent 任务拆分从草案、Review、修正、用户确认到系统提交的可追踪存储边界。
-- 范围：
--   1. 拆分运行批次以 `decomposition_run_id` 作为稳定标识，并归属于一个 `traffic_work_id`。
--   2. Agent 输出只保存为草案、Review、修正历史、报告、反馈和确认快照等产物。
--   3. 正式任务仍由任务模块写入 `tasks` 表；本契约不复制正式任务生命周期字段。
--   4. provider secret、API Key、Authorization、Bearer token 不得进入本表或产物内容。

CREATE TABLE task_decomposition_runs (
    decomposition_run_id TEXT PRIMARY KEY,
    traffic_work_id TEXT NOT NULL,
    run_status TEXT NOT NULL
        CHECK (run_status IN (
            'running',
            'waiting_user_confirmation',
            'committed',
            'failed',
            'awaiting_user_feedback'
        )),
    run_stage TEXT NOT NULL
        CHECK (run_stage IN (
            'context_ready',
            'planning',
            'reviewing',
            'repairing',
            'reporting',
            'waiting_user_confirmation',
            'committing',
            'prepared',
            'failed'
        )),
    task_set_mode TEXT NOT NULL
        CHECK (task_set_mode IN ('create', 'replace')),
    provider_code TEXT NOT NULL,
    model TEXT,
    latest_summary TEXT,
    review_conclusion TEXT,
    repair_attempts INTEGER NOT NULL DEFAULT 0,
    max_repair_attempts INTEGER NOT NULL DEFAULT 2,
    draft_artifact_id TEXT,
    review_artifact_id TEXT,
    report_artifact_id TEXT,
    confirmation_snapshot_artifact_id TEXT,
    created_at TEXT NOT NULL,
    updated_at TEXT NOT NULL,
    completed_at TEXT
);

CREATE INDEX idx_task_decomposition_runs_traffic_work
    ON task_decomposition_runs(
        traffic_work_id,
        updated_at DESC
    );

CREATE INDEX idx_task_decomposition_runs_status
    ON task_decomposition_runs(run_status);

CREATE TABLE task_decomposition_artifacts (
    artifact_id TEXT PRIMARY KEY,
    decomposition_run_id TEXT NOT NULL,
    traffic_work_id TEXT NOT NULL,
    artifact_type TEXT NOT NULL
        CHECK (artifact_type IN (
            'task_plan_draft',
            'review_report',
            'repair_history',
            'user_feedback',
            'confirmation_snapshot',
            'decomposition_report',
            'execution_feedback'
        )),
    summary TEXT,
    content_json TEXT NOT NULL DEFAULT '{}',
    content_markdown TEXT,
    created_at TEXT NOT NULL
);

CREATE INDEX idx_task_decomposition_artifacts_run
    ON task_decomposition_artifacts(
        decomposition_run_id,
        created_at ASC
    );

CREATE INDEX idx_task_decomposition_artifacts_traffic_work
    ON task_decomposition_artifacts(
        traffic_work_id,
        artifact_type,
        created_at DESC
    );

-- 领域语义映射
-- TaskDecompositionRun -> `task_decomposition_runs` 表中的单行记录，
--   表达一次围绕某个引流工作的任务拆分运行批次。
-- Task Plan Draft / Review Report / Repair History / Feedback /
--   Confirmation Snapshot / Decomposition Report -> `task_decomposition_artifacts`
--   表中的产物记录。
--
-- 字段语义约束
-- run_status:
--   - `running`: 后端正在运行 Planner、Review、Repair 或报告阶段。
--   - `waiting_user_confirmation`: Review 已通过，等待用户确认或反馈重拆。
--   - `committed`: 用户确认后，系统已通过任务模块提交正式任务集。
--   - `failed`: 模型调用、schema 校验、Review 或系统提交失败。
--   - `awaiting_user_feedback`: 失败或用户拒绝后保留产物，等待反馈重拆。
--
-- run_stage:
--   - 表达当前或最终阶段，供前端解释进度。
--   - `prepared` 只表示本批次系统提交完成；引流工作是否 prepared 仍以 `traffic_works` 为准。
--
-- task_set_mode:
--   - `create`: 新建引流工作后的首次正式任务集提交。
--   - `replace`: 更新或反馈重拆后的正式任务集替换。
--
-- draft_artifact_id / review_artifact_id / report_artifact_id /
-- confirmation_snapshot_artifact_id:
--   - 指向本批次当前最新核心产物，便于前端快速读取。
--
-- content_json / content_markdown:
--   - `content_json` 保存结构化草案、Review 问题、修正输入输出摘要和确认快照。
--   - `content_markdown` 保存用户可读报告或反馈正文。
--   - 两者都不得包含 provider secret 或内部原始密钥。
