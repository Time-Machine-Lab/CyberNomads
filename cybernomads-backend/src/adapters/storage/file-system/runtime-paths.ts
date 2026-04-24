import { mkdir } from "node:fs/promises";
import { homedir } from "node:os";
import { join, resolve } from "node:path";

import {
  BootstrapError,
  bootstrapErrorCodes,
} from "../../../shared/bootstrap-error.js";

export const RUNTIME_ROOT_NAME = "cybernomads";
export const SQLITE_DATABASE_FILENAME = "runtime.sqlite";
export const FIXED_RUNTIME_DIRECTORIES = ["product", "strategy", "work"] as const;

export interface RuntimePaths {
  workingDirectory: string;
  runtimeRoot: string;
  productDirectory: string;
  strategyDirectory: string;
  workDirectory: string;
  databaseFile: string;
}

export interface RuntimePathDependencies {
  ensureDirectory?: (targetPath: string, options: { recursive: boolean }) => Promise<unknown>;
}

export function resolveRuntimePaths(workingDirectory?: string): RuntimePaths {
  const absoluteWorkingDirectory = resolve(workingDirectory ?? process.cwd());
  const runtimeRoot = resolveRuntimeRoot(workingDirectory);

  return {
    workingDirectory: absoluteWorkingDirectory,
    runtimeRoot,
    productDirectory: join(runtimeRoot, "product"),
    strategyDirectory: join(runtimeRoot, "strategy"),
    workDirectory: join(runtimeRoot, "work"),
    databaseFile: join(runtimeRoot, SQLITE_DATABASE_FILENAME),
  };
}

export async function ensureRuntimePaths(
  runtimePaths: RuntimePaths,
  dependencies: RuntimePathDependencies = {},
): Promise<void> {
  const ensureDirectory =
    dependencies.ensureDirectory ??
    (async (targetPath: string, options: { recursive: boolean }) =>
      mkdir(targetPath, options));

  try {
    await ensureDirectory(runtimePaths.runtimeRoot, { recursive: true });
    await ensureDirectory(runtimePaths.productDirectory, { recursive: true });
    await ensureDirectory(runtimePaths.strategyDirectory, { recursive: true });
    await ensureDirectory(runtimePaths.workDirectory, { recursive: true });
  } catch (error) {
    throw new BootstrapError(
      bootstrapErrorCodes.runtimeRootPreparationFailed,
      `Failed to prepare runtime directories under "${runtimePaths.runtimeRoot}".`,
      {
        cause: error,
        details: {
          runtimeRoot: runtimePaths.runtimeRoot,
        },
      },
    );
  }
}

function resolveRuntimeRoot(workingDirectory?: string): string {
  const runtimeRootOverride = process.env.CYBERNOMADS_RUNTIME_ROOT?.trim();

  if (runtimeRootOverride) {
    return resolve(runtimeRootOverride);
  }

  if (workingDirectory) {
    return join(resolve(workingDirectory), RUNTIME_ROOT_NAME);
  }

  if (process.platform === "darwin") {
    return join(
      homedir(),
      "Library",
      "Application Support",
      "CyberNomads",
      "backend",
    );
  }

  if (process.platform === "win32") {
    return join(
      process.env.APPDATA || join(homedir(), "AppData", "Roaming"),
      "CyberNomads",
      "backend",
    );
  }

  return join(
    process.env.XDG_STATE_HOME || join(homedir(), ".local", "state"),
    "CyberNomads",
    "backend",
  );
}
