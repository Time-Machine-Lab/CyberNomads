import { mkdir } from "node:fs/promises";
import { join } from "node:path";

import type { TrafficWorkContextStore } from "../../../ports/traffic-work-context-store-port.js";
import type { TrafficWorkContextSnapshot } from "../../../modules/traffic-works/types.js";

export class FileSystemTrafficWorkContextStore implements TrafficWorkContextStore {
  constructor(private readonly workRootDirectory: string) {}

  async ensureWorkContext(
    trafficWorkId: string,
  ): Promise<TrafficWorkContextSnapshot> {
    const workDirectory = join(this.workRootDirectory, trafficWorkId);
    const skillsDirectory = join(workDirectory, "skills");
    const toolsDirectory = join(workDirectory, "tools");
    const knowledgeDirectory = join(workDirectory, "knowledge");
    const dataDirectory = join(workDirectory, "data");

    await mkdir(workDirectory, { recursive: true });
    await mkdir(skillsDirectory, { recursive: true });
    await mkdir(toolsDirectory, { recursive: true });
    await mkdir(knowledgeDirectory, { recursive: true });
    await mkdir(dataDirectory, { recursive: true });

    return {
      workDirectory,
      skillsDirectory,
      toolsDirectory,
      knowledgeDirectory,
      dataDirectory,
    };
  }
}
