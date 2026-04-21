CREATE TABLE IF NOT EXISTS agent_service_connections (
  service_scope TEXT PRIMARY KEY
    CHECK (service_scope = 'current'),
  agent_service_id TEXT NOT NULL UNIQUE,
  provider_code TEXT NOT NULL,
  endpoint_url TEXT NOT NULL,
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

CREATE INDEX IF NOT EXISTS idx_agent_service_connections_provider_code
  ON agent_service_connections(provider_code);

CREATE INDEX IF NOT EXISTS idx_agent_service_connections_connection_status
  ON agent_service_connections(connection_status);

CREATE INDEX IF NOT EXISTS idx_agent_service_connections_capability_status
  ON agent_service_connections(capability_status);
