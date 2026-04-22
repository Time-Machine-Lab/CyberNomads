import {
  AccountModuleError,
  AccountValidationError,
} from "../accounts/errors.js";

export { AccountValidationError };

export class AccountOnboardingSessionNotFoundError extends AccountModuleError {
  constructor(sessionId: string) {
    super(
      "ACCOUNT_ONBOARDING_SESSION_NOT_FOUND",
      404,
      `Account onboarding session "${sessionId}" was not found.`,
    );
  }
}

export class AccountOnboardingOperationConflictError extends AccountModuleError {
  constructor(message: string) {
    super("ACCOUNT_ONBOARDING_OPERATION_NOT_ALLOWED", 409, message);
  }
}
