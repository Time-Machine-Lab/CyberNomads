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
