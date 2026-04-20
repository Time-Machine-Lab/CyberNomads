import {
  BootstrapError,
  bootstrapErrorCodes,
} from "../../../shared/bootstrap-error.js";
import type { RuntimeDatabase } from "./runtime-database.js";
import type { RuntimeSqlScript } from "./runtime-sql-loader.js";

const EXECUTION_LOG_TABLE_NAME = "runtime_sql_scripts";

interface ExecutionLogRow {
  script_name: string;
}

interface TableLookupRow {
  name: string;
}

export interface RuntimeSqlExecutionResult {
  appliedScripts: string[];
  skippedScripts: string[];
}

export function executeRuntimeSqlScripts(
  database: RuntimeDatabase,
  scripts: RuntimeSqlScript[],
  now: () => Date = () => new Date(),
): RuntimeSqlExecutionResult {
  const appliedScripts: string[] = [];
  const skippedScripts: string[] = [];

  for (const script of scripts) {
    if (hasScriptBeenApplied(database, script.name)) {
      skippedScripts.push(script.name);
      continue;
    }

    executeRuntimeSqlScript(database, script, now);
    appliedScripts.push(script.name);
  }

  return {
    appliedScripts,
    skippedScripts,
  };
}

function hasScriptBeenApplied(
  database: RuntimeDatabase,
  scriptName: string,
): boolean {
  if (!hasExecutionLogTable(database)) {
    return false;
  }

  const appliedScript = database
    .prepare(
      `SELECT script_name FROM ${EXECUTION_LOG_TABLE_NAME} WHERE script_name = ?`,
    )
    .get(scriptName) as ExecutionLogRow | undefined;

  return appliedScript !== undefined;
}

function hasExecutionLogTable(database: RuntimeDatabase): boolean {
  const tableRow = database
    .prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
    )
    .get(EXECUTION_LOG_TABLE_NAME) as TableLookupRow | undefined;

  return tableRow !== undefined;
}

function executeRuntimeSqlScript(
  database: RuntimeDatabase,
  script: RuntimeSqlScript,
  now: () => Date,
): void {
  database.exec("BEGIN IMMEDIATE;");

  try {
    database.exec(script.sql);

    if (!hasExecutionLogTable(database)) {
      throw new Error(
        `Runtime SQL script "${script.name}" did not create "${EXECUTION_LOG_TABLE_NAME}".`,
      );
    }

    database
      .prepare(
        `INSERT INTO ${EXECUTION_LOG_TABLE_NAME} (script_name, applied_at) VALUES (?, ?)`,
      )
      .run(script.name, now().toISOString());

    database.exec("COMMIT;");
  } catch (error) {
    rollbackQuietly(database);

    throw new BootstrapError(
      bootstrapErrorCodes.runtimeSqlExecutionFailed,
      `Failed to execute runtime SQL script "${script.name}".`,
      {
        cause: error,
        details: {
          scriptName: script.name,
          scriptPath: script.path,
        },
      },
    );
  }
}

function rollbackQuietly(database: RuntimeDatabase): void {
  try {
    database.exec("ROLLBACK;");
  } catch {
    // Ignore rollback failures and preserve the original bootstrap error.
  }
}
