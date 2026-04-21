import { DatabaseSync } from "node:sqlite";

import type { StrategyReferenceStore } from "../../../ports/strategy-reference-store-port.js";
import type { StrategyBindingSummary } from "../../../modules/traffic-works/types.js";

interface StrategyReferenceRow {
  strategy_id: string;
  name: string;
}

export class SqliteStrategyReferenceRepository implements StrategyReferenceStore {
  private readonly database: DatabaseSync;

  constructor(databaseFile: string) {
    this.database = new DatabaseSync(databaseFile);
    this.database.exec("PRAGMA foreign_keys = ON;");
  }

  async getStrategyReferenceById(
    strategyId: string,
  ): Promise<StrategyBindingSummary | undefined> {
    const row = this.database
      .prepare(
        `
          SELECT
            strategy_id,
            name
          FROM strategies
          WHERE strategy_id = ?
        `,
      )
      .get(strategyId) as StrategyReferenceRow | undefined;

    if (!row) {
      return undefined;
    }

    return {
      strategyId: row.strategy_id,
      name: row.name,
    };
  }

  close(): void {
    this.database.close();
  }
}
