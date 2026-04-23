import type { IncomingMessage, ServerResponse } from "node:http";

import { StrategyValidationError, isStrategyModuleError } from "./errors.js";
import type { StrategyService } from "./service.js";
import type { CreateStrategyInput, UpdateStrategyInput } from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createStrategiesController(strategyService: StrategyService) {
  return async function handleStrategiesRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      if (url.pathname === "/api/strategies") {
        if (method === "GET") {
          const result = await strategyService.listStrategies();
          sendJson(response, 200, result);
          return true;
        }

        if (method === "POST") {
          const payload = (await readJsonBody(request)) as CreateStrategyInput;
          const strategy = await strategyService.createStrategy(payload);
          sendJson(response, 201, strategy);
          return true;
        }

        sendMethodNotAllowed(response, ["GET", "POST"]);
        return true;
      }

      const strategyDetailMatch = matchStrategyDetailPath(url.pathname);

      if (!strategyDetailMatch) {
        return false;
      }

      if (method === "GET") {
        const strategy = await strategyService.getStrategyDetail(
          strategyDetailMatch.strategyId,
        );
        sendJson(response, 200, strategy);
        return true;
      }

      if (method === "PUT") {
        const payload = (await readJsonBody(request)) as UpdateStrategyInput;
        const strategy = await strategyService.updateStrategy(
          strategyDetailMatch.strategyId,
          payload,
        );
        sendJson(response, 200, strategy);
        return true;
      }

      if (method === "DELETE") {
        await strategyService.deleteStrategy(strategyDetailMatch.strategyId);
        response.writeHead(204);
        response.end();
        return true;
      }

      sendMethodNotAllowed(response, ["GET", "PUT", "DELETE"]);
      return true;
    } catch (error) {
      await handleStrategiesControllerError(error, response);
      return true;
    }
  };
}

export async function handleStrategiesControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isStrategyModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new StrategyValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new StrategyValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new StrategyValidationError(
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

function matchStrategyDetailPath(
  pathname: string,
): { strategyId: string } | null {
  const match = /^\/api\/strategies\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    strategyId: decodeURIComponent(match[1]),
  };
}
