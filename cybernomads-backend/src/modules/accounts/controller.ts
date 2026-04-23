import type { IncomingMessage, ServerResponse } from "node:http";

import {
  AccountValidationError,
  isAccountModuleError,
} from "./errors.js";
import type { AccountService } from "./service.js";
import type {
  CreateAccountInput,
  ListAccountsFilters,
  UpdateAccountInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createAccountsController(accountService: AccountService) {
  return async function handleAccountsRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      if (url.pathname === "/api/accounts") {
        if (method === "POST") {
          const payload = (await readJsonBody(request)) as CreateAccountInput;
          const result = await accountService.createAccount(payload);
          sendJson(response, 201, result);
          return true;
        }

        if (method === "GET") {
          const filters = readListAccountFilters(url);
          const result = await accountService.listAccounts(filters);
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST", "GET"]);
        return true;
      }

      const restoreMatch = matchRestorePath(url.pathname);

      if (restoreMatch) {
        if (method === "POST") {
          const account = await accountService.restoreAccount(restoreMatch.accountId);
          sendJson(response, 200, account);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const availabilityMatch = matchAvailabilityChecksPath(url.pathname);

      if (availabilityMatch) {
        if (method === "POST") {
          const result = await accountService.runAvailabilityCheck(
            availabilityMatch.accountId,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const detailMatch = matchAccountDetailPath(url.pathname);

      if (!detailMatch) {
        return false;
      }

      if (method === "GET") {
        const account = await accountService.getAccountDetail(detailMatch.accountId);
        sendJson(response, 200, account);
        return true;
      }

      if (method === "PUT") {
        const payload = (await readJsonBody(request)) as UpdateAccountInput;
        const account = await accountService.updateAccount(
          detailMatch.accountId,
          payload,
        );
        sendJson(response, 200, account);
        return true;
      }

      if (method === "DELETE") {
        const account = await accountService.softDeleteAccount(detailMatch.accountId);
        sendJson(response, 200, account);
        return true;
      }

      sendMethodNotAllowed(response, ["GET", "PUT", "DELETE"]);
      return true;
    } catch (error) {
      await handleAccountsControllerError(error, response);
      return true;
    }
  };
}

export async function handleAccountsControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isAccountModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new AccountValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new AccountValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new AccountValidationError(
      "Request body is required.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  sendJson(response, 500, {
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}

function readListAccountFilters(url: URL): ListAccountsFilters {
  return {
    platform: url.searchParams.get("platform") ?? undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
    lifecycleStatus:
      (url.searchParams.get("lifecycleStatus") as ListAccountsFilters["lifecycleStatus"]) ??
      undefined,
    loginStatus:
      (url.searchParams.get("loginStatus") as ListAccountsFilters["loginStatus"]) ??
      undefined,
    availabilityStatus:
      (url.searchParams.get("availabilityStatus") as ListAccountsFilters["availabilityStatus"]) ??
      undefined,
    includeDeleted: parseBooleanQueryValue(
      url.searchParams.get("includeDeleted"),
      "includeDeleted",
    ),
    onlyConsumable: parseBooleanQueryValue(
      url.searchParams.get("onlyConsumable"),
      "onlyConsumable",
    ),
  };
}

function parseBooleanQueryValue(
  value: string | null,
  parameterName: string,
): boolean | undefined {
  if (value === null) {
    return undefined;
  }

  if (value === "true") {
    return true;
  }

  if (value === "false") {
    return false;
  }

  throw new AccountValidationError(
    `Query parameter "${parameterName}" must be "true" or "false".`,
  );
}

function matchAccountDetailPath(pathname: string): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)$/.exec(pathname);
  return match ? { accountId: decodeURIComponent(match[1]) } : null;
}

function matchRestorePath(pathname: string): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/restore$/.exec(pathname);
  return match ? { accountId: decodeURIComponent(match[1]) } : null;
}

function matchAvailabilityChecksPath(
  pathname: string,
): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/availability-checks$/.exec(pathname);
  return match ? { accountId: decodeURIComponent(match[1]) } : null;
}
