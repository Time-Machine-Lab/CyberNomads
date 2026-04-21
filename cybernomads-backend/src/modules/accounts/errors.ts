export class AccountModuleError extends Error {
  readonly code: string;
  readonly statusCode: number;

  constructor(
    code: string,
    statusCode: number,
    message: string,
    options: { cause?: unknown } = {},
  ) {
    super(message, { cause: options.cause });
    this.name = "AccountModuleError";
    this.code = code;
    this.statusCode = statusCode;
  }
}

export class AccountValidationError extends AccountModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("ACCOUNT_VALIDATION_FAILED", 400, message, options);
  }
}

export class AccountNotFoundError extends AccountModuleError {
  constructor(accountId: string) {
    super("ACCOUNT_NOT_FOUND", 404, `Account "${accountId}" was not found.`);
  }
}

export class AccountAlreadyExistsError extends AccountModuleError {
  constructor(platform: string, platformAccountUid: string) {
    super(
      "ACCOUNT_ALREADY_EXISTS",
      409,
      `Account "${platform}:${platformAccountUid}" already exists.`,
    );
  }
}

export class AuthorizationAttemptNotFoundError extends AccountModuleError {
  constructor(accountId: string, attemptId: string) {
    super(
      "AUTHORIZATION_ATTEMPT_NOT_FOUND",
      404,
      `Authorization attempt "${attemptId}" was not found for account "${accountId}".`,
    );
  }
}

export class AccountOperationConflictError extends AccountModuleError {
  constructor(message: string) {
    super("ACCOUNT_OPERATION_NOT_ALLOWED", 409, message);
  }
}

export class AccountPlatformUnavailableError extends AccountModuleError {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super("ACCOUNT_PLATFORM_NOT_AVAILABLE", 503, message, options);
  }
}

export function isAccountModuleError(
  error: unknown,
): error is AccountModuleError {
  return error instanceof AccountModuleError;
}
