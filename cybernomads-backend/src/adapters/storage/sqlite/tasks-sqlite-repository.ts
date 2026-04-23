import { DatabaseSync } from "node:sqlite";

import type {
  TaskStorePort,
  TaskTrafficWorkState,
} from "../../../ports/task-store-port.js";
import type {
  ListTasksFilters,
  TaskCondition,
  TaskInputNeed,
  TaskOutputRecord,
  TaskRecord,
} from "../../../modules/tasks/types.js";

interface TaskRow {
  task_id: string;
  traffic_work_id: string;
  task_key: string | null;
  name: string;
  instruction: string;
  document_ref: string | null;
  context_ref: string;
  condition_json: string;
  input_needs_json: string;
  status: TaskRecord["status"];
  status_reason: string | null;
  created_at: string;
  updated_at: string;
}

interface TaskOutputRecordRow {
  output_record_id: string;
  task_id: string;
  description: string;
  data_location: string;
  created_at: string;
}

interface TrafficWorkStateRow {
  traffic_work_id: string;
  lifecycle_status: TaskTrafficWorkState["lifecycleStatus"];
}

interface CountRow {
  count: number;
}

export class SqliteTaskRepository implements TaskStorePort {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async getTrafficWorkState(
    trafficWorkId: string,
  ): Promise<TaskTrafficWorkState | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            traffic_work_id,
            lifecycle_status
          FROM traffic_works
          WHERE traffic_work_id = ?
        `,
      )
      .get(trafficWorkId) as TrafficWorkStateRow | undefined;

    return row
      ? {
          trafficWorkId: row.traffic_work_id,
          lifecycleStatus: row.lifecycle_status,
        }
      : undefined;
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<TaskRecord[]> {
    const conditions: string[] = [];
    const parameters: string[] = [];

    if (filters.trafficWorkId) {
      conditions.push("traffic_work_id = ?");
      parameters.push(filters.trafficWorkId);
    }

    if (filters.status) {
      conditions.push("status = ?");
      parameters.push(filters.status);
    }

    const whereClause =
      conditions.length > 0 ? `WHERE ${conditions.join(" AND ")}` : "";
    const rows = this.database
      .prepare(
        `
          SELECT
            task_id,
            traffic_work_id,
            task_key,
            name,
            instruction,
            document_ref,
            context_ref,
            condition_json,
            input_needs_json,
            status,
            status_reason,
            created_at,
            updated_at
          FROM tasks
          ${whereClause}
          ORDER BY updated_at DESC, task_id DESC
        `,
      )
      .all(...parameters) as unknown as TaskRow[];

    return rows.map(mapTaskRow);
  }

  async getTaskById(taskId: string): Promise<TaskRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            task_id,
            traffic_work_id,
            task_key,
            name,
            instruction,
            document_ref,
            context_ref,
            condition_json,
            input_needs_json,
            status,
            status_reason,
            created_at,
            updated_at
          FROM tasks
          WHERE task_id = ?
        `,
      )
      .get(taskId) as TaskRow | undefined;

    return row ? mapTaskRow(row) : undefined;
  }

  async countTasksByTrafficWorkId(trafficWorkId: string): Promise<number> {
    const row = this.database
      .prepare("SELECT COUNT(*) AS count FROM tasks WHERE traffic_work_id = ?")
      .get(trafficWorkId) as CountRow | undefined;

    return row?.count ?? 0;
  }

  async createTasks(records: TaskRecord[]): Promise<void> {
    this.database.exec("BEGIN IMMEDIATE;");

    try {
      for (const record of records) {
        this.insertTask(record);
      }

      this.database.exec("COMMIT;");
    } catch (error) {
      rollbackQuietly(this.database);
      throw error;
    }
  }

  async replaceTasksForTrafficWork(
    trafficWorkId: string,
    records: TaskRecord[],
  ): Promise<void> {
    this.database.exec("BEGIN IMMEDIATE;");

    try {
      this.database
        .prepare(
          `
            DELETE FROM task_output_records
            WHERE task_id IN (
              SELECT task_id FROM tasks WHERE traffic_work_id = ?
            )
          `,
        )
        .run(trafficWorkId);
      this.database
        .prepare("DELETE FROM tasks WHERE traffic_work_id = ?")
        .run(trafficWorkId);

      for (const record of records) {
        this.insertTask(record);
      }

      this.database.exec("COMMIT;");
    } catch (error) {
      rollbackQuietly(this.database);
      throw error;
    }
  }

  async saveTask(record: TaskRecord): Promise<void> {
    this.database
      .prepare(
        `
          UPDATE tasks
          SET
            name = ?,
            instruction = ?,
            document_ref = ?,
            context_ref = ?,
            condition_json = ?,
            input_needs_json = ?,
            status = ?,
            status_reason = ?,
            updated_at = ?
          WHERE task_id = ?
        `,
      )
      .run(
        record.name,
        record.instruction,
        record.documentRef,
        record.contextRef,
        serializeCondition(record.condition),
        serializeInputNeeds(record.inputNeeds),
        record.status,
        record.statusReason,
        record.updatedAt,
        record.taskId,
      );
  }

  async createTaskOutputRecord(record: TaskOutputRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO task_output_records (
            output_record_id,
            task_id,
            description,
            data_location,
            created_at
          ) VALUES (?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.outputRecordId,
        record.taskId,
        record.description,
        record.dataLocation,
        record.createdAt,
      );
  }

  async listTaskOutputRecords(taskId: string): Promise<TaskOutputRecord[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
            output_record_id,
            task_id,
            description,
            data_location,
            created_at
          FROM task_output_records
          WHERE task_id = ?
          ORDER BY created_at DESC, output_record_id DESC
        `,
      )
      .all(taskId) as unknown as TaskOutputRecordRow[];

    return rows.map(mapTaskOutputRecordRow);
  }

  close(): void {
    this.database.close();
  }

  private insertTask(record: TaskRecord): void {
    this.database
      .prepare(
        `
          INSERT INTO tasks (
            task_id,
            traffic_work_id,
            task_key,
            name,
            instruction,
            document_ref,
            context_ref,
            condition_json,
            input_needs_json,
            status,
            status_reason,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.taskId,
        record.trafficWorkId,
        record.taskKey,
        record.name,
        record.instruction,
        record.documentRef,
        record.contextRef,
        serializeCondition(record.condition),
        serializeInputNeeds(record.inputNeeds),
        record.status,
        record.statusReason,
        record.createdAt,
        record.updatedAt,
      );
  }
}

function mapTaskRow(row: TaskRow): TaskRecord {
  return {
    taskId: row.task_id,
    trafficWorkId: row.traffic_work_id,
    taskKey: row.task_key,
    name: row.name,
    instruction: row.instruction,
    documentRef: row.document_ref,
    contextRef: row.context_ref,
    condition: parseCondition(row.condition_json),
    inputNeeds: parseInputNeeds(row.input_needs_json),
    status: row.status,
    statusReason: row.status_reason,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function mapTaskOutputRecordRow(row: TaskOutputRecordRow): TaskOutputRecord {
  return {
    outputRecordId: row.output_record_id,
    taskId: row.task_id,
    description: row.description,
    dataLocation: row.data_location,
    createdAt: row.created_at,
  };
}

function serializeCondition(condition: TaskCondition): string {
  return JSON.stringify(condition);
}

function serializeInputNeeds(inputNeeds: TaskInputNeed[]): string {
  return JSON.stringify(inputNeeds);
}

function parseCondition(serializedValue: string): TaskCondition {
  const parsedValue = JSON.parse(serializedValue) as Partial<TaskCondition>;

  return {
    cron: typeof parsedValue.cron === "string" ? parsedValue.cron : null,
    relyOnTaskIds: Array.isArray(parsedValue.relyOnTaskIds)
      ? parsedValue.relyOnTaskIds.filter(
          (taskId): taskId is string => typeof taskId === "string",
        )
      : [],
  };
}

function parseInputNeeds(serializedValue: string): TaskInputNeed[] {
  const parsedValue = JSON.parse(serializedValue) as unknown;

  if (!Array.isArray(parsedValue)) {
    return [];
  }

  return parsedValue
    .filter((item): item is TaskInputNeed => {
      return Boolean(item) && typeof item === "object" && !Array.isArray(item);
    })
    .map((item) => ({
      name: item.name,
      description: item.description,
      source: item.source,
    }));
}

function rollbackQuietly(database: DatabaseSync): void {
  try {
    database.exec("ROLLBACK;");
  } catch {
    // Preserve the original SQLite error.
  }
}
