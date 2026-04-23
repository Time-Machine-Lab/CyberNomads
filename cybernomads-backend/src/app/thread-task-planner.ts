import type { AgentAccessService } from "../modules/agent-access/service.js";
import type { TaskService } from "../modules/tasks/service.js";
import type { TaskCondition, TaskDetail } from "../modules/tasks/types.js";
import type { TrafficWorkService } from "../modules/traffic-works/service.js";

type TimerHandle = ReturnType<typeof setInterval>;

export interface ThreadTaskPlannerOptions {
  taskService: Pick<
    TaskService,
    "getTaskDetail" | "listTasks" | "updateTaskStatus"
  >;
  trafficWorkService: Pick<TrafficWorkService, "listTrafficWorks">;
  agentAccessService: Pick<AgentAccessService, "submitTaskExecutionRequest">;
  intervalMs?: number;
  now?: () => Date;
}

export interface ThreadTaskPlannerTickResult {
  scannedTrafficWorks: number;
  scannedTasks: number;
  submittedTasks: number;
  skippedTasks: number;
  failedTasks: number;
  alreadyRunning: boolean;
  diagnostics: string[];
}

type ConditionEvaluation =
  | {
      executable: true;
    }
  | {
      executable: false;
      diagnostic?: string;
    };

const DEFAULT_INTERVAL_MS = 1_000;

export class ThreadTaskPlanner {
  private readonly intervalMs: number;
  private readonly now: () => Date;
  private timer: TimerHandle | null = null;
  private activeTick: Promise<ThreadTaskPlannerTickResult> | null = null;

  constructor(private readonly options: ThreadTaskPlannerOptions) {
    this.intervalMs = options.intervalMs ?? DEFAULT_INTERVAL_MS;
    this.now = options.now ?? (() => new Date());

    if (!Number.isInteger(this.intervalMs) || this.intervalMs <= 0) {
      throw new Error(
        "Thread task planner intervalMs must be a positive integer.",
      );
    }
  }

  get isStarted(): boolean {
    return this.timer !== null;
  }

  start(): void {
    if (this.timer) {
      return;
    }

    this.timer = setInterval(() => {
      void this.tick();
    }, this.intervalMs);

    void this.tick();
  }

  async stop(): Promise<void> {
    if (this.timer) {
      clearInterval(this.timer);
      this.timer = null;
    }

    const activeTick = this.activeTick;

    if (activeTick) {
      await activeTick;
    }
  }

  async tick(): Promise<ThreadTaskPlannerTickResult> {
    if (this.activeTick) {
      return createTickResult({
        alreadyRunning: true,
        diagnostics: [
          "Skipped tick because a previous planner tick is still running.",
        ],
      });
    }

    const activeTick = this.runTick().catch((error: unknown) =>
      createTickResult({
        diagnostics: [
          toFailureReason("Thread task planner tick failed", error),
        ],
      }),
    );
    this.activeTick = activeTick;

    try {
      return await activeTick;
    } finally {
      if (this.activeTick === activeTick) {
        this.activeTick = null;
      }
    }
  }

  private async runTick(): Promise<ThreadTaskPlannerTickResult> {
    const result = createTickResult();
    const trafficWorks = await this.options.trafficWorkService.listTrafficWorks(
      {
        lifecycleStatus: "running",
      },
    );
    result.scannedTrafficWorks = trafficWorks.items.length;

    for (const trafficWork of trafficWorks.items) {
      const tasks = await this.options.taskService.listTasks({
        trafficWorkId: trafficWork.trafficWorkId,
        status: "ready",
      });
      result.scannedTasks += tasks.items.length;

      for (const task of tasks.items) {
        await this.evaluateAndMaybeDispatchTask(task.taskId, result);
      }
    }

    return result;
  }

  private async evaluateAndMaybeDispatchTask(
    taskId: string,
    result: ThreadTaskPlannerTickResult,
  ): Promise<void> {
    let task: TaskDetail;

    try {
      task = await this.options.taskService.getTaskDetail(taskId);
    } catch (error) {
      result.failedTasks += 1;
      result.diagnostics.push(
        toFailureReason("Task detail loading failed", error),
      );
      return;
    }

    if (task.status !== "ready") {
      result.skippedTasks += 1;
      return;
    }

    const evaluation = await this.evaluateConditions(task);

    if (!evaluation.executable) {
      result.skippedTasks += 1;

      if (evaluation.diagnostic) {
        await this.failTask(task.taskId, evaluation.diagnostic, result);
      }

      return;
    }

    await this.dispatchTask(task, result);
  }

  private async evaluateConditions(
    task: TaskDetail,
  ): Promise<ConditionEvaluation> {
    const condition = validateTaskCondition(task.condition);

    if (!condition.valid) {
      return {
        executable: false,
        diagnostic: condition.reason,
      };
    }

    const cronEvaluation = evaluateCron(condition.value.cron, this.now());

    if (cronEvaluation.diagnostic) {
      return {
        executable: false,
        diagnostic: cronEvaluation.diagnostic,
      };
    }

    if (!cronEvaluation.due) {
      return {
        executable: false,
      };
    }

    return this.evaluateDependencies(task, condition.value.relyOnTaskIds);
  }

  private async evaluateDependencies(
    task: TaskDetail,
    relyOnTaskIds: string[],
  ): Promise<ConditionEvaluation> {
    if (relyOnTaskIds.length === 0) {
      return {
        executable: true,
      };
    }

    const taskUpdatedAt = Date.parse(task.updatedAt);

    if (Number.isNaN(taskUpdatedAt)) {
      return {
        executable: false,
        diagnostic: `Task "${task.taskId}" has an invalid updatedAt timestamp.`,
      };
    }

    for (const dependencyTaskId of relyOnTaskIds) {
      let dependency: TaskDetail;

      try {
        dependency =
          await this.options.taskService.getTaskDetail(dependencyTaskId);
      } catch (error) {
        return {
          executable: false,
          diagnostic: toFailureReason(
            `Dependency task "${dependencyTaskId}" loading failed`,
            error,
          ),
        };
      }

      if (dependency.status !== "completed") {
        return {
          executable: false,
        };
      }

      const dependencyUpdatedAt = Date.parse(dependency.updatedAt);

      if (Number.isNaN(dependencyUpdatedAt)) {
        return {
          executable: false,
          diagnostic: `Dependency task "${dependency.taskId}" has an invalid updatedAt timestamp.`,
        };
      }

      if (dependencyUpdatedAt <= taskUpdatedAt) {
        return {
          executable: false,
        };
      }
    }

    return {
      executable: true,
    };
  }

  private async dispatchTask(
    task: TaskDetail,
    result: ThreadTaskPlannerTickResult,
  ): Promise<void> {
    try {
      await this.options.taskService.updateTaskStatus(task.taskId, {
        status: "running",
        statusReason:
          "Thread task planner submitted this task for Agent execution.",
      });
      await this.options.agentAccessService.submitTaskExecutionRequest({
        taskId: task.taskId,
        title: task.name,
        contextDirectory: task.contextRef,
        instructions: task.instruction,
      });
      result.submittedTasks += 1;
    } catch (error) {
      await this.failTask(
        task.taskId,
        toFailureReason("Task submission failed", error),
        result,
      );
    }
  }

  private async failTask(
    taskId: string,
    reason: string,
    result: ThreadTaskPlannerTickResult,
  ): Promise<void> {
    result.failedTasks += 1;
    result.diagnostics.push(reason);

    await this.options.taskService.updateTaskStatus(taskId, {
      status: "failed",
      statusReason: reason,
    });
  }
}

function createTickResult(
  overrides: Partial<ThreadTaskPlannerTickResult> = {},
): ThreadTaskPlannerTickResult {
  return {
    scannedTrafficWorks: 0,
    scannedTasks: 0,
    submittedTasks: 0,
    skippedTasks: 0,
    failedTasks: 0,
    alreadyRunning: false,
    diagnostics: [],
    ...overrides,
  };
}

function validateTaskCondition(condition: TaskCondition):
  | {
      valid: true;
      value: TaskCondition;
    }
  | {
      valid: false;
      reason: string;
    } {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    return {
      valid: false,
      reason: "Task condition shape is unsupported.",
    };
  }

  const conditionKeys = Object.keys(condition).sort();

  if (conditionKeys.join(",") !== "cron,relyOnTaskIds") {
    return {
      valid: false,
      reason: `Task condition contains unsupported fields: ${conditionKeys.join(",")}.`,
    };
  }

  if (condition.cron !== null && typeof condition.cron !== "string") {
    return {
      valid: false,
      reason: "Task condition cron must be a string or null.",
    };
  }

  if (
    !Array.isArray(condition.relyOnTaskIds) ||
    !condition.relyOnTaskIds.every((taskId) => typeof taskId === "string")
  ) {
    return {
      valid: false,
      reason: "Task condition relyOnTaskIds must be an array of task IDs.",
    };
  }

  return {
    valid: true,
    value: condition,
  };
}

function evaluateCron(
  cron: string | null,
  now: Date,
): {
  due: boolean;
  diagnostic?: string;
} {
  if (!cron) {
    return {
      due: true,
    };
  }

  const normalizedCron = cron.trim();

  if (normalizedCron === "@always") {
    return {
      due: true,
    };
  }

  const fields = normalizedCron.split(/\s+/);

  if (fields.length !== 5) {
    return {
      due: false,
      diagnostic: `Unsupported cron condition "${cron}".`,
    };
  }

  const checks = [
    matchesCronField(fields[0] ?? "", now.getUTCMinutes(), 0, 59),
    matchesCronField(fields[1] ?? "", now.getUTCHours(), 0, 23),
    matchesCronField(fields[2] ?? "", now.getUTCDate(), 1, 31),
    matchesCronField(fields[3] ?? "", now.getUTCMonth() + 1, 1, 12),
    matchesCronField(fields[4] ?? "", now.getUTCDay(), 0, 6),
  ];
  const unsupportedCheck = checks.find((check) => check.diagnostic);

  if (unsupportedCheck?.diagnostic) {
    return {
      due: false,
      diagnostic: `Unsupported cron condition "${cron}".`,
    };
  }

  return {
    due: checks.every((check) => check.matches),
  };
}

function matchesCronField(
  field: string,
  value: number,
  minimum: number,
  maximum: number,
):
  | {
      matches: true;
      diagnostic?: never;
    }
  | {
      matches: false;
      diagnostic?: string;
    } {
  if (field === "*") {
    return {
      matches: true,
    };
  }

  const stepMatch = /^\*\/(\d+)$/.exec(field);

  if (stepMatch?.[1]) {
    const step = Number.parseInt(stepMatch[1], 10);

    if (step <= 0) {
      return {
        matches: false,
        diagnostic: "Cron step must be greater than zero.",
      };
    }

    return {
      matches: value % step === 0,
    };
  }

  if (/^\d+$/.test(field)) {
    const expectedValue = Number.parseInt(field, 10);

    if (expectedValue < minimum || expectedValue > maximum) {
      return {
        matches: false,
        diagnostic: "Cron field is outside the supported range.",
      };
    }

    return {
      matches: expectedValue === value,
    };
  }

  return {
    matches: false,
    diagnostic: "Cron field syntax is unsupported.",
  };
}

function toFailureReason(prefix: string, error: unknown): string {
  if (error instanceof Error) {
    return `${prefix}: ${error.message}`;
  }

  return `${prefix}.`;
}
