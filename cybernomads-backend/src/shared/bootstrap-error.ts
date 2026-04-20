export const bootstrapErrorCodes = {
  runtimeRootPreparationFailed: "RUNTIME_ROOT_PREPARATION_FAILED",
  sqliteOpenFailed: "SQLITE_OPEN_FAILED",
  runtimeSqlLoadFailed: "RUNTIME_SQL_LOAD_FAILED",
  runtimeSqlExecutionFailed: "RUNTIME_SQL_EXECUTION_FAILED",
} as const;

export type BootstrapErrorCode =
  (typeof bootstrapErrorCodes)[keyof typeof bootstrapErrorCodes];

export interface BootstrapErrorOptions {
  cause?: unknown;
  details?: Record<string, string>;
}

export class BootstrapError extends Error {
  readonly code: BootstrapErrorCode;
  readonly details: Record<string, string>;

  constructor(
    code: BootstrapErrorCode,
    message: string,
    options: BootstrapErrorOptions = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "BootstrapError";
    this.code = code;
    this.details = options.details ?? {};
  }
}

export function isBootstrapError(error: unknown): error is BootstrapError {
  return error instanceof BootstrapError;
}
