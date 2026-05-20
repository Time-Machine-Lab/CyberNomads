import { DatabaseSync } from "node:sqlite";

import type { TaskDecompositionRunStorePort } from "../../../ports/task-decomposition-run-store-port.js";
import type {
  TaskDecompositionArtifactRecord,
  TaskDecompositionArtifactType,
  TaskDecompositionRunRecord,
} from "../../../modules/task-decomposition-runs/types.js";

interface TaskDecompositionRunRow {
  decomposition_run_id: string;
  traffic_work_id: string;
  run_status: TaskDecompositionRunRecord["status"];
  run_stage: TaskDecompositionRunRecord["stage"];
  task_set_mode: TaskDecompositionRunRecord["taskSetMode"];
  provider_code: string;
  model: string | null;
  latest_summary: string | null;
  review_conclusion: string | null;
  repair_attempts: number;
  max_repair_attempts: number;
  draft_artifact_id: string | null;
  review_artifact_id: string | null;
  report_artifact_id: string | null;
  confirmation_snapshot_artifact_id: string | null;
  created_at: string;
  updated_at: string;
  completed_at: string | null;
}

interface TaskDecompositionArtifactRow {
  artifact_id: string;
  decomposition_run_id: string;
  traffic_work_id: string;
  artifact_type: TaskDecompositionArtifactType;
  summary: string | null;
  content_json: string;
  content_markdown: string | null;
  created_at: string;
}

export class SqliteTaskDecompositionRunRepository
  implements TaskDecompositionRunStorePort
{
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createRun(record: TaskDecompositionRunRecord): Promise<void> {
    this.insertOrReplaceRun(record);
  }

  async saveRun(record: TaskDecompositionRunRecord): Promise<void> {
    this.insertOrReplaceRun(record);
  }

  async getRunById(
    decompositionRunId: string,
  ): Promise<TaskDecompositionRunRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM task_decomposition_runs
          WHERE decomposition_run_id = ?
        `,
      )
      .get(decompositionRunId) as TaskDecompositionRunRow | undefined;

    return row ? mapRunRow(row) : undefined;
  }

  async getLatestRunByTrafficWorkId(
    trafficWorkId: string,
  ): Promise<TaskDecompositionRunRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM task_decomposition_runs
          WHERE traffic_work_id = ?
          ORDER BY updated_at DESC, decomposition_run_id DESC
          LIMIT 1
        `,
      )
      .get(trafficWorkId) as TaskDecompositionRunRow | undefined;

    return row ? mapRunRow(row) : undefined;
  }

  async createArtifact(
    record: TaskDecompositionArtifactRecord,
  ): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO task_decomposition_artifacts (
            artifact_id,
            decomposition_run_id,
            traffic_work_id,
            artifact_type,
            summary,
            content_json,
            content_markdown,
            created_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.artifactId,
        record.decompositionRunId,
        record.trafficWorkId,
        record.artifactType,
        record.summary,
        JSON.stringify(record.contentJson),
        record.contentMarkdown,
        record.createdAt,
      );
  }

  async getArtifactById(
    artifactId: string,
  ): Promise<TaskDecompositionArtifactRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM task_decomposition_artifacts
          WHERE artifact_id = ?
        `,
      )
      .get(artifactId) as TaskDecompositionArtifactRow | undefined;

    return row ? mapArtifactRow(row) : undefined;
  }

  async getLatestArtifact(
    trafficWorkId: string,
    artifactType: TaskDecompositionArtifactType,
  ): Promise<TaskDecompositionArtifactRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT *
          FROM task_decomposition_artifacts
          WHERE traffic_work_id = ?
            AND artifact_type = ?
          ORDER BY created_at DESC, artifact_id DESC
          LIMIT 1
        `,
      )
      .get(trafficWorkId, artifactType) as
      | TaskDecompositionArtifactRow
      | undefined;

    return row ? mapArtifactRow(row) : undefined;
  }

  async listArtifactsForRun(
    decompositionRunId: string,
  ): Promise<TaskDecompositionArtifactRecord[]> {
    const rows = this.database
      .prepare(
        `
          SELECT *
          FROM task_decomposition_artifacts
          WHERE decomposition_run_id = ?
          ORDER BY created_at ASC, artifact_id ASC
        `,
      )
      .all(decompositionRunId) as unknown as TaskDecompositionArtifactRow[];

    return rows.map(mapArtifactRow);
  }

  close(): void {
    this.database.close();
  }

  private insertOrReplaceRun(record: TaskDecompositionRunRecord): void {
    this.database
      .prepare(
        `
          INSERT INTO task_decomposition_runs (
            decomposition_run_id,
            traffic_work_id,
            run_status,
            run_stage,
            task_set_mode,
            provider_code,
            model,
            latest_summary,
            review_conclusion,
            repair_attempts,
            max_repair_attempts,
            draft_artifact_id,
            review_artifact_id,
            report_artifact_id,
            confirmation_snapshot_artifact_id,
            created_at,
            updated_at,
            completed_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)
          ON CONFLICT(decomposition_run_id) DO UPDATE SET
            traffic_work_id = excluded.traffic_work_id,
            run_status = excluded.run_status,
            run_stage = excluded.run_stage,
            task_set_mode = excluded.task_set_mode,
            provider_code = excluded.provider_code,
            model = excluded.model,
            latest_summary = excluded.latest_summary,
            review_conclusion = excluded.review_conclusion,
            repair_attempts = excluded.repair_attempts,
            max_repair_attempts = excluded.max_repair_attempts,
            draft_artifact_id = excluded.draft_artifact_id,
            review_artifact_id = excluded.review_artifact_id,
            report_artifact_id = excluded.report_artifact_id,
            confirmation_snapshot_artifact_id = excluded.confirmation_snapshot_artifact_id,
            created_at = excluded.created_at,
            updated_at = excluded.updated_at,
            completed_at = excluded.completed_at
        `,
      )
      .run(
        record.decompositionRunId,
        record.trafficWorkId,
        record.status,
        record.stage,
        record.taskSetMode,
        record.providerCode,
        record.model,
        record.latestSummary,
        record.reviewConclusion,
        record.repairAttempts,
        record.maxRepairAttempts,
        record.draftArtifactId,
        record.reviewArtifactId,
        record.reportArtifactId,
        record.confirmationSnapshotArtifactId,
        record.createdAt,
        record.updatedAt,
        record.completedAt,
      );
  }
}

function mapRunRow(row: TaskDecompositionRunRow): TaskDecompositionRunRecord {
  return {
    decompositionRunId: row.decomposition_run_id,
    trafficWorkId: row.traffic_work_id,
    status: row.run_status,
    stage: row.run_stage,
    taskSetMode: row.task_set_mode,
    providerCode: row.provider_code,
    model: row.model,
    latestSummary: row.latest_summary,
    reviewConclusion: row.review_conclusion,
    repairAttempts: row.repair_attempts,
    maxRepairAttempts: row.max_repair_attempts,
    draftArtifactId: row.draft_artifact_id,
    reviewArtifactId: row.review_artifact_id,
    reportArtifactId: row.report_artifact_id,
    confirmationSnapshotArtifactId: row.confirmation_snapshot_artifact_id,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
    completedAt: row.completed_at,
  };
}

function mapArtifactRow(
  row: TaskDecompositionArtifactRow,
): TaskDecompositionArtifactRecord {
  return {
    artifactId: row.artifact_id,
    decompositionRunId: row.decomposition_run_id,
    trafficWorkId: row.traffic_work_id,
    artifactType: row.artifact_type,
    summary: row.summary,
    contentJson: parseJson(row.content_json),
    contentMarkdown: row.content_markdown,
    createdAt: row.created_at,
  };
}

function parseJson(value: string): unknown {
  try {
    return JSON.parse(value) as unknown;
  } catch {
    return {};
  }
}
