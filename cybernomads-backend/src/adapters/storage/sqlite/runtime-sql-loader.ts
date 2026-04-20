import { access, readdir, readFile } from "node:fs/promises";
import { dirname, extname, join, resolve } from "node:path";
import { fileURLToPath } from "node:url";

import {
  BootstrapError,
  bootstrapErrorCodes,
} from "../../../shared/bootstrap-error.js";

export interface RuntimeSqlScript {
  name: string;
  path: string;
  sql: string;
}

export async function resolveBundledRuntimeSqlDirectory(
  explicitDirectory?: string,
): Promise<string> {
  const candidateDirectories = explicitDirectory
    ? [resolve(explicitDirectory)]
    : getDefaultRuntimeSqlCandidates();

  for (const candidateDirectory of candidateDirectories) {
    try {
      await access(candidateDirectory);
      return candidateDirectory;
    } catch {
      continue;
    }
  }

  throw new BootstrapError(
    bootstrapErrorCodes.runtimeSqlLoadFailed,
    "Failed to locate bundled runtime SQL assets.",
    {
      details: {
        searchedPaths: candidateDirectories.join(", "),
      },
    },
  );
}

export async function loadRuntimeSqlScripts(
  runtimeSqlDirectory: string,
): Promise<RuntimeSqlScript[]> {
  try {
    const directoryEntries = await readdir(runtimeSqlDirectory, {
      withFileTypes: true,
    });
    const sqlEntries = directoryEntries
      .filter(
        (directoryEntry) =>
          directoryEntry.isFile() &&
          extname(directoryEntry.name).toLowerCase() === ".sql",
      )
      .sort((left, right) => left.name.localeCompare(right.name));

    if (sqlEntries.length === 0) {
      throw new BootstrapError(
        bootstrapErrorCodes.runtimeSqlLoadFailed,
        `No bundled runtime SQL scripts were found in "${runtimeSqlDirectory}".`,
        {
          details: {
            runtimeSqlDirectory,
          },
        },
      );
    }

    const scripts: RuntimeSqlScript[] = [];

    for (const sqlEntry of sqlEntries) {
      const scriptPath = join(runtimeSqlDirectory, sqlEntry.name);
      const sql = await readFile(scriptPath, "utf8");

      scripts.push({
        name: sqlEntry.name,
        path: scriptPath,
        sql,
      });
    }

    return scripts;
  } catch (error) {
    if (error instanceof BootstrapError) {
      throw error;
    }

    throw new BootstrapError(
      bootstrapErrorCodes.runtimeSqlLoadFailed,
      `Failed to load bundled runtime SQL scripts from "${runtimeSqlDirectory}".`,
      {
        cause: error,
        details: {
          runtimeSqlDirectory,
        },
      },
    );
  }
}

function getDefaultRuntimeSqlCandidates(): string[] {
  const currentModuleDirectory = dirname(fileURLToPath(import.meta.url));

  return [
    resolve(currentModuleDirectory, "../../../../runtime-assets/sql"),
    resolve(currentModuleDirectory, "../../../runtime-assets/sql"),
  ];
}
