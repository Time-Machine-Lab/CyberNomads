import { access, cp, mkdir, rm, stat } from "node:fs/promises";
import { dirname, relative, resolve, sep } from "node:path";

import type {
  CopyRuntimeAgentResourceInput,
  CopyRuntimeAgentResourceResult,
  RuntimeAgentResourceStorePort,
} from "../../../ports/runtime-agent-resource-store-port.js";
import type { RuntimePaths } from "./runtime-paths.js";

export interface FileSystemRuntimeAgentResourceStoreOptions {
  runtimePaths: Pick<
    RuntimePaths,
    "runtimeRoot" | "agentSkillsDirectory" | "agentKnowledgeDirectory"
  >;
  ensureDirectory?: (
    path: string,
    options: { recursive: boolean },
  ) => Promise<unknown>;
  removePath?: (
    path: string,
    options: { recursive: boolean; force: boolean },
  ) => Promise<unknown>;
  copyPath?: (
    source: string,
    destination: string,
    options?: Parameters<typeof cp>[2],
  ) => Promise<unknown>;
  getPathStats?: (path: string) => Promise<{ isDirectory(): boolean }>;
  ensurePathExists?: (path: string) => Promise<void>;
}

export class FileSystemRuntimeAgentResourceStore implements RuntimeAgentResourceStorePort {
  private readonly ensureDirectory;
  private readonly removePath;
  private readonly copyPath;
  private readonly getPathStats;
  private readonly ensurePathExists;

  constructor(
    private readonly options: FileSystemRuntimeAgentResourceStoreOptions,
  ) {
    this.ensureDirectory =
      options.ensureDirectory ??
      (async (path: string, mkdirOptions: { recursive: boolean }) =>
        mkdir(path, mkdirOptions));
    this.removePath =
      options.removePath ??
      (async (
        path: string,
        rmOptions: { recursive: boolean; force: boolean },
      ) => rm(path, rmOptions));
    this.copyPath =
      options.copyPath ??
      (async (
        source: string,
        destination: string,
        copyOptions?: Parameters<typeof cp>[2],
      ) => cp(source, destination, copyOptions));
    this.getPathStats =
      options.getPathStats ?? (async (path: string) => stat(path));
    this.ensurePathExists =
      options.ensurePathExists ??
      (async (path: string) => {
        await access(path);
      });
  }

  async copyRuntimeAgentResource(
    input: CopyRuntimeAgentResourceInput,
  ): Promise<CopyRuntimeAgentResourceResult> {
    const normalizedResourcePath = normalizeRelativeRuntimeResourcePath(
      input.resourcePath,
    );
    const sourceRootDirectory = this.resolveSourceRootDirectory(
      input.resourceType,
    );
    const normalizedSourceRoot = resolve(sourceRootDirectory);
    const normalizedTargetRoot = resolveRequiredDirectory(
      input.targetRootDirectory,
      "Target root directory is required.",
    );
    const sourceAbsolutePath = resolve(
      normalizedSourceRoot,
      normalizedResourcePath,
    );
    const targetAbsolutePath = resolve(
      normalizedTargetRoot,
      normalizedResourcePath,
    );

    ensurePathWithinRoot(
      normalizedSourceRoot,
      sourceAbsolutePath,
      "Runtime source path is outside the allowed agent resource boundary.",
    );
    ensurePathWithinRoot(
      normalizedTargetRoot,
      targetAbsolutePath,
      "Runtime target path is outside the allowed traffic work boundary.",
    );
    await this.ensurePathExists(sourceAbsolutePath);

    const sourceStats = await this.getPathStats(sourceAbsolutePath);
    await this.removePath(targetAbsolutePath, {
      recursive: true,
      force: true,
    });
    await this.ensureDirectory(dirname(targetAbsolutePath), {
      recursive: true,
    });
    await this.copyPath(sourceAbsolutePath, targetAbsolutePath, {
      recursive: sourceStats.isDirectory(),
      force: true,
    });

    return {
      resourceType: input.resourceType,
      sourceAbsolutePath,
      sourceRuntimeRelativePath: toRuntimeRelativePath(
        this.options.runtimePaths.runtimeRoot,
        sourceAbsolutePath,
      ),
      targetAbsolutePath,
      targetRuntimeRelativePath: toRuntimeRelativePath(
        this.options.runtimePaths.runtimeRoot,
        targetAbsolutePath,
      ),
    };
  }

  private resolveSourceRootDirectory(
    resourceType: CopyRuntimeAgentResourceInput["resourceType"],
  ): string {
    switch (resourceType) {
      case "skill":
        return this.options.runtimePaths.agentSkillsDirectory;
      case "knowledge":
        return this.options.runtimePaths.agentKnowledgeDirectory;
      default:
        return assertNever(resourceType);
    }
  }
}

function normalizeRelativeRuntimeResourcePath(resourcePath: string): string {
  if (typeof resourcePath !== "string") {
    throw new Error("Runtime resource path is required.");
  }

  const normalizedResourcePath = resourcePath.trim();

  if (normalizedResourcePath.length === 0) {
    throw new Error("Runtime resource path is required.");
  }

  return normalizedResourcePath;
}

function resolveRequiredDirectory(path: string, message: string): string {
  if (typeof path !== "string" || path.trim().length === 0) {
    throw new Error(message);
  }

  return resolve(path);
}

function ensurePathWithinRoot(
  rootDirectory: string,
  targetPath: string,
  message: string,
): void {
  const normalizedRoot = resolve(rootDirectory);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedRoot, normalizedTarget);

  if (
    relativePath.length === 0
      ? false
      : relativePath.startsWith("..") ||
        relativePath.includes("..\\") ||
        relativePath.includes("../")
  ) {
    throw new Error(message);
  }
}

function toRuntimeRelativePath(
  runtimeRootDirectory: string,
  targetPath: string,
): string {
  const normalizedRoot = resolve(runtimeRootDirectory);
  const normalizedTarget = resolve(targetPath);
  const relativePath = relative(normalizedRoot, normalizedTarget);

  ensurePathWithinRoot(
    normalizedRoot,
    normalizedTarget,
    "Path must stay within the Cybernomads runtime root.",
  );

  return `./${relativePath.split(sep).join("/")}`;
}

function assertNever(value: never): never {
  throw new Error(`Unsupported runtime resource type: ${String(value)}`);
}
