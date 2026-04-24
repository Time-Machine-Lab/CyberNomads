import type { TaskDecompositionSupportToolValidationIssue } from "./types.js";

export class TaskDecompositionSupportToolsError extends Error {
  readonly code: string;
  readonly statusCode: number;
  readonly details?: Record<string, unknown>;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: {
      cause?: unknown;
      details?: Record<string, unknown>;
    } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TaskDecompositionSupportToolsError";
    this.code = code;
    this.statusCode = statusCode;
    this.details = options.details;
  }
}

export class TaskDecompositionSupportToolsValidationError extends TaskDecompositionSupportToolsError {
  constructor(
    message: string,
    options: {
      cause?: unknown;
      issues?: TaskDecompositionSupportToolValidationIssue[];
    } = {},
  ) {
    super("TASK_DECOMPOSITION_TOOL_VALIDATION_FAILED", 400, message, {
      cause: options.cause,
      details: options.issues ? { issues: options.issues } : undefined,
    });
  }
}

export class TaskDecompositionSupportToolsTrafficWorkNotFoundError extends TaskDecompositionSupportToolsError {
  constructor(trafficWorkId: string) {
    super(
      "TASK_DECOMPOSITION_TOOL_TRAFFIC_WORK_NOT_FOUND",
      404,
      `Traffic work "${trafficWorkId}" was not found for task decomposition support tools.`,
    );
  }
}

export class TaskDecompositionSupportToolsResourceNotFoundError extends TaskDecompositionSupportToolsError {
  constructor(
    resourceType: string,
    resourcePath: string,
    options: { cause?: unknown } = {},
  ) {
    super(
      "TASK_DECOMPOSITION_TOOL_RESOURCE_NOT_FOUND",
      404,
      `Runtime ${resourceType} resource "${resourcePath}" was not found.`,
      options,
    );
  }
}

export class TaskDecompositionSupportToolsBoundaryViolationError extends TaskDecompositionSupportToolsError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("TASK_DECOMPOSITION_TOOL_BOUNDARY_VIOLATION", 400, message, options);
  }
}

export function isTaskDecompositionSupportToolsError(
  error: unknown,
): error is TaskDecompositionSupportToolsError {
  return error instanceof TaskDecompositionSupportToolsError;
}
