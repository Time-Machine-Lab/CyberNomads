export class TrafficWorkModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "TrafficWorkModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class TrafficWorkValidationError extends TrafficWorkModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("TRAFFIC_WORK_VALIDATION_FAILED", 400, message, options);
  }
}

export class TrafficWorkNotFoundError extends TrafficWorkModuleError {
  constructor(trafficWorkId: string) {
    super(
      "TRAFFIC_WORK_NOT_FOUND",
      404,
      `Traffic work "${trafficWorkId}" was not found.`,
    );
  }
}

export class TrafficWorkProductNotFoundError extends TrafficWorkModuleError {
  constructor(productId: string) {
    super(
      "TRAFFIC_WORK_PRODUCT_NOT_FOUND",
      404,
      `Product "${productId}" was not found for traffic work binding.`,
    );
  }
}

export class TrafficWorkStrategyNotFoundError extends TrafficWorkModuleError {
  constructor(strategyId: string) {
    super(
      "TRAFFIC_WORK_STRATEGY_NOT_FOUND",
      404,
      `Strategy "${strategyId}" was not found for traffic work binding.`,
    );
  }
}

export class TrafficWorkOperationConflictError extends TrafficWorkModuleError {
  constructor(message: string) {
    super("TRAFFIC_WORK_OPERATION_NOT_ALLOWED", 409, message);
  }
}

export function isTrafficWorkModuleError(
  error: unknown,
): error is TrafficWorkModuleError {
  return error instanceof TrafficWorkModuleError;
}
