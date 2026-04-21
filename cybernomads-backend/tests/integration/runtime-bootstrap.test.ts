import {
  access,
  mkdtemp,
  mkdir,
  readFile,
  rm,
  writeFile,
} from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import { bootstrapRuntime } from "../../src/app/bootstrap-runtime.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";

describe.sequential("runtime bootstrap", () => {
  const temporaryDirectories: string[] = [];

  afterAll(async () => {
    await Promise.all(
      temporaryDirectories.map((temporaryDirectory) =>
        rm(temporaryDirectory, { recursive: true, force: true }),
      ),
    );
  });

  it("prepares the runtime root, fixed directories, SQLite file, and bootstrap table on first startup", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);

    const result = await bootstrapRuntime({ workingDirectory });
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    await expect(access(runtimePaths.runtimeRoot)).resolves.toBeUndefined();
    await expect(
      access(runtimePaths.productDirectory),
    ).resolves.toBeUndefined();
    await expect(
      access(runtimePaths.strategyDirectory),
    ).resolves.toBeUndefined();
    await expect(access(runtimePaths.workDirectory)).resolves.toBeUndefined();
    await expect(access(runtimePaths.databaseFile)).resolves.toBeUndefined();

    expect(result.appliedScripts).toEqual([
      "001-bootstrap.sql",
      "002-products.sql",
      "003-agent-services.sql",
    ]);
    expect(result.skippedScripts).toEqual([]);

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const bootstrapTable = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get("runtime_sql_scripts") as { name: string } | undefined;
    const recordedScripts = database
      .prepare("SELECT COUNT(*) AS count FROM runtime_sql_scripts")
      .get() as { count: number } | undefined;
    const productsTable = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get("products") as { name: string } | undefined;
    const agentServicesTable = database
      .prepare(
        "SELECT name FROM sqlite_master WHERE type = 'table' AND name = ?",
      )
      .get("agent_service_connections") as { name: string } | undefined;
    database.close();

    expect(bootstrapTable?.name).toBe("runtime_sql_scripts");
    expect(recordedScripts?.count).toBe(3);
    expect(productsTable?.name).toBe("products");
    expect(agentServicesTable?.name).toBe("agent_service_connections");
  });

  it("skips already executed runtime SQL scripts on repeated startup", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);

    await bootstrapRuntime({ workingDirectory });
    const secondRun = await bootstrapRuntime({ workingDirectory });
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    expect(secondRun.appliedScripts).toEqual([]);
    expect(secondRun.skippedScripts).toEqual([
      "001-bootstrap.sql",
      "002-products.sql",
      "003-agent-services.sql",
    ]);

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const recordedScripts = database
      .prepare("SELECT COUNT(*) AS count FROM runtime_sql_scripts")
      .get() as { count: number } | undefined;
    database.close();

    expect(recordedScripts?.count).toBe(3);
  });

  it("fails startup explicitly when the SQLite runtime database cannot be opened", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);

    await expect(
      bootstrapRuntime({
        workingDirectory,
        openRuntimeDatabase: () => {
          throw new Error("sqlite open failed");
        },
      }),
    ).rejects.toMatchObject({
      code: "SQLITE_OPEN_FAILED",
    });
  });

  it("fails startup explicitly when a bundled runtime SQL script cannot be executed", async () => {
    const workingDirectory =
      await createTemporaryDirectory(temporaryDirectories);
    const runtimeSqlDirectory =
      await createBrokenRuntimeSqlDirectory(temporaryDirectories);

    await expect(
      bootstrapRuntime({
        workingDirectory,
        runtimeSqlDirectory,
      }),
    ).rejects.toMatchObject({
      code: "RUNTIME_SQL_EXECUTION_FAILED",
    });
  });
});

async function createTemporaryDirectory(
  temporaryDirectories: string[],
): Promise<string> {
  const temporaryDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-runtime-bootstrap-"),
  );

  temporaryDirectories.push(temporaryDirectory);

  return temporaryDirectory;
}

async function createBrokenRuntimeSqlDirectory(
  temporaryDirectories: string[],
): Promise<string> {
  const assetRoot = await createTemporaryDirectory(temporaryDirectories);
  const runtimeSqlDirectory = join(assetRoot, "sql");
  await mkdir(runtimeSqlDirectory, { recursive: true });

  const sourceSqlPath = join(
    process.cwd(),
    "runtime-assets",
    "sql",
    "001-bootstrap.sql",
  );
  const sourceSql = await readFile(sourceSqlPath, "utf8");

  await writeFile(
    join(runtimeSqlDirectory, "001-bootstrap.sql"),
    `${sourceSql}\nTHIS IS NOT VALID SQL;`,
    "utf8",
  );

  return runtimeSqlDirectory;
}
