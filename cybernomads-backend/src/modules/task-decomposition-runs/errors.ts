export class TaskDecompositionRunModuleError extends Error {
  constructor(
    readonly code: string,
    readonly statusCode: number,
    message: string,
    readonly details?: Record<string, unknown>,
  ) {
    super(message);
    this.name = "TaskDecompositionRunModuleError";
  }
}

export class TaskDecompositionRunNotFoundError extends TaskDecompositionRunModuleError {
  constructor(trafficWorkId: string) {
    super(
      "TASK_DECOMPOSITION_RUN_NOT_FOUND",
      404,
      `Task decomposition run for traffic work "${trafficWorkId}" was not found.`,
    );
  }
}

export class TaskDecompositionRunValidationError extends TaskDecompositionRunModuleError {
  constructor(message: string, details?: Record<string, unknown>) {
    super("TASK_DECOMPOSITION_RUN_VALIDATION_FAILED", 400, message, details);
  }
}

export class TaskDecompositionRunOperationConflictError extends TaskDecompositionRunModuleError {
  constructor(message: string) {
    super("TASK_DECOMPOSITION_RUN_OPERATION_NOT_ALLOWED", 409, message);
  }
}

export function isTaskDecompositionRunModuleError(
  error: unknown,
): error is TaskDecompositionRunModuleError {
  return error instanceof TaskDecompositionRunModuleError;
}
