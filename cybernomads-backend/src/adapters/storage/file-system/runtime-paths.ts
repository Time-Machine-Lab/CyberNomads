import { mkdir } from "node:fs/promises";
import { join, resolve } from "node:path";

import {
  BootstrapError,
  bootstrapErrorCodes,
} from "../../../shared/bootstrap-error.js";

export const RUNTIME_ROOT_NAME = "cybernomads";
export const SQLITE_DATABASE_FILENAME = "runtime.sqlite";
export const FIXED_RUNTIME_DIRECTORIES = [
  "agent",
  "agent/skills",
  "agent/knowledge",
  "product",
  "strategy",
  "work",
] as const;

export interface RuntimePaths {
  workingDirectory: string;
  runtimeRoot: string;
  agentDirectory: string;
  agentSkillsDirectory: string;
  agentKnowledgeDirectory: string;
  productDirectory: string;
  strategyDirectory: string;
  workDirectory: string;
  databaseFile: string;
}

export interface RuntimePathDependencies {
  ensureDirectory?: (targetPath: string, options: { recursive: boolean }) => Promise<unknown>;
}

export function resolveRuntimePaths(workingDirectory = process.cwd()): RuntimePaths {
  const absoluteWorkingDirectory = resolve(workingDirectory);
  const runtimeRoot = join(absoluteWorkingDirectory, RUNTIME_ROOT_NAME);

  return {
    workingDirectory: absoluteWorkingDirectory,
    runtimeRoot,
    agentDirectory: join(runtimeRoot, "agent"),
    agentSkillsDirectory: join(runtimeRoot, "agent", "skills"),
    agentKnowledgeDirectory: join(runtimeRoot, "agent", "knowledge"),
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
    await ensureDirectory(runtimePaths.agentDirectory, { recursive: true });
    await ensureDirectory(runtimePaths.agentSkillsDirectory, { recursive: true });
    await ensureDirectory(runtimePaths.agentKnowledgeDirectory, {
      recursive: true,
    });
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
