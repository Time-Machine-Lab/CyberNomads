import { mkdir, writeFile } from "node:fs/promises";
import { dirname, join, relative, resolve, sep } from "node:path";

import type { TaskDecompositionArchiveStorePort } from "../../../ports/task-decomposition-archive-store-port.js";

export class FileSystemTaskDecompositionArchiveStore
  implements TaskDecompositionArchiveStorePort
{
  constructor(private readonly workRootDirectory: string) {}

  async writeTaskDocument(input: {
    trafficWorkId: string;
    documentRef: string;
    content: string;
  }): Promise<string> {
    const workDirectory = resolve(this.workRootDirectory, input.trafficWorkId);
    const targetPath = resolveWorkRelativePath(workDirectory, input.documentRef);
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.content, "utf8");
    return toWorkRelativePath(workDirectory, targetPath);
  }

  async writeRunArtifact(input: {
    trafficWorkId: string;
    decompositionRunId: string;
    fileName: string;
    content: string;
  }): Promise<string> {
    const workDirectory = resolve(this.workRootDirectory, input.trafficWorkId);
    const targetPath = resolveWorkRelativePath(
      workDirectory,
      join("decomposition-runs", input.decompositionRunId, input.fileName),
    );
    await mkdir(dirname(targetPath), { recursive: true });
    await writeFile(targetPath, input.content, "utf8");
    return toWorkRelativePath(workDirectory, targetPath);
  }
}

function resolveWorkRelativePath(
  workDirectory: string,
  relativePath: string,
): string {
  const normalizedRelativePath = relativePath
    .trim()
    .replace(/^[.][\\/]/, "");
  const targetPath = resolve(workDirectory, normalizedRelativePath);
  ensureWithinRoot(workDirectory, targetPath);
  return targetPath;
}

function toWorkRelativePath(workDirectory: string, targetPath: string): string {
  ensureWithinRoot(workDirectory, targetPath);
  return `./${relative(workDirectory, targetPath).split(sep).join("/")}`;
}

function ensureWithinRoot(root: string, targetPath: string): void {
  const relativePath = relative(resolve(root), resolve(targetPath));

  if (
    relativePath.startsWith("..") ||
    relativePath.includes("..\\") ||
    relativePath.includes("../")
  ) {
    throw new Error("Task decomposition archive path must stay within work context.");
  }
}
