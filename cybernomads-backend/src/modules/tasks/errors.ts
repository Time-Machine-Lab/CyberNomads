export class TaskModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown; details?: Record<string, unknown> } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TaskModuleError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
  }
}

export interface TaskValidationIssue {
  path: string;
  message: string;
}

export class TaskValidationError extends TaskModuleError {
  constructor(
    message: string,
    options: { cause?: unknown; issues?: TaskValidationIssue[] } = {},
  ) {
    super("TASK_VALIDATION_FAILED", 400, message, {
      cause: options.cause,
      details: options.issues ? { issues: options.issues } : undefined,
    });
  }
}

export class TaskNotFoundError extends TaskModuleError {
  constructor(taskId: string) {
    super("TASK_NOT_FOUND", 404, `Task "${taskId}" was not found.`);
  }
}

export class TaskTrafficWorkNotFoundError extends TaskModuleError {
  constructor(trafficWorkId: string) {
    super(
      "TASK_TRAFFIC_WORK_NOT_FOUND",
      404,
      `Traffic work "${trafficWorkId}" was not found for task operation.`,
    );
  }
}

export class TaskOperationConflictError extends TaskModuleError {
  constructor(message: string) {
    super("TASK_OPERATION_NOT_ALLOWED", 409, message);
  }
}

export function isTaskModuleError(error: unknown): error is TaskModuleError {
  return error instanceof TaskModuleError;
}
