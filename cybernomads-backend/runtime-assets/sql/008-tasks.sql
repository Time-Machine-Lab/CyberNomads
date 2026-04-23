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
