ALTER TABLE agent_service_connections
  RENAME TO agent_service_connections_legacy_011;

CREATE TABLE agent_service_connections (
  service_scope TEXT PRIMARY KEY
    CHECK (service_scope IN ('planning', 'execution')),
  agent_service_id TEXT NOT NULL UNIQUE,
  provider_code TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
  model TEXT,
  reasoning_effort TEXT,
  provider_settings_json TEXT NOT NULL DEFAULT '{}',
  authentication_kind TEXT NOT NULL,
  credential_ref TEXT NOT NULL,
  connection_status TEXT NOT NULL
    CHECK (connection_status IN (
      'pending_verification',
      'connected',
      'connection_failed'
    )),
  connection_status_reason TEXT,
  capability_status TEXT NOT NULL
    CHECK (capability_status IN (
      'not_ready',
      'preparing',
      'ready',
      'prepare_failed'
    )),
  capability_status_reason TEXT,
  last_verified_at TEXT,
  last_connected_at TEXT,
  capability_prepared_at TEXT,
  created_at TEXT NOT NULL,
  updated_at TEXT NOT NULL
);

INSERT INTO agent_service_connections (
  service_scope,
  agent_service_id,
  provider_code,
  endpoint_url,
  model,
  reasoning_effort,
  provider_settings_json,
  authentication_kind,
  credential_ref,
  connection_status,
  connection_status_reason,
  capability_status,
  capability_status_reason,
  last_verified_at,
  last_connected_at,
  capability_prepared_at,
  created_at,
  updated_at
)
SELECT
  CASE
    WHEN provider_code = 'cybernomads-agent' THEN 'planning'
    ELSE 'execution'
  END AS service_scope,
  agent_service_id,
  provider_code,
  endpoint_url,
  NULL AS model,
  NULL AS reasoning_effort,
  '{}' AS provider_settings_json,
  authentication_kind,
  credential_ref,
  connection_status,
  connection_status_reason,
  capability_status,
  capability_status_reason,
  last_verified_at,
  last_connected_at,
  capability_prepared_at,
  created_at,
  updated_at
FROM agent_service_connections_legacy_011
WHERE service_scope = 'current';

DROP TABLE agent_service_connections_legacy_011;

CREATE INDEX idx_agent_service_connections_provider_code
  ON agent_service_connections(provider_code);

CREATE INDEX idx_agent_service_connections_purpose_provider
  ON agent_service_connections(
    service_scope,
    provider_code
  );

CREATE INDEX idx_agent_service_connections_connection_status
  ON agent_service_connections(connection_status);

CREATE INDEX idx_agent_service_connections_capability_status
  ON agent_service_connections(capability_status);

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
