import { DatabaseSync } from "node:sqlite";

import type {
  StrategyMetadataStore,
  StrategyRecord,
  StrategySummary,
} from "../../../modules/strategies/types.js";

interface StrategyRow {
  strategy_id: string;
  name: string;
  summary: string;
  tags_json: string;
  content_ref: string;
  created_at: string;
  updated_at: string;
}

interface StrategySummaryRow {
  strategyId: string;
  name: string;
  summary: string;
  tagsJson: string;
  updatedAt: string;
}

export class SqliteStrategyRepository implements StrategyMetadataStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async createStrategy(record: StrategyRecord): Promise<void> {
    this.database
      .prepare(
        `
          INSERT INTO strategies (
            strategy_id,
            name,
            summary,
            tags_json,
            content_ref,
            created_at,
            updated_at
          ) VALUES (?, ?, ?, ?, ?, ?, ?)
        `,
      )
      .run(
        record.strategyId,
        record.name,
        record.summary,
        JSON.stringify(record.tags),
        record.contentRef,
        record.createdAt,
        record.updatedAt,
      );
  }

  async updateStrategy(
    strategyId: string,
    updates: Pick<StrategyRecord, "name" | "summary" | "tags" | "updatedAt">,
  ): Promise<void> {
    this.database
      .prepare(
        `
          UPDATE strategies
          SET name = ?, summary = ?, tags_json = ?, updated_at = ?
          WHERE strategy_id = ?
        `,
      )
      .run(
        updates.name,
        updates.summary,
        JSON.stringify(updates.tags),
        updates.updatedAt,
        strategyId,
      );
  }

  async getStrategyById(
    strategyId: string,
  ): Promise<StrategyRecord | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            strategy_id,
            name,
            summary,
            tags_json,
            content_ref,
            created_at,
            updated_at
          FROM strategies
          WHERE strategy_id = ?
        `,
      )
      .get(strategyId) as StrategyRow | undefined;

    return row ? mapStrategyRow(row) : undefined;
  }

  async listStrategies(): Promise<StrategySummary[]> {
    const rows = this.database
      .prepare(
        `
          SELECT
            strategy_id AS strategyId,
            name,
            summary,
            tags_json AS tagsJson,
            updated_at AS updatedAt
          FROM strategies
          ORDER BY updated_at DESC, strategy_id DESC
        `,
      )
      .all() as unknown as StrategySummaryRow[];

    return rows.map((row) => ({
      strategyId: row.strategyId,
      name: row.name,
      summary: row.summary,
      tags: parseTagsJson(row.tagsJson),
      updatedAt: row.updatedAt,
    }));
  }

  async deleteStrategy(strategyId: string): Promise<void> {
    this.database
      .prepare("DELETE FROM strategies WHERE strategy_id = ?")
      .run(strategyId);
  }

  close(): void {
    this.database.close();
  }
}

function mapStrategyRow(row: StrategyRow): StrategyRecord {
  return {
    strategyId: row.strategy_id,
    name: row.name,
    summary: row.summary,
    tags: parseTagsJson(row.tags_json),
    contentRef: row.content_ref,
    createdAt: row.created_at,
    updatedAt: row.updated_at,
  };
}

function parseTagsJson(tagsJson: string): string[] {
  const parsedTags = JSON.parse(tagsJson) as unknown;

  if (
    !Array.isArray(parsedTags) ||
    !parsedTags.every((tag) => typeof tag === "string")
  ) {
    throw new Error("Invalid strategy tags_json payload.");
  }

  return parsedTags;
}
