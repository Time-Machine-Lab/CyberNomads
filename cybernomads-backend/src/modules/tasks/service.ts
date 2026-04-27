import { randomUUID } from "node:crypto";

import type { TaskStorePort } from "../../ports/task-store-port.js";
import {
  TaskNotFoundError,
  TaskOperationConflictError,
  TaskTrafficWorkNotFoundError,
  TaskValidationError,
  type TaskValidationIssue,
} from "./errors.js";
import type {
  CreateTaskOutputRecordInput,
  ListTaskOutputRecordsResult,
  ListTasksFilters,
  ListTasksResult,
  TaskCondition,
  TaskDetail,
  TaskDraft,
  TaskDraftCondition,
  TaskOutputRecord,
  TaskRecord,
  TaskSetWriteInput,
  TaskSetWriteResult,
  TaskStatus,
  TaskSummary,
  UpdateTaskStatusInput,
} from "./types.js";

export interface TaskServiceOptions {
  taskStore: TaskStorePort;
  now?: () => Date;
  createTaskId?: () => string;
  createOutputRecordId?: () => string;
}

export class TaskService {
  private readonly now: () => Date;
  private readonly createTaskId: () => string;
  private readonly createOutputRecordId: () => string;

  constructor(private readonly options: TaskServiceOptions) {
    this.now = options.now ?? (() => new Date());
    this.createTaskId = options.createTaskId ?? (() => randomUUID());
    this.createOutputRecordId =
      options.createOutputRecordId ?? (() => randomUUID());
  }

  async listTasks(filters: ListTasksFilters = {}): Promise<ListTasksResult> {
    const normalizedFilters = normalizeListTasksFilters(filters);
    const records = await this.options.taskStore.listTasks(normalizedFilters);

    return {
      items: records
        .filter((record) => matchesKeyword(record, normalizedFilters.keyword))
        .map(toTaskSummary),
    };
  }

  async getTaskDetail(taskId: string): Promise<TaskDetail> {
    return toTaskDetail(await this.getTaskRecord(taskId));
  }

  async createTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult> {
    const normalizedTrafficWorkId = normalizeRequiredString(
      trafficWorkId,
      "Traffic work ID is required.",
      "trafficWorkId",
    );
    await this.ensureTrafficWorkExists(normalizedTrafficWorkId);

    const existingTaskCount =
      await this.options.taskStore.countTasksByTrafficWorkId(
        normalizedTrafficWorkId,
      );

    if (existingTaskCount > 0) {
      throw new TaskOperationConflictError(
        "Current traffic work already has a task set.",
      );
    }

    const records = this.createTaskRecords(normalizedTrafficWorkId, input);
    await this.options.taskStore.createTasks(records);
    return toTaskSetWriteResult(normalizedTrafficWorkId, records);
  }

  async replaceTaskSetForTrafficWork(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): Promise<TaskSetWriteResult> {
    const normalizedTrafficWorkId = normalizeRequiredString(
      trafficWorkId,
      "Traffic work ID is required.",
      "trafficWorkId",
    );
    const trafficWorkState = await this.ensureTrafficWorkExists(
      normalizedTrafficWorkId,
    );

    if (trafficWorkState.lifecycleStatus === "running") {
      throw new TaskOperationConflictError(
        "Running traffic works cannot replace task sets.",
      );
    }

    const records = this.createTaskRecords(normalizedTrafficWorkId, input);
    await this.options.taskStore.replaceTasksForTrafficWork(
      normalizedTrafficWorkId,
      records,
    );
    return toTaskSetWriteResult(normalizedTrafficWorkId, records);
  }

  async updateTaskStatus(
    taskId: string,
    input: UpdateTaskStatusInput,
  ): Promise<TaskDetail> {
    const record = await this.getTaskRecord(taskId);
    const timestamp = this.now().toISOString();
    const nextRecord: TaskRecord = {
      ...record,
      status: ensureTaskStatus(input.status),
      statusReason: normalizeOptionalString(input.statusReason, "statusReason"),
      updatedAt: timestamp,
    };

    await this.options.taskStore.saveTask(nextRecord);
    return toTaskDetail(nextRecord);
  }

  async createTaskOutputRecord(
    taskId: string,
    input: CreateTaskOutputRecordInput,
  ): Promise<TaskOutputRecord> {
    const record = await this.getTaskRecord(taskId);
    const outputRecord: TaskOutputRecord = {
      outputRecordId: this.createOutputRecordId(),
      taskId: record.taskId,
      description: normalizeRequiredString(
        input.description,
        "Output description is required.",
        "description",
      ),
      dataLocation: normalizeRequiredString(
        input.dataLocation,
        "Output dataLocation is required.",
        "dataLocation",
      ),
      createdAt: this.now().toISOString(),
    };

    await this.options.taskStore.createTaskOutputRecord(outputRecord);
    return cloneTaskOutputRecord(outputRecord);
  }

  async listTaskOutputRecords(
    taskId: string,
  ): Promise<ListTaskOutputRecordsResult> {
    const record = await this.getTaskRecord(taskId);
    return {
      items: await this.options.taskStore.listTaskOutputRecords(record.taskId),
    };
  }

  close(): void {
    this.options.taskStore.close();
  }

  private async ensureTrafficWorkExists(trafficWorkId: string) {
    const trafficWorkState =
      await this.options.taskStore.getTrafficWorkState(trafficWorkId);

    if (!trafficWorkState) {
      throw new TaskTrafficWorkNotFoundError(trafficWorkId);
    }

    return trafficWorkState;
  }

  private async getTaskRecord(taskId: string): Promise<TaskRecord> {
    const normalizedTaskId = normalizeRequiredString(
      taskId,
      "Task ID is required.",
      "taskId",
    );
    const record = await this.options.taskStore.getTaskById(normalizedTaskId);

    if (!record) {
      throw new TaskNotFoundError(normalizedTaskId);
    }

    return record;
  }

  private createTaskRecords(
    trafficWorkId: string,
    input: TaskSetWriteInput,
  ): TaskRecord[] {
    const normalizedInput = normalizeTaskSetWriteInput(input);
    const timestamp = this.now().toISOString();
    const taskIdsByKey = new Map<string, string>();

    for (const draft of normalizedInput.tasks) {
      taskIdsByKey.set(draft.taskKey, this.createTaskId());
    }

    return normalizedInput.tasks.map((draft) => {
      const taskId = taskIdsByKey.get(draft.taskKey);

      if (!taskId) {
        throw validationError("Task key mapping failed.", "tasks.taskKey");
      }

      return {
        taskId,
        trafficWorkId,
        taskKey: draft.taskKey,
        name: draft.name,
        instruction: draft.instruction,
        documentRef: draft.documentRef ?? null,
        contextRef: draft.contextRef,
        condition: mapDraftCondition(draft.condition, taskIdsByKey),
        inputPrompt: draft.inputPrompt,
        status: "ready",
        statusReason: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };
    });
  }
}

function normalizeTaskSetWriteInput(
  input: TaskSetWriteInput,
): TaskSetWriteInput {
  if (!input || typeof input !== "object") {
    throw validationError("Task set request body must be an object.", "$");
  }

  if (input.source?.kind !== "agent-decomposition") {
    throw validationError(
      'Task set source kind must be "agent-decomposition".',
      "source.kind",
    );
  }

  if (!Array.isArray(input.tasks) || input.tasks.length === 0) {
    throw validationError("Task set must include at least one task.", "tasks");
  }

  const taskKeys = new Set<string>();
  const tasks = input.tasks.map((draft, index) => {
    const normalizedDraft = normalizeTaskDraft(draft, `tasks[${index}]`);

    if (taskKeys.has(normalizedDraft.taskKey)) {
      throw validationError(
        `Task key "${normalizedDraft.taskKey}" is duplicated.`,
        `tasks[${index}].taskKey`,
      );
    }

    taskKeys.add(normalizedDraft.taskKey);
    return normalizedDraft;
  });

  for (const [taskIndex, task] of tasks.entries()) {
    for (const [
      relyIndex,
      relyOnTaskKey,
    ] of task.condition.relyOnTaskKeys.entries()) {
      if (!taskKeys.has(relyOnTaskKey)) {
        throw validationError(
          `Task dependency "${relyOnTaskKey}" does not exist in the task set.`,
          `tasks[${taskIndex}].condition.relyOnTaskKeys[${relyIndex}]`,
        );
      }
    }
  }

  return {
    source: {
      kind: "agent-decomposition",
      requestId: normalizeOptionalString(
        input.source.requestId,
        "source.requestId",
      ),
      description: normalizeOptionalString(
        input.source.description,
        "source.description",
      ),
    },
    tasks,
  };
}

function normalizeTaskDraft(draft: TaskDraft, pathPrefix: string): TaskDraft {
  if (!draft || typeof draft !== "object" || Array.isArray(draft)) {
    throw validationError("Each task draft must be an object.", pathPrefix);
  }

  return {
    taskKey: normalizeRequiredString(
      draft.taskKey,
      "Task key is required.",
      `${pathPrefix}.taskKey`,
    ),
    name: normalizeRequiredString(
      draft.name,
      "Task name is required.",
      `${pathPrefix}.name`,
    ),
    instruction: normalizeRequiredString(
      draft.instruction,
      "Task instruction is required.",
      `${pathPrefix}.instruction`,
    ),
    documentRef: normalizeOptionalString(
      draft.documentRef,
      `${pathPrefix}.documentRef`,
    ),
    contextRef: normalizeRequiredString(
      draft.contextRef,
      "Task contextRef is required.",
      `${pathPrefix}.contextRef`,
    ),
    condition: normalizeTaskDraftCondition(
      draft.condition,
      `${pathPrefix}.condition`,
    ),
    inputPrompt: normalizeTaskInputPrompt(
      draft.inputPrompt,
      `${pathPrefix}.inputPrompt`,
    ),
  };
}

function normalizeTaskDraftCondition(
  condition: TaskDraftCondition,
  pathPrefix: string,
): TaskDraftCondition {
  if (!condition || typeof condition !== "object" || Array.isArray(condition)) {
    throw validationError("Task condition must be an object.", pathPrefix);
  }

  if (!Array.isArray(condition.relyOnTaskKeys)) {
    throw validationError(
      "Task condition relyOnTaskKeys must be an array.",
      `${pathPrefix}.relyOnTaskKeys`,
    );
  }

  return {
    cron: normalizeOptionalString(condition.cron, `${pathPrefix}.cron`),
    relyOnTaskKeys: condition.relyOnTaskKeys.map((taskKey, index) =>
      normalizeRequiredString(
        taskKey,
        "Task dependency key is required.",
        `${pathPrefix}.relyOnTaskKeys[${index}]`,
      ),
    ),
  };
}

function normalizeTaskInputPrompt(
  inputPrompt: unknown,
  path: string,
): string {
  return normalizeRequiredString(
    inputPrompt,
    "Task inputPrompt is required.",
    path,
  );
}

function normalizeListTasksFilters(
  filters: ListTasksFilters,
): ListTasksFilters {
  return {
    trafficWorkId:
      normalizeOptionalString(filters.trafficWorkId, "trafficWorkId") ??
      undefined,
    status: filters.status ? ensureTaskStatus(filters.status) : undefined,
    keyword: normalizeOptionalString(filters.keyword, "keyword") ?? undefined,
  };
}

function mapDraftCondition(
  condition: TaskDraftCondition,
  taskIdsByKey: Map<string, string>,
): TaskCondition {
  return {
    cron: condition.cron,
    relyOnTaskIds: condition.relyOnTaskKeys.map((taskKey) => {
      const taskId = taskIdsByKey.get(taskKey);

      if (!taskId) {
        throw validationError(
          `Task dependency "${taskKey}" does not exist in the task set.`,
          "tasks.condition.relyOnTaskKeys",
        );
      }

      return taskId;
    }),
  };
}

function normalizeRequiredString(
  value: unknown,
  message: string,
  path: string,
): string {
  if (typeof value !== "string") {
    throw validationError(message, path);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw validationError(message, path);
  }

  return normalizedValue;
}

function normalizeOptionalString(value: unknown, path: string): string | null {
  if (value === null || value === undefined) {
    return null;
  }

  return normalizeRequiredString(value, "Expected a non-empty string.", path);
}

function ensureTaskStatus(value: unknown): TaskStatus {
  if (
    value === "ready" ||
    value === "running" ||
    value === "completed" ||
    value === "failed"
  ) {
    return value;
  }

  throw validationError("Task status is invalid.", "status");
}

function matchesKeyword(
  record: TaskRecord,
  keyword: string | undefined,
): boolean {
  if (!keyword) {
    return true;
  }

  const normalizedKeyword = keyword.toLowerCase();

  return [
    record.name,
    record.instruction,
    record.contextRef,
    record.documentRef ?? "",
  ].some((value) => value.toLowerCase().includes(normalizedKeyword));
}

function toTaskSummary(record: TaskRecord): TaskSummary {
  return {
    taskId: record.taskId,
    trafficWorkId: record.trafficWorkId,
    name: record.name,
    status: record.status,
    condition: cloneTaskCondition(record.condition),
    inputPrompt: record.inputPrompt,
    updatedAt: record.updatedAt,
  };
}

function toTaskDetail(record: TaskRecord): TaskDetail {
  return {
    taskId: record.taskId,
    trafficWorkId: record.trafficWorkId,
    name: record.name,
    instruction: record.instruction,
    documentRef: record.documentRef,
    contextRef: record.contextRef,
    condition: cloneTaskCondition(record.condition),
    inputPrompt: record.inputPrompt,
    status: record.status,
    statusReason: record.statusReason,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function toTaskSetWriteResult(
  trafficWorkId: string,
  records: TaskRecord[],
): TaskSetWriteResult {
  return {
    trafficWorkId,
    taskCount: records.length,
    tasks: records.map((record) => ({
      taskKey: record.taskKey ?? record.taskId,
      taskId: record.taskId,
    })),
  };
}

function cloneTaskCondition(condition: TaskCondition): TaskCondition {
  return {
    cron: condition.cron,
    relyOnTaskIds: [...condition.relyOnTaskIds],
  };
}

function cloneTaskOutputRecord(record: TaskOutputRecord): TaskOutputRecord {
  return {
    outputRecordId: record.outputRecordId,
    taskId: record.taskId,
    description: record.description,
    dataLocation: record.dataLocation,
    createdAt: record.createdAt,
  };
}

function validationError(message: string, path: string): TaskValidationError {
  const issues: TaskValidationIssue[] = [{ path, message }];
  return new TaskValidationError(message, { issues });
}
