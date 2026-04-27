import { readdir, readFile } from "node:fs/promises";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

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

describe("task service", () => {
  it("creates, replaces, updates, and records outputs for task sets", async () => {
    const taskStore = new InMemoryTaskStore([
      {
        trafficWorkId: "work-1",
        lifecycleStatus: "ready",
      },
    ]);
    const service = new TaskService({
      taskStore,
      now: createSequentialNow(),
      createTaskId: createSequentialId("task"),
      createOutputRecordId: createSequentialId("output"),
    });

    const createdTaskSet = await service.createTaskSetForTrafficWork("work-1", {
      source: {
        kind: "agent-decomposition",
      },
      tasks: [
        createTaskDraft("collect", "Collect candidates", []),
        createTaskDraft("comment", "Comment candidates", ["collect"]),
      ],
    });

    expect(createdTaskSet).toEqual({
      trafficWorkId: "work-1",
      taskCount: 2,
      tasks: [
        {
          taskKey: "collect",
          taskId: "task-1",
        },
        {
          taskKey: "comment",
          taskId: "task-2",
        },
      ],
    });

    const listed = await service.listTasks({ trafficWorkId: "work-1" });
    expect(listed.items).toHaveLength(2);
    expect(listed.items.map((item) => item.status)).toEqual(["ready", "ready"]);

    const commentTask = await service.getTaskDetail("task-2");
    expect(commentTask.condition.relyOnTaskIds).toEqual(["task-1"]);
    expect(commentTask.inputPrompt).toBe(
      "Read upstream task data from ./data/collect.json and use it as execution input.",
    );

    await expect(
      service.createTaskSetForTrafficWork("work-1", {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [createTaskDraft("duplicate", "Duplicate", [])],
      }),
    ).rejects.toMatchObject({
      code: "TASK_OPERATION_NOT_ALLOWED",
    });

    const replacedTaskSet = await service.replaceTaskSetForTrafficWork(
      "work-1",
      {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [createTaskDraft("refresh", "Refresh candidates", [])],
      },
    );
    expect(replacedTaskSet.tasks).toEqual([
      {
        taskKey: "refresh",
        taskId: "task-3",
      },
    ]);

    await expect(service.getTaskDetail("task-1")).rejects.toMatchObject({
      code: "TASK_NOT_FOUND",
    });

    const runningTask = await service.updateTaskStatus("task-3", {
      status: "running",
      statusReason: "Planner submitted the task.",
    });
    expect(runningTask.status).toBe("running");
    expect(runningTask.statusReason).toBe("Planner submitted the task.");

    await expect(
      service.updateTaskStatus("task-3", {
        status: "blocked",
      } as never),
    ).rejects.toMatchObject({
      code: "TASK_VALIDATION_FAILED",
    });

    const output = await service.createTaskOutputRecord("task-3", {
      description: "Candidate video list",
      dataLocation: "work/work-1/task-data/candidates.json",
    });
    expect(output).toMatchObject({
      outputRecordId: "output-1",
      taskId: "task-3",
      description: "Candidate video list",
    });

    await expect(service.listTaskOutputRecords("task-3")).resolves.toEqual({
      items: [output],
    });
  });

  it("rejects invalid task sets and running-work replacement", async () => {
    const taskStore = new InMemoryTaskStore([
      {
        trafficWorkId: "work-1",
        lifecycleStatus: "running",
      },
      {
        trafficWorkId: "work-2",
        lifecycleStatus: "ready",
      },
    ]);
    const service = new TaskService({
      taskStore,
      createTaskId: createSequentialId("task"),
    });

    await expect(
      service.createTaskSetForTrafficWork("missing-work", {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [createTaskDraft("collect", "Collect candidates", [])],
      }),
    ).rejects.toMatchObject({
      code: "TASK_TRAFFIC_WORK_NOT_FOUND",
    });

    await expect(
      service.replaceTaskSetForTrafficWork("work-1", {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [createTaskDraft("collect", "Collect candidates", [])],
      }),
    ).rejects.toMatchObject({
      code: "TASK_OPERATION_NOT_ALLOWED",
    });

    await expect(
      service.createTaskSetForTrafficWork("work-2", {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [createTaskDraft("comment", "Comment candidates", ["collect"])],
      }),
    ).rejects.toMatchObject({
      code: "TASK_VALIDATION_FAILED",
      details: {
        issues: [
          {
            path: "tasks[0].condition.relyOnTaskKeys[0]",
            message:
              'Task dependency "collect" does not exist in the task set.',
          },
        ],
      },
    });
  });

  it("allows an empty input prompt for tasks without prior input", async () => {
    const taskStore = new InMemoryTaskStore([
      {
        trafficWorkId: "work-1",
        lifecycleStatus: "ready",
      },
    ]);
    const service = new TaskService({
      taskStore,
      createTaskId: createSequentialId("task"),
    });

    await service.createTaskSetForTrafficWork("work-1", {
      source: {
        kind: "agent-decomposition",
      },
      tasks: [
        {
          ...createTaskDraft("scan-messages", "Scan private messages", []),
          contextRef: "./",
          inputPrompt: "",
        },
      ],
    });

    await expect(service.getTaskDetail("task-1")).resolves.toMatchObject({
      contextRef: "./",
      inputPrompt: "",
    });
  });

  it("rejects non-string input prompts", async () => {
    const taskStore = new InMemoryTaskStore([
      {
        trafficWorkId: "work-1",
        lifecycleStatus: "ready",
      },
    ]);
    const service = new TaskService({
      taskStore,
      createTaskId: createSequentialId("task"),
    });

    await expect(
      service.createTaskSetForTrafficWork("work-1", {
        source: {
          kind: "agent-decomposition",
        },
        tasks: [
          {
            ...createTaskDraft("broken", "Broken task", []),
            inputPrompt: null,
          } as never,
        ],
      }),
    ).rejects.toMatchObject({
      code: "TASK_VALIDATION_FAILED",
      details: {
        issues: [
          {
            path: "tasks[0].inputPrompt",
            message: "Task inputPrompt must be a string.",
          },
        ],
      },
    });
  });

  it("keeps task module boundaries free from Agent provider and platform adapters", async () => {
    const taskModuleFiles = await listTypeScriptFiles(
      join(process.cwd(), "src", "modules", "tasks"),
    );
    const filesToCheck = [
      ...taskModuleFiles,
      join(process.cwd(), "src", "ports", "task-store-port.ts"),
    ];

    for (const filePath of filesToCheck) {
      const source = await readFile(filePath, "utf8");
      expect(source).not.toMatch(/adapters\/agent|agent-provider/i);
      expect(source).not.toMatch(/adapters\/platform|bilibili/i);
      expect(source).not.toMatch(/TrafficWorkService/);
    }
  });
});

class InMemoryTaskStore implements TaskStorePort {
  private readonly trafficWorks = new Map<string, TaskTrafficWorkState>();
  private readonly tasks = new Map<string, TaskRecord>();
  private readonly outputs = new Map<string, TaskOutputRecord[]>();

  constructor(trafficWorks: TaskTrafficWorkState[]) {
    for (const trafficWork of trafficWorks) {
      this.trafficWorks.set(trafficWork.trafficWorkId, {
        ...trafficWork,
      });
    }
  }

  async getTrafficWorkState(
    trafficWorkId: string,
  ): Promise<TaskTrafficWorkState | undefined> {
    const trafficWork = this.trafficWorks.get(trafficWorkId);
    return trafficWork ? { ...trafficWork } : undefined;
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values())
      .filter((record) => {
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
      })
      .map(cloneTaskRecord);
  }

  async getTaskById(taskId: string): Promise<TaskRecord | undefined> {
    const record = this.tasks.get(taskId);
    return record ? cloneTaskRecord(record) : undefined;
  }

  async countTasksByTrafficWorkId(trafficWorkId: string): Promise<number> {
    return Array.from(this.tasks.values()).filter(
      (record) => record.trafficWorkId === trafficWorkId,
    ).length;
  }

  async createTasks(records: TaskRecord[]): Promise<void> {
    for (const record of records) {
      this.tasks.set(record.taskId, cloneTaskRecord(record));
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
    this.tasks.set(record.taskId, cloneTaskRecord(record));
  }

  async createTaskOutputRecord(record: TaskOutputRecord): Promise<void> {
    const outputs = this.outputs.get(record.taskId) ?? [];
    outputs.push({ ...record });
    this.outputs.set(record.taskId, outputs);
  }

  async listTaskOutputRecords(taskId: string): Promise<TaskOutputRecord[]> {
    return [...(this.outputs.get(taskId) ?? [])].map((record) => ({
      ...record,
    }));
  }

  close(): void {}
}

function createTaskDraft(
  taskKey: string,
  name: string,
  relyOnTaskKeys: string[],
) {
  return {
    taskKey,
    name,
    instruction: `${name} instruction.`,
    documentRef: `${taskKey}.md`,
    contextRef: `work/work-1/${taskKey}`,
    condition: {
      cron: null,
      relyOnTaskKeys,
    },
    inputPrompt:
      "Read upstream task data from ./data/collect.json and use it as execution input.",
  };
}

function cloneTaskRecord(record: TaskRecord): TaskRecord {
  return structuredClone(record);
}

function createSequentialId(prefix: string): () => string {
  let tick = 0;

  return () => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}

function createSequentialNow(): () => Date {
  let tick = 0;

  return () => {
    const date = new Date(Date.UTC(2026, 3, 23, 8, 0, tick));
    tick += 1;
    return date;
  };
}

async function listTypeScriptFiles(directory: string): Promise<string[]> {
  const entries = await readdir(directory, { withFileTypes: true });
  const files: string[] = [];

  for (const entry of entries) {
    const entryPath = join(directory, entry.name);

    if (entry.isDirectory()) {
      files.push(...(await listTypeScriptFiles(entryPath)));
      continue;
    }

    if (entry.isFile() && entry.name.endsWith(".ts")) {
      files.push(entryPath);
    }
  }

  return files;
}
