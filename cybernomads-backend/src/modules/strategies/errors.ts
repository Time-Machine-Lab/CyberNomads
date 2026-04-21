export class StrategyModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "StrategyModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class StrategyValidationError extends StrategyModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("STRATEGY_VALIDATION_FAILED", 400, message, options);
  }
}

export class StrategyNotFoundError extends StrategyModuleError {
  constructor(strategyId: string) {
    super("STRATEGY_NOT_FOUND", 404, `Strategy "${strategyId}" was not found.`);
  }
}

export function isStrategyModuleError(
  error: unknown,
): error is StrategyModuleError {
  return error instanceof StrategyModuleError;
}
