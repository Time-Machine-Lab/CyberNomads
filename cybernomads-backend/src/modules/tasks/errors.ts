export class TaskModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TaskModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class TaskValidationError extends TaskModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("TASK_VALIDATION_FAILED", 400, message, options);
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
