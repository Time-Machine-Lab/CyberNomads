import { readFile } from "node:fs/promises";
import { describe, expect, it } from "vitest";

import {
  listBundledRuntimeSkills,
  readRuntimeSkillFile,
} from "../../src/adapters/skill/local/runtime-skill-assets.js";
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

describe("runtime skill assets", () => {
  it("exposes the bundled Cybernomads task skills and their references", async () => {
    const skills = await listBundledRuntimeSkills();

    expect(skills.map((skill) => skill.name)).toEqual([
      "cybernomads-task-decomposition",
      "cybernomads-task-execution",
    ]);

    for (const skill of skills) {
      expect(skill.skillFile).toMatch(/SKILL\.md$/);
      expect(skill.openaiMetadataFile).toMatch(/openai\.yaml$/);
      expect(skill.referenceFiles.length).toBeGreaterThan(0);
      await expect(readRuntimeSkillFile(skill.skillFile)).resolves.toContain(
        `name: ${skill.name}`,
      );
    }
  });

  it("keeps skill assets free of provider-specific protocols and unsafe persistence details", async () => {
    const skills = await listBundledRuntimeSkills();
    const files = skills.flatMap((skill) => [
      skill.skillFile,
      ...(skill.openaiMetadataFile ? [skill.openaiMetadataFile] : []),
      ...skill.referenceFiles,
    ]);

    for (const file of files) {
      const source = await readFile(file, "utf8");
      expect(source).not.toMatch(/OpenClaw/i);
      expect(source).not.toMatch(/CREATE TABLE|INSERT INTO|UPDATE tasks/i);
    }
  });

  it("accepts a typical decomposition skill task-set shape in the task module", async () => {
    const taskStore = new InMemoryTaskStore([
      {
        trafficWorkId: "work-1",
        lifecycleStatus: "ready",
      },
    ]);
    const service = new TaskService({
      taskStore,
      createTaskId: createSequentialId("task"),
      now: () => new Date("2026-04-23T08:00:00.000Z"),
    });
    const taskSet = {
      source: {
        kind: "agent-decomposition" as const,
        description: "Typical growth workflow decomposition.",
      },
      tasks: [
        {
          taskKey: "search-candidate-videos",
          name: "Search candidate videos",
          instruction: "Search candidate videos and save candidate metadata.",
          documentRef: "search-candidate-videos.md",
          contextRef: "work/work-1/task/search-candidate-videos",
          condition: {
            cron: "0 */6 * * *",
            relyOnTaskKeys: [],
          },
          inputNeeds: [
            {
              name: "strategy-context",
              description: "Product and strategy context for relevance.",
              source: "traffic-work-context",
            },
          ],
        },
        {
          taskKey: "comment-on-prospects",
          name: "Find prospects and comment",
          instruction: "Use candidate videos to find prospects and comment.",
          documentRef: "comment-on-prospects.md",
          contextRef: "work/work-1/task/comment-on-prospects",
          condition: {
            cron: null,
            relyOnTaskKeys: ["search-candidate-videos"],
          },
          inputNeeds: [
            {
              name: "candidate-video-list",
              description: "Candidate videos produced by the search task.",
              source: "output:search-candidate-videos",
            },
          ],
        },
        {
          taskKey: "private-message-follow-up",
          name: "Private message follow-up",
          instruction: "Follow up with qualified prospects.",
          documentRef: "private-message-follow-up.md",
          contextRef: "work/work-1/task/private-message-follow-up",
          condition: {
            cron: "0 10 * * *",
            relyOnTaskKeys: ["comment-on-prospects"],
          },
          inputNeeds: [
            {
              name: "qualified-prospects",
              description: "Prospects qualified by previous interactions.",
              source: "output:comment-on-prospects",
            },
          ],
        },
      ],
    };

    const result = await service.createTaskSetForTrafficWork("work-1", taskSet);

    expect(result.taskCount).toBe(3);
    expect(result.tasks.map((task) => task.taskKey)).toEqual([
      "search-candidate-videos",
      "comment-on-prospects",
      "private-message-follow-up",
    ]);

    const commentTask = await service.getTaskDetail("task-2");
    expect(commentTask.condition.relyOnTaskIds).toEqual(["task-1"]);
    expect(commentTask.inputNeeds[0]?.source).toBe(
      "output:search-candidate-videos",
    );
  });
});

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
    const trafficWork = this.trafficWorks.get(trafficWorkId);
    return trafficWork ? { ...trafficWork } : undefined;
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<TaskRecord[]> {
    return Array.from(this.tasks.values())
      .filter((task) => {
        if (
          filters.trafficWorkId &&
          task.trafficWorkId !== filters.trafficWorkId
        ) {
          return false;
        }

        if (filters.status && task.status !== filters.status) {
          return false;
        }

        return true;
      })
      .map((task) => structuredClone(task));
  }

  async getTaskById(taskId: string): Promise<TaskRecord | undefined> {
    const task = this.tasks.get(taskId);
    return task ? structuredClone(task) : undefined;
  }

  async countTasksByTrafficWorkId(trafficWorkId: string): Promise<number> {
    return Array.from(this.tasks.values()).filter(
      (task) => task.trafficWorkId === trafficWorkId,
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
    for (const task of Array.from(this.tasks.values())) {
      if (task.trafficWorkId === trafficWorkId) {
        this.tasks.delete(task.taskId);
      }
    }

    await this.createTasks(records);
  }

  async saveTask(record: TaskRecord): Promise<void> {
    this.tasks.set(record.taskId, structuredClone(record));
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

function createSequentialId(prefix: string): () => string {
  let tick = 0;

  return () => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}
