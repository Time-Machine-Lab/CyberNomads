import type { IncomingMessage, ServerResponse } from "node:http";

import { handleAccountsControllerError } from "../accounts/controller.js";
import type { AccountConnectionAttemptService } from "./service.js";
import type {
  ResolveConnectionAttemptInput,
  StartConnectionAttemptInput,
  ValidateConnectionAttemptInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createAccountConnectionAttemptsController(
  service: AccountConnectionAttemptService,
) {
  return async function handleAccountConnectionAttemptRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      const logsMatch = matchLogsPath(url.pathname);

      if (logsMatch) {
        if (method === "GET") {
          const result = await service.getConnectionAttemptLogs(
            logsMatch.accountId,
            logsMatch.attemptId,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      const validateMatch = matchValidatePath(url.pathname);

      if (validateMatch) {
        if (method === "POST") {
          const payload = (await readOptionalJsonBody(
            request,
          )) as ValidateConnectionAttemptInput;
          const result = await service.validateConnectionAttempt(
            validateMatch.accountId,
            validateMatch.attemptId,
            payload,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const resolveMatch = matchResolvePath(url.pathname);

      if (resolveMatch) {
        if (method === "POST") {
          const payload = (await readOptionalJsonBody(
            request,
          )) as ResolveConnectionAttemptInput;
          const result = await service.resolveConnectionAttempt(
            resolveMatch.accountId,
            resolveMatch.attemptId,
            payload,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const detailMatch = matchAttemptDetailPath(url.pathname);

      if (detailMatch) {
        if (method === "GET") {
          const result = await service.getConnectionAttempt(
            detailMatch.accountId,
            detailMatch.attemptId,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      const createMatch = matchAttemptCollectionPath(url.pathname);

      if (!createMatch) {
        return false;
      }

      if (method === "POST") {
        const payload = (await readJsonBody(request)) as StartConnectionAttemptInput;
        const result = await service.startConnectionAttempt(
          createMatch.accountId,
          payload,
        );
        sendJson(response, 201, result);
        return true;
      }

      sendMethodNotAllowed(response, ["POST"]);
      return true;
    } catch (error) {
      await handleAccountsControllerError(error, response);
      return true;
    }
  };
}

async function readOptionalJsonBody(request: IncomingMessage): Promise<unknown> {
  try {
    return await readJsonBody(request);
  } catch (error) {
    if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
      return {};
    }

    throw error;
  }
}

function matchAttemptCollectionPath(
  pathname: string,
): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/connection-attempts$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    accountId: decodeURIComponent(match[1]),
  };
}

function matchAttemptDetailPath(
  pathname: string,
): { accountId: string; attemptId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/connection-attempts\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    accountId: decodeURIComponent(match[1]),
    attemptId: decodeURIComponent(match[2]),
  };
}

function matchResolvePath(
  pathname: string,
): { accountId: string; attemptId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/connection-attempts\/([^/]+)\/resolve$/.exec(
      pathname,
    );

  if (!match) {
    return null;
  }

  return {
    accountId: decodeURIComponent(match[1]),
    attemptId: decodeURIComponent(match[2]),
  };
}

function matchValidatePath(
  pathname: string,
): { accountId: string; attemptId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/connection-attempts\/([^/]+)\/validate$/.exec(
      pathname,
    );

  if (!match) {
    return null;
  }

  return {
    accountId: decodeURIComponent(match[1]),
    attemptId: decodeURIComponent(match[2]),
  };
}

function matchLogsPath(
  pathname: string,
): { accountId: string; attemptId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/connection-attempts\/([^/]+)\/logs$/.exec(
      pathname,
    );

  if (!match) {
    return null;
  }

  return {
    accountId: decodeURIComponent(match[1]),
    attemptId: decodeURIComponent(match[2]),
  };
}
