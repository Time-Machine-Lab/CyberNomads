import { DatabaseSync } from "node:sqlite";

import type { AgentServiceStateStore } from "../../../ports/agent-service-state-store-port.js";
import type {
  AgentServiceConnectionRecord,
  CapabilityProvisioningStatus,
  StoredConnectionStatus,
} from "../../../modules/agent-access/types.js";

interface AgentServiceConnectionRow {
  service_scope: string;
  agent_service_id: string;
  provider_code: string;
  endpoint_url: string;
  authentication_kind: string;
  credential_ref: string;
  connection_status: StoredConnectionStatus;
  connection_status_reason: string | null;
  capability_status: CapabilityProvisioningStatus;
  capability_status_reason: string | null;
  last_verified_at: string | null;
  last_connected_at: string | null;
  capability_prepared_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteAgentServiceStateRepository implements AgentServiceStateStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async getCurrentService(): Promise<AgentServiceConnectionRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            service_scope,
            agent_service_id,
            provider_code,
            endpoint_url,
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
          FROM agent_service_connections
          WHERE service_scope = 'current'
        `,
      )
      .get() as AgentServiceConnectionRow | undefined;

    return row ? mapAgentServiceConnectionRow(row) : undefined;
  }

  async saveCurrentService(record: AgentServiceConnectionRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO agent_service_connections (
            service_scope,
            agent_service_id,
            provider_code,
            endpoint_url,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(service_scope) DO UPDATE SET
            agent_service_id = excluded.agent_service_id,
            provider_code = excluded.provider_code,
            endpoint_url = excluded.endpoint_url,
            authentication_kind = excluded.authentication_kind,
            credential_ref = excluded.credential_ref,
            connection_status = excluded.connection_status,
            connection_status_reason = excluded.connection_status_reason,
            capability_status = excluded.capability_status,
            capability_status_reason = excluded.capability_status_reason,
            last_verified_at = excluded.last_verified_at,
            last_connected_at = excluded.last_connected_at,
            capability_prepared_at = excluded.capability_prepared_at,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at
        `,
      )
      .run(
        record.serviceScope,
        record.agentServiceId,
        record.providerCode,
        record.endpointUrl,
        record.authenticationKind,
        record.credentialRef,
        record.connectionStatus,
        record.connectionStatusReason,
        record.capabilityStatus,
        record.capabilityStatusReason,
        record.lastVerifiedAt,
        record.lastConnectedAt,
        record.capabilityPreparedAt,
        record.createdAt,
        record.updatedAt,
      );
  }

  close(): void {
    this.database.close();
  }
}

function mapAgentServiceConnectionRow(
  row: AgentServiceConnectionRow,
): AgentServiceConnectionRecord {
  return {
    serviceScope: "current",
    agentServiceId: row.agent_service_id,
    providerCode: row.provider_code,
    endpointUrl: row.endpoint_url,
    authenticationKind: row.authentication_kind,
    credentialRef: row.credential_ref,
    connectionStatus: row.connection_status,
    connectionStatusReason: row.connection_status_reason,
    capabilityStatus: row.capability_status,
    capabilityStatusReason: row.capability_status_reason,
    lastVerifiedAt: row.last_verified_at,
    lastConnectedAt: row.last_connected_at,
    capabilityPreparedAt: row.capability_prepared_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}
