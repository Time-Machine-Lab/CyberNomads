import { describe, expect, it } from "vitest";

import { ThreadTaskPlanner } from "../../src/app/thread-task-planner.js";
import type {
  ListTasksFilters,
  TaskCondition,
  TaskDetail,
  UpdateTaskStatusInput,
} from "../../src/modules/tasks/types.js";
import type {
  ListTrafficWorksFilters,
  TrafficWorkLifecycleStatus,
  TrafficWorkSummary,
} from "../../src/modules/traffic-works/types.js";
import type { TaskExecutionRequest } from "../../src/modules/agent-access/types.js";

describe("thread task planner", () => {
  it("scans running traffic works and ready tasks before dispatch", async () => {
    const harness = createPlannerHarness({
      trafficWorks: [
        createTrafficWork("work-running", "running"),
        createTrafficWork("work-ready", "ready"),
      ],
      tasks: [
        createTask("task-ready", {
          trafficWorkId: "work-running",
          status: "ready",
        }),
        createTask("task-running", {
          trafficWorkId: "work-running",
          status: "running",
        }),
        createTask("task-paused-work", {
          trafficWorkId: "work-ready",
          status: "ready",
        }),
      ],
    });

    const result = await harness.planner.tick();

    expect(result).toMatchObject({
      scannedTrafficWorks: 1,
      scannedTasks: 1,
      submittedTasks: 1,
      skippedTasks: 0,
      failedTasks: 0,
    });
    expect(harness.listTrafficWorksCalls).toEqual([
      {
        lifecycleStatus: "running",
      },
    ]);
    expect(harness.listTasksCalls).toEqual([
      {
        trafficWorkId: "work-running",
        status: "ready",
      },
    ]);
    expect(harness.submitRequests).toEqual([
      {
        taskId: "task-ready",
        title: "Task task-ready",
        contextDirectory: "work/work-running/task-ready",
        instructions: "Execute task-ready.",
      },
    ]);
    expect(harness.getTask("task-ready").status).toBe("running");
    expect(harness.getTask("task-running").status).toBe("running");
    expect(harness.getTask("task-paused-work").status).toBe("ready");
  });

  it("evaluates supported cron conditions and diagnoses unsupported cron syntax", async () => {
    const harness = createPlannerHarness({
      now: () => new Date("2026-04-23T08:10:00.000Z"),
      trafficWorks: [createTrafficWork("work-1", "running")],
      tasks: [
        createTask("task-due", {
          condition: {
            cron: "*/5 * * * *",
            relyOnTaskIds: [],
          },
        }),
        createTask("task-not-due", {
          condition: {
            cron: "15 * * * *",
            relyOnTaskIds: [],
          },
        }),
        createTask("task-unsupported", {
          condition: {
            cron: "0-10 * * * *",
            relyOnTaskIds: [],
          },
        }),
      ],
    });

    const result = await harness.planner.tick();

    expect(result.submittedTasks).toBe(1);
    expect(result.skippedTasks).toBe(2);
    expect(result.failedTasks).toBe(1);
    expect(harness.submitRequests.map((request) => request.taskId)).toEqual([
      "task-due",
    ]);
    expect(harness.getTask("task-not-due").status).toBe("ready");
    expect(harness.getTask("task-unsupported")).toMatchObject({
      status: "failed",
      statusReason: expect.stringContaining("Unsupported cron condition"),
    });
  });

  it("requires completed dependencies updated after the current task", async () => {
    const harness = createPlannerHarness({
      trafficWorks: [createTrafficWork("work-1", "running")],
      tasks: [
        createTask("dependency-fresh", {
          status: "completed",
          updatedAt: "2026-04-23T08:01:00.000Z",
        }),
        createTask("dependency-stale", {
          status: "completed",
          updatedAt: "2026-04-23T07:59:00.000Z",
        }),
        createTask("dependency-running", {
          status: "running",
          updatedAt: "2026-04-23T08:02:00.000Z",
        }),
        createTask("task-ready", {
          updatedAt: "2026-04-23T08:00:00.000Z",
          condition: {
            cron: null,
            relyOnTaskIds: ["dependency-fresh"],
          },
        }),
        createTask("task-stale", {
          updatedAt: "2026-04-23T08:00:00.000Z",
          condition: {
            cron: null,
            relyOnTaskIds: ["dependency-stale"],
          },
        }),
        createTask("task-waiting", {
          updatedAt: "2026-04-23T08:00:00.000Z",
          condition: {
            cron: null,
            relyOnTaskIds: ["dependency-running"],
          },
        }),
      ],
    });

    const result = await harness.planner.tick();

    expect(result.submittedTasks).toBe(1);
    expect(result.skippedTasks).toBe(2);
    expect(harness.submitRequests.map((request) => request.taskId)).toEqual([
      "task-ready",
    ]);
    expect(harness.getTask("task-stale").status).toBe("ready");
    expect(harness.getTask("task-waiting").status).toBe("ready");
  });

  it("fails tasks with unsupported condition shapes instead of blind submission", async () => {
    const harness = createPlannerHarness({
      trafficWorks: [createTrafficWork("work-1", "running")],
      tasks: [
        createTask("task-unsupported", {
          condition: {
            cron: null,
            relyOnTaskIds: [],
            after: "2026-04-23T08:00:00.000Z",
          } as unknown as TaskCondition,
        }),
      ],
    });

    const result = await harness.planner.tick();

    expect(result.submittedTasks).toBe(0);
    expect(result.failedTasks).toBe(1);
    expect(harness.submitRequests).toEqual([]);
    expect(harness.getTask("task-unsupported")).toMatchObject({
      status: "failed",
      statusReason: expect.stringContaining("unsupported fields"),
    });
  });

  it("does not start a duplicate submission while a tick is still active", async () => {
    const submitGate = createDeferred<void>();
    const harness = createPlannerHarness({
      submitGate,
      trafficWorks: [createTrafficWork("work-1", "running")],
      tasks: [createTask("task-1")],
    });

    const firstTick = harness.planner.tick();

    await waitFor(() => harness.submitRequests.length === 1);

    const secondTick = await harness.planner.tick();

    expect(secondTick.alreadyRunning).toBe(true);
    expect(harness.submitRequests).toHaveLength(1);

    submitGate.resolve();

    await expect(firstTick).resolves.toMatchObject({
      submittedTasks: 1,
    });
  });

  it("marks submission failures as observable failed tasks and does not retry", async () => {
    const harness = createPlannerHarness({
      submitFailure: new Error("agent unavailable"),
      trafficWorks: [createTrafficWork("work-1", "running")],
      tasks: [createTask("task-1")],
    });

    const firstResult = await harness.planner.tick();
    const secondResult = await harness.planner.tick();

    expect(firstResult).toMatchObject({
      submittedTasks: 0,
      failedTasks: 1,
    });
    expect(secondResult).toMatchObject({
      scannedTasks: 0,
      submittedTasks: 0,
      failedTasks: 0,
    });
    expect(harness.submitRequests).toHaveLength(1);
    expect(harness.getTask("task-1")).toMatchObject({
      status: "failed",
      statusReason: expect.stringContaining("agent unavailable"),
    });
  });
});

interface PlannerHarnessOptions {
  trafficWorks: TrafficWorkSummary[];
  tasks: TaskDetail[];
  submitFailure?: Error;
  submitGate?: Deferred<void>;
  now?: () => Date;
}

function createPlannerHarness(options: PlannerHarnessOptions) {
  const trafficWorks = options.trafficWorks.map(clone);
  const tasks = new Map(
    options.tasks.map((task) => [task.taskId, clone(task)] as const),
  );
  const listTrafficWorksCalls: ListTrafficWorksFilters[] = [];
  const listTasksCalls: ListTasksFilters[] = [];
  const updateTaskStatusCalls: Array<{
    taskId: string;
    input: UpdateTaskStatusInput;
  }> = [];
  const submitRequests: TaskExecutionRequest[] = [];
  const planner = new ThreadTaskPlanner({
    now: options.now,
    trafficWorkService: {
      async listTrafficWorks(filters: ListTrafficWorksFilters = {}) {
        listTrafficWorksCalls.push({ ...filters });

        return {
          items: trafficWorks
            .filter((trafficWork) =>
              filters.lifecycleStatus
                ? trafficWork.lifecycleStatus === filters.lifecycleStatus
                : true,
            )
            .map(clone),
        };
      },
    },
    taskService: {
      async listTasks(filters: ListTasksFilters = {}) {
        listTasksCalls.push({ ...filters });

        return {
          items: Array.from(tasks.values())
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
            .map((task) => ({
              taskId: task.taskId,
              trafficWorkId: task.trafficWorkId,
              name: task.name,
              status: task.status,
              condition: clone(task.condition),
              inputNeeds: task.inputNeeds.map(clone),
              updatedAt: task.updatedAt,
            })),
        };
      },
      async getTaskDetail(taskId: string) {
        const task = tasks.get(taskId);

        if (!task) {
          throw new Error(`Task "${taskId}" was not found.`);
        }

        return clone(task);
      },
      async updateTaskStatus(taskId: string, input: UpdateTaskStatusInput) {
        updateTaskStatusCalls.push({
          taskId,
          input: { ...input },
        });

        const task = tasks.get(taskId);

        if (!task) {
          throw new Error(`Task "${taskId}" was not found.`);
        }

        const updatedTask = {
          ...task,
          status: input.status,
          statusReason: input.statusReason ?? null,
          updatedAt: "2026-04-23T08:00:30.000Z",
        };
        tasks.set(taskId, updatedTask);
        return clone(updatedTask);
      },
    },
    agentAccessService: {
      async submitTaskExecutionRequest(request: TaskExecutionRequest) {
        submitRequests.push({ ...request });

        if (options.submitGate) {
          await options.submitGate.promise;
        }

        if (options.submitFailure) {
          throw options.submitFailure;
        }

        return {
          sessionId: `session-${request.taskId}`,
          executionId: `${request.taskId}:message-1`,
          outputText: "accepted",
          status: "completed",
          history: [],
        };
      },
    },
  });

  return {
    planner,
    listTrafficWorksCalls,
    listTasksCalls,
    updateTaskStatusCalls,
    submitRequests,
    getTask(taskId: string): TaskDetail {
      const task = tasks.get(taskId);

      if (!task) {
        throw new Error(`Task "${taskId}" was not found.`);
      }

      return clone(task);
    },
  };
}

function createTrafficWork(
  trafficWorkId: string,
  lifecycleStatus: TrafficWorkLifecycleStatus,
): TrafficWorkSummary {
  return {
    trafficWorkId,
    displayName: `Traffic work ${trafficWorkId}`,
    product: {
      productId: "product-1",
      name: "Product",
    },
    strategy: {
      strategyId: "strategy-1",
      name: "Strategy",
    },
    objectBindingCount: 1,
    lifecycleStatus,
    contextPreparationStatus: "prepared",
    updatedAt: "2026-04-23T08:00:00.000Z",
  };
}

function createTask(
  taskId: string,
  overrides: Partial<TaskDetail> = {},
): TaskDetail {
  const trafficWorkId = overrides.trafficWorkId ?? "work-1";

  return {
    taskId,
    trafficWorkId,
    name: `Task ${taskId}`,
    instruction: `Execute ${taskId}.`,
    documentRef: `${taskId}.md`,
    contextRef: `work/${trafficWorkId}/${taskId}`,
    condition: {
      cron: null,
      relyOnTaskIds: [],
    },
    inputNeeds: [],
    status: "ready",
    statusReason: null,
    createdAt: "2026-04-23T08:00:00.000Z",
    updatedAt: "2026-04-23T08:00:00.000Z",
    ...overrides,
  };
}

interface Deferred<T> {
  promise: Promise<T>;
  resolve(value: T): void;
  reject(error: Error): void;
}

function createDeferred<T>(): Deferred<T> {
  let resolveDeferred: (value: T) => void = () => {};
  let rejectDeferred: (error: Error) => void = () => {};
  const promise = new Promise<T>((resolve, reject) => {
    resolveDeferred = resolve;
    rejectDeferred = reject;
  });

  return {
    promise,
    resolve: resolveDeferred,
    reject: rejectDeferred,
  };
}

async function waitFor(predicate: () => boolean): Promise<void> {
  for (let attempt = 0; attempt < 50; attempt += 1) {
    if (predicate()) {
      return;
    }

    await new Promise((resolve) => setTimeout(resolve, 0));
  }

  throw new Error("Timed out waiting for predicate.");
}

function clone<T>(value: T): T {
  return structuredClone(value);
}
