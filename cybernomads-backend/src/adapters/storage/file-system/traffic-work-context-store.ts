import { mkdir, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { TrafficWorkContextStore } from "../../../ports/traffic-work-context-store-port.js";
import type { TrafficWorkContextSnapshot } from "../../../modules/traffic-works/types.js";

export class FileSystemTrafficWorkContextStore implements TrafficWorkContextStore {
  constructor(private readonly workRootDirectory: string) {}

  async writeTaskContext(
    trafficWorkId: string,
    taskMarkdown: string,
  ): Promise<TrafficWorkContextSnapshot> {
    const workDirectory = join(this.workRootDirectory, trafficWorkId);
    const scriptsDirectory = join(workDirectory, "scripts");
    const taskFilePath = join(workDirectory, "task.md");

    await mkdir(workDirectory, { recursive: true });
    await mkdir(scriptsDirectory, { recursive: true });
    await writeFile(taskFilePath, taskMarkdown, "utf8");

    return {
      workDirectory,
      taskFilePath,
      taskMarkdown,
    };
  }
}
