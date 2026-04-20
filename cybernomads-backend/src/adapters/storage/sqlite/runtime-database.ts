import { DatabaseSync } from "node:sqlite";

import type { RuntimePaths } from "../file-system/runtime-paths.js";
import {
  BootstrapError,
  bootstrapErrorCodes,
} from "../../../shared/bootstrap-error.js";

export interface RuntimeSqlStatement<Result = unknown> {
  get(...parameters: unknown[]): Result;
  run(...parameters: unknown[]): unknown;
}

export interface RuntimeDatabase {
  exec(sql: string): void;
  prepare(sql: string): RuntimeSqlStatement;
  close(): void;
}

export type OpenRuntimeDatabase = (databaseFile: string) => RuntimeDatabase;

export function openRuntimeDatabase(
  runtimePaths: RuntimePaths,
  openDatabase: OpenRuntimeDatabase = defaultOpenRuntimeDatabase,
): RuntimeDatabase {
  try {
    const database = openDatabase(runtimePaths.databaseFile);
    database.exec("PRAGMA foreign_keys = ON;");
    return database;
  } catch (error) {
    throw new BootstrapError(
      bootstrapErrorCodes.sqliteOpenFailed,
      `Failed to create or open the SQLite runtime database at "${runtimePaths.databaseFile}".`,
      {
        cause: error,
        details: {
          databaseFile: runtimePaths.databaseFile,
        },
      },
    );
  }
}

function defaultOpenRuntimeDatabase(databaseFile: string): RuntimeDatabase {
  return new DatabaseSync(databaseFile);
}
