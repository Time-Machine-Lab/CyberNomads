export class AgentAccessModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AgentAccessModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AgentServiceValidationError extends AgentAccessModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("AGENT_SERVICE_VALIDATION_FAILED", 400, message, options);
  }
}

export class CurrentAgentServiceAlreadyExistsError extends AgentAccessModuleError {
  constructor() {
    super(
      "CURRENT_AGENT_SERVICE_ALREADY_EXISTS",
      409,
      "A current active agent service is already configured.",
    );
  }
}

export class CurrentAgentServiceNotFoundError extends AgentAccessModuleError {
  constructor() {
    super(
      "CURRENT_AGENT_SERVICE_NOT_FOUND",
      404,
      "The current active agent service is not configured.",
    );
  }
}

export class AgentServiceOperationConflictError extends AgentAccessModuleError {
  constructor(message: string) {
    super("AGENT_SERVICE_OPERATION_NOT_ALLOWED", 409, message);
  }
}

export class AgentServiceUnavailableError extends AgentAccessModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("AGENT_SERVICE_PROVIDER_NOT_AVAILABLE", 503, message, options);
  }
}

export function isAgentAccessModuleError(
  error: unknown,
): error is AgentAccessModuleError {
  return error instanceof AgentAccessModuleError;
}
