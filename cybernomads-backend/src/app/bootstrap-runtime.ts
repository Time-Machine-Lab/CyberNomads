import {
  ensureRuntimePaths,
  resolveRuntimePaths,
  type RuntimePaths,
} from "../adapters/storage/file-system/runtime-paths.js";
import {
  resolveBundledRuntimeAgentDirectory,
  syncBundledRuntimeAgentAssets,
} from "../adapters/skill/local/runtime-skill-assets.js";
import {
  openRuntimeDatabase,
  type OpenRuntimeDatabase,
} from "../adapters/storage/sqlite/runtime-database.js";
import {
  loadRuntimeSqlScripts,
  resolveBundledRuntimeSqlDirectory,
} from "../adapters/storage/sqlite/runtime-sql-loader.js";
import { executeRuntimeSqlScripts } from "../adapters/storage/sqlite/runtime-sql-runner.js";

export interface BootstrapRuntimeOptions {
  workingDirectory?: string;
  runtimeSqlDirectory?: string;
  runtimeAgentAssetsDirectory?: string;
  openRuntimeDatabase?: OpenRuntimeDatabase;
  now?: () => Date;
}

export interface BootstrapRuntimeResult {
  paths: RuntimePaths;
  runtimeSqlDirectory: string;
  runtimeAgentAssetsDirectory: string;
  appliedScripts: string[];
  skippedScripts: string[];
}

export async function bootstrapRuntime(
  options: BootstrapRuntimeOptions = {},
): Promise<BootstrapRuntimeResult> {
  const runtimePaths = resolveRuntimePaths(options.workingDirectory);
  await ensureRuntimePaths(runtimePaths);
  const runtimeAgentAssetsDirectory = await resolveBundledRuntimeAgentDirectory(
    options.runtimeAgentAssetsDirectory,
  );
  await syncBundledRuntimeAgentAssets(runtimePaths, {
    bundledAgentDirectory: runtimeAgentAssetsDirectory,
  });

  const database = openRuntimeDatabase(
    runtimePaths,
    options.openRuntimeDatabase,
  );

  try {
    const runtimeSqlDirectory = await resolveBundledRuntimeSqlDirectory(
      options.runtimeSqlDirectory,
    );
    const runtimeSqlScripts = await loadRuntimeSqlScripts(runtimeSqlDirectory);
    const executionResult = executeRuntimeSqlScripts(
      database,
      runtimeSqlScripts,
      options.now,
    );

    return {
      paths: runtimePaths,
      runtimeSqlDirectory,
      runtimeAgentAssetsDirectory,
      ...executionResult,
    };
  } finally {
    database.close();
  }
}
