CREATE TABLE traffic_works_v2 (
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

INSERT INTO traffic_works_v2 (
    traffic_work_id,
    display_name,
    product_id,
    strategy_id,
    object_bindings_json,
    lifecycle_status,
    lifecycle_status_reason,
    context_preparation_status,
    context_preparation_status_reason,
    context_prepared_at,
    last_started_at,
    ended_at,
    archived_at,
    deleted_at,
    created_at,
    updated_at
)
SELECT
    traffic_work_id,
    display_name,
    product_id,
    strategy_id,
    COALESCE((
        WITH merged_bindings AS (
            SELECT
                json_extract(value, '$.objectType') AS object_type,
                json_extract(value, '$.objectKey') AS object_key,
                json_extract(value, '$.resourceId') AS resource_id,
                json_extract(value, '$.resourceLabel') AS resource_label,
                0 AS source_priority
            FROM json_each(COALESCE(object_bindings_json, '[]'))

            UNION ALL

            SELECT
                json_extract(value, '$.type') AS object_type,
                json_extract(value, '$.key') AS object_key,
                CAST(json_extract(value, '$.value') AS TEXT) AS resource_id,
                CAST(json_extract(value, '$.value') AS TEXT) AS resource_label,
                1 AS source_priority
            FROM json_each(COALESCE(parameter_bindings_json, '[]'))
        ),
        deduped_bindings AS (
            SELECT
                object_type,
                object_key,
                resource_id,
                resource_label
            FROM merged_bindings current_binding
            WHERE object_type IS NOT NULL
              AND object_key IS NOT NULL
              AND resource_id IS NOT NULL
              AND NOT EXISTS (
                  SELECT 1
                  FROM merged_bindings earlier_binding
                  WHERE lower(trim(earlier_binding.object_type)) = lower(trim(current_binding.object_type))
                    AND lower(trim(earlier_binding.object_key)) = lower(trim(current_binding.object_key))
                    AND earlier_binding.source_priority < current_binding.source_priority
              )
        )
        SELECT json_group_array(
            json_object(
                'objectType', object_type,
                'objectKey', object_key,
                'resourceId', resource_id,
                'resourceLabel', resource_label
            )
        )
        FROM deduped_bindings
    ), '[]') AS object_bindings_json,
    lifecycle_status,
    lifecycle_status_reason,
    context_preparation_status,
    context_preparation_status_reason,
    context_prepared_at,
    last_started_at,
    ended_at,
    archived_at,
    deleted_at,
    created_at,
    updated_at
FROM traffic_works;

DROP TABLE traffic_works;

ALTER TABLE traffic_works_v2
    RENAME TO traffic_works;

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
