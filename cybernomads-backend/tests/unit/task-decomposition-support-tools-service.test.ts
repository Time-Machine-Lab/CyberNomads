import { mkdtemp, mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { tmpdir } from "node:os";
import { join } from "node:path";
import { afterAll, describe, expect, it } from "vitest";

import { FileSystemRuntimeAgentResourceStore } from "../../src/adapters/storage/file-system/runtime-agent-resource-store.js";
import { TaskDecompositionSupportToolsService } from "../../src/modules/task-decomposition-support-tools/service.js";
import { TaskService } from "../../src/modules/tasks/service.js";
import type {
  ListTasksFilters,
  TaskOutputRecord,
  TaskRecord,
} from "../../src/modules/tasks/types.js";
import type {
  TaskStorePort,
  TaskTrafficWorkState,
} from "../../src/ports/task-store-port.js";
import type { TrafficWorkStateStore } from "../../src/ports/traffic-work-state-store-port.js";
import type { TrafficWorkContextStore } from "../../src/ports/traffic-work-context-store-port.js";
import type { TrafficWorkRecord } from "../../src/modules/traffic-works/types.js";

describe("task decomposition support tools service", () => {
  const temporaryDirectories: string[] = [];

  afterAll(async () => {
    await Promise.all(
      temporaryDirectories.map((directory) =>
        rm(directory, { recursive: true, force: true }),
      ),
    );
  });

  it("copies runtime skill and knowledge assets into the controlled work context", async () => {
    const runtimeRoot = await mkdtemp(join(tmpdir(), "cybernomads-tools-"));
    temporaryDirectories.push(runtimeRoot);

    const agentSkillsDirectory = join(runtimeRoot, "agent", "skills");
    const agentKnowledgeDirectory = join(runtimeRoot, "agent", "knowledge");
    const workDirectory = join(runtimeRoot, "work");
    await mkdir(join(agentSkillsDirectory, "bilibili-web-api"), {
      recursive: true,
    });
    await mkdir(agentKnowledgeDirectory, { recursive: true });
    await writeFile(
      join(agentSkillsDirectory, "bilibili-web-api", "SKILL.md"),
      "# skill",
      "utf8",
    );
    await writeFile(
      join(agentKnowledgeDirectory, "Agent资源清单.md"),
      "# catalog",
      "utf8",
    );

    const service = createSupportToolsService({
      trafficWorks: [{ trafficWorkId: "work-1" }],
      contextStore: new InMemoryTrafficWorkContextStore(workDirectory),
      runtimeAgentResourceStore: new FileSystemRuntimeAgentResourceStore({
        runtimePaths: {
          runtimeRoot,
          agentSkillsDirectory,
          agentKnowledgeDirectory,
        },
      }),
    });

    const copiedSkill = await service.copyRuntimeAgentResource({
      trafficWorkId: "work-1",
      resourceType: "skill",
      resourcePath: "bilibili-web-api",
    });
    expect(copiedSkill.targetRuntimeRelativePath).toBe(
      "./work/work-1/skills/bilibili-web-api",
    );
    await expect(
      readFile(
        join(workDirectory, "work-1", "skills", "bilibili-web-api", "SKILL.md"),
        "utf8",
      ),
    ).resolves.toBe("# skill");

    const copiedKnowledge = await service.copyRuntimeAgentResource({
      trafficWorkId: "work-1",
      resourceType: "knowledge",
      resourcePath: "Agent资源清单.md",
    });
    expect(copiedKnowledge.targetRuntimeRelativePath).toBe(
      "./work/work-1/knowledge/Agent资源清单.md",
    );
    await expect(
      readFile(
        join(workDirectory, "work-1", "knowledge", "Agent资源清单.md"),
        "utf8",
      ),
    ).resolves.toBe("# catalog");
  });

  it("rejects boundary violations and returns explicit task validation details", async () => {
    const runtimeRoot = await mkdtemp(join(tmpdir(), "cybernomads-tools-"));
    temporaryDirectories.push(runtimeRoot);

    const agentSkillsDirectory = join(runtimeRoot, "agent", "skills");
    const agentKnowledgeDirectory = join(runtimeRoot, "agent", "knowledge");
    const workDirectory = join(runtimeRoot, "work");
    await mkdir(agentSkillsDirectory, { recursive: true });
    await mkdir(agentKnowledgeDirectory, { recursive: true });

    const service = createSupportToolsService({
      trafficWorks: [{ trafficWorkId: "work-1" }],
      contextStore: new InMemoryTrafficWorkContextStore(workDirectory),
      runtimeAgentResourceStore: new FileSystemRuntimeAgentResourceStore({
        runtimePaths: {
          runtimeRoot,
          agentSkillsDirectory,
          agentKnowledgeDirectory,
        },
      }),
    });

    await expect(
      service.copyRuntimeAgentResource({
        trafficWorkId: "work-1",
        resourceType: "skill",
        resourcePath: "../outside",
      }),
    ).rejects.toMatchObject({
      code: "TASK_DECOMPOSITION_TOOL_BOUNDARY_VIOLATION",
    });

    await expect(
      service.batchSaveTasks({
        trafficWorkId: "work-1",
        mode: "create",
        taskSet: {
          source: {
            kind: "agent-decomposition",
          },
          tasks: [
            {
              taskKey: "collect",
              name: "Collect",
              instruction: "Collect candidates.",
              documentRef: "collect.md",
              contextRef: "",
              condition: {
                cron: null,
                relyOnTaskKeys: [],
              },
              inputNeeds: [],
            },
          ],
        },
      }),
    ).rejects.toMatchObject({
      code: "TASK_VALIDATION_FAILED",
      details: {
        issues: [
          {
            path: "tasks[0].contextRef",
            message: "Task contextRef is required.",
          },
        ],
      },
    });
  });
});

function createSupportToolsService(input: {
  trafficWorks: Array<{ trafficWorkId: string }>;
  contextStore: TrafficWorkContextStore;
  runtimeAgentResourceStore: FileSystemRuntimeAgentResourceStore;
}) {
  const taskStore = new InMemoryTaskStore(
    input.trafficWorks.map((trafficWork) => ({
      trafficWorkId: trafficWork.trafficWorkId,
      lifecycleStatus: "ready",
    })),
  );
  const taskService = new TaskService({
    taskStore,
    createTaskId: createSequentialId("task"),
  });

  return new TaskDecompositionSupportToolsService({
    trafficWorkStateStore: new InMemoryTrafficWorkStateStore(
      input.trafficWorks,
    ),
    trafficWorkContextStore: input.contextStore,
    runtimeAgentResourceStore: input.runtimeAgentResourceStore,
    taskService,
  });
}

class InMemoryTrafficWorkStateStore implements Pick<
  TrafficWorkStateStore,
  "getTrafficWorkById"
> {
  private readonly trafficWorks = new Map<string, TrafficWorkRecord>();

  constructor(trafficWorks: Array<{ trafficWorkId: string }>) {
    for (const trafficWork of trafficWorks) {
      this.trafficWorks.set(trafficWork.trafficWorkId, {
        trafficWorkId: trafficWork.trafficWorkId,
        displayName: trafficWork.trafficWorkId,
        productId: "product-1",
        strategyId: "strategy-1",
        objectBindings: [],
        lifecycleStatus: "ready",
        lifecycleStatusReason: null,
        contextPreparationStatus: "prepared",
        contextPreparationStatusReason: null,
        contextPreparedAt: null,
        lastStartedAt: null,
        endedAt: null,
        archivedAt: null,
        deletedAt: null,
        createdAt: "2026-04-25T08:00:00.000Z",
        updatedAt: "2026-04-25T08:00:00.000Z",
      });
    }
  }

  async getTrafficWorkById(
    trafficWorkId: string,
  ): Promise<TrafficWorkRecord | undefined> {
    const trafficWork = this.trafficWorks.get(trafficWorkId);
    return trafficWork ? structuredClone(trafficWork) : undefined;
  }
}

class InMemoryTrafficWorkContextStore implements TrafficWorkContextStore {
  constructor(private readonly workRootDirectory: string) {}

  async ensureWorkContext(trafficWorkId: string) {
    const workContextRoot = join(this.workRootDirectory, trafficWorkId);
    const skillsDirectory = join(workContextRoot, "skills");
    const toolsDirectory = join(workContextRoot, "tools");
    const knowledgeDirectory = join(workContextRoot, "knowledge");
    const dataDirectory = join(workContextRoot, "data");

    await mkdir(skillsDirectory, { recursive: true });
    await mkdir(toolsDirectory, { recursive: true });
    await mkdir(knowledgeDirectory, { recursive: true });
    await mkdir(dataDirectory, { recursive: true });

    return {
      workDirectory: workContextRoot,
      skillsDirectory,
      toolsDirectory,
      knowledgeDirectory,
      dataDirectory,
    };
  }
}

class InMemoryTaskStore implements TaskStorePort {
  private readonly trafficWorks = new Map<string, TaskTrafficWorkState>();
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly outputs = new Map<string, TaskOutputRecord[]>();

  constructor(trafficWorks: TaskTrafficWorkState[]) {
    for (const trafficWork of trafficWorks) {
      this.trafficWorks.set(trafficWork.trafficWorkId, { ...trafficWork });
    }
  }

  async getTrafficWorkState(
    trafficWorkId: string,
  ): Promise<TaskTrafficWorkState | undefined> {
    return this.trafficWorks.get(trafficWorkId);
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values()).filter((record) => {
      if (
        filters.trafficWorkId &&
        record.trafficWorkId !== filters.trafficWorkId
      ) {
        return false;
      }

      if (filters.status && record.status !== filters.status) {
        return false;
      }

      return true;
    });
  }

  async getTaskById(taskId: string): Promise<TaskRecord | undefined> {
    return this.tasks.get(taskId);
  }

  async countTasksByTrafficWorkId(trafficWorkId: string): Promise<number> {
    return Array.from(this.tasks.values()).filter(
      (record) => record.trafficWorkId === trafficWorkId,
    ).length;
  }

  async createTasks(records: TaskRecord[]): Promise<void> {
    for (const record of records) {
      this.tasks.set(record.taskId, structuredClone(record));
    }
  }

  async replaceTasksForTrafficWork(
    trafficWorkId: string,
    records: TaskRecord[],
  ): Promise<void> {
    for (const record of Array.from(this.tasks.values())) {
      if (record.trafficWorkId === trafficWorkId) {
        this.tasks.delete(record.taskId);
        this.outputs.delete(record.taskId);
      }
    }

    await this.createTasks(records);
  }

  async saveTask(record: TaskRecord): Promise<void> {
    this.tasks.set(record.taskId, structuredClone(record));
  }

  async createTaskOutputRecord(record: TaskOutputRecord): Promise<void> {
    const items = this.outputs.get(record.taskId) ?? [];
    items.push(structuredClone(record));
    this.outputs.set(record.taskId, items);
  }

  async listTaskOutputRecords(taskId: string): Promise<TaskOutputRecord[]> {
    return (this.outputs.get(taskId) ?? []).map((record) =>
      structuredClone(record),
    );
  }

  close(): void {}
}

function createSequentialId(prefix: string): () => string {
  let tick = 0;

  return () => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}
