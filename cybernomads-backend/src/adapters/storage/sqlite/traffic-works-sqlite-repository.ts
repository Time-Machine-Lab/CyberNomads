import { DatabaseSync } from "node:sqlite";

import type { TrafficWorkStateStore } from "../../../ports/traffic-work-state-store-port.js";
import type {
  ObjectBindingItem,
  StrategyParameterBinding,
  TrafficWorkRecord,
} from "../../../modules/traffic-works/types.js";

interface TrafficWorkRow {
  traffic_work_id: string;
  display_name: string;
  product_id: string;
  strategy_id: string;
  object_bindings_json: string;
  parameter_bindings_json: string;
  lifecycle_status: TrafficWorkRecord["lifecycleStatus"];
  lifecycle_status_reason: string | null;
  context_preparation_status: TrafficWorkRecord["contextPreparationStatus"];
  context_preparation_status_reason: string | null;
  context_prepared_at: string | null;
  last_started_at: string | null;
  ended_at: string | null;
  archived_at: string | null;
  deleted_at: string | null;
  created_at: string;
  updated_at: string;
}

export class SqliteTrafficWorkRepository implements TrafficWorkStateStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createTrafficWork(record: TrafficWorkRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO traffic_works (
            traffic_work_id,
            display_name,
            product_id,
            strategy_id,
            object_bindings_json,
            parameter_bindings_json,
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
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.trafficWorkId,
        record.displayName,
        record.productId,
        record.strategyId,
        serializeObjectBindings(record.objectBindings),
        serializeParameterBindings(record.parameterBindings),
        record.lifecycleStatus,
        record.lifecycleStatusReason,
        record.contextPreparationStatus,
        record.contextPreparationStatusReason,
        record.contextPreparedAt,
        record.lastStartedAt,
        record.endedAt,
        record.archivedAt,
        record.deletedAt,
        record.createdAt,
        record.updatedAt,
      );
  }

  async saveTrafficWork(record: TrafficWorkRecord): Promise<void> {
    this.database
      .prepare(
        `
          UPDATE traffic_works
          SET
            display_name = ?,
            product_id = ?,
            strategy_id = ?,
            object_bindings_json = ?,
            parameter_bindings_json = ?,
            lifecycle_status = ?,
            lifecycle_status_reason = ?,
            context_preparation_status = ?,
            context_preparation_status_reason = ?,
            context_prepared_at = ?,
            last_started_at = ?,
            ended_at = ?,
            archived_at = ?,
            deleted_at = ?,
            updated_at = ?
          WHERE traffic_work_id = ?
        `,
      )
      .run(
        record.displayName,
        record.productId,
        record.strategyId,
        serializeObjectBindings(record.objectBindings),
        serializeParameterBindings(record.parameterBindings),
        record.lifecycleStatus,
        record.lifecycleStatusReason,
        record.contextPreparationStatus,
        record.contextPreparationStatusReason,
        record.contextPreparedAt,
        record.lastStartedAt,
        record.endedAt,
        record.archivedAt,
        record.deletedAt,
        record.updatedAt,
        record.trafficWorkId,
      );
  }

  async getTrafficWorkById(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            traffic_work_id,
            display_name,
            product_id,
            strategy_id,
            object_bindings_json,
            parameter_bindings_json,
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
          FROM traffic_works
          WHERE traffic_work_id = ?
        `,
      )
      .get(trafficWorkId) as TrafficWorkRow | undefined;

    return row ? mapTrafficWorkRow(row) : undefined;
  }

  async listTrafficWorks(): Promise<TrafficWorkRecord[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
            traffic_work_id,
            display_name,
            product_id,
            strategy_id,
            object_bindings_json,
            parameter_bindings_json,
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
          FROM traffic_works
          ORDER BY updated_at DESC, traffic_work_id DESC
        `,
      )
      .all() as unknown as TrafficWorkRow[];

    return rows.map(mapTrafficWorkRow);
  }

  close(): void {
    this.database.close();
  }
}

function mapTrafficWorkRow(row: TrafficWorkRow): TrafficWorkRecord {
  return {
    trafficWorkId: row.traffic_work_id,
    displayName: row.display_name,
    productId: row.product_id,
    strategyId: row.strategy_id,
    objectBindings: parseObjectBindings(row.object_bindings_json),
    parameterBindings: parseParameterBindings(row.parameter_bindings_json),
    lifecycleStatus: row.lifecycle_status,
    lifecycleStatusReason: row.lifecycle_status_reason,
    contextPreparationStatus: row.context_preparation_status,
    contextPreparationStatusReason: row.context_preparation_status_reason,
    contextPreparedAt: row.context_prepared_at,
    lastStartedAt: row.last_started_at,
    endedAt: row.ended_at,
    archivedAt: row.archived_at,
    deletedAt: row.deleted_at,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function serializeObjectBindings(objectBindings: ObjectBindingItem[]): string {
  return JSON.stringify(objectBindings);
}

function serializeParameterBindings(
  parameterBindings: StrategyParameterBinding[],
): string {
  return JSON.stringify(parameterBindings);
}

function parseObjectBindings(serializedValue: string): ObjectBindingItem[] {
  const parsedValue = JSON.parse(serializedValue) as unknown;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item): item is ObjectBindingItem => {
      return Boolean(item) && typeof item === "object" && !Array.isArray(item);
    })
    .map((item) => ({
      objectType: item.objectType,
      objectKey: item.objectKey,
      resourceId: item.resourceId,
      resourceLabel:
        typeof item.resourceLabel === "string" ? item.resourceLabel : null,
    }));
}

function parseParameterBindings(
  serializedValue: string,
): StrategyParameterBinding[] {
  const parsedValue = JSON.parse(serializedValue) as unknown;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue.flatMap((item) => {
    if (!item || typeof item !== "object" || Array.isArray(item)) {
      return [];
    }

    if (
      typeof item.type === "string" &&
      typeof item.key === "string" &&
      (typeof item.value === "string" ||
        (typeof item.value === "number" && Number.isFinite(item.value)))
    ) {
      return [
        {
          type: item.type,
          key: item.key,
          value: String(item.value),
        },
      ];
    }

    return [];
  });
}
