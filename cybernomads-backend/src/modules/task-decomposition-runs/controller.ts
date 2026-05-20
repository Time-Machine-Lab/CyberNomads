import type { IncomingMessage, ServerResponse } from "node:http";

import {
  isTaskDecompositionRunModuleError,
  TaskDecompositionRunValidationError,
} from "./errors.js";
import type { TaskDecompositionRunService } from "./service.js";
import type { TaskDecompositionFeedbackInput } from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";
import { isTaskModuleError } from "../tasks/errors.js";

export function createTaskDecompositionRunsController(
  service: TaskDecompositionRunService,
) {
  return async function handleTaskDecompositionRunsRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");
    const match = matchDecompositionRunPath(url.pathname);

    if (!match) {
      return false;
    }

    try {
      if (!match.operation) {
        if (method !== "GET") {
          sendMethodNotAllowed(response, ["GET"]);
          return true;
        }

        sendJson(
          response,
          200,
          await service.getCurrentRunDetail(match.trafficWorkId),
        );
        return true;
      }

      if (match.operation === "center-view") {
        if (method !== "GET") {
          sendMethodNotAllowed(response, ["GET"]);
          return true;
        }

        sendJson(
          response,
          200,
          await service.getCurrentCenterView(match.trafficWorkId),
        );
        return true;
      }

      if (match.operation === "report") {
        if (method !== "GET") {
          sendMethodNotAllowed(response, ["GET"]);
          return true;
        }

        sendJson(
          response,
          200,
          await service.getCurrentReport(match.trafficWorkId),
        );
        return true;
      }

      if (match.operation === "confirmation") {
        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        sendJson(
          response,
          200,
          await service.confirmCurrentRun(match.trafficWorkId),
        );
        return true;
      }

      if (match.operation === "feedback") {
        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        const payload = (await readJsonBody(
          request,
        )) as TaskDecompositionFeedbackInput;
        sendJson(
          response,
          202,
          await service.replanWithFeedback(match.trafficWorkId, payload),
        );
        return true;
      }
    } catch (error) {
      handleTaskDecompositionRunError(error, response);
      return true;
    }

    return false;
  };
}

function matchDecompositionRunPath(pathname: string): {
  trafficWorkId: string;
  operation?: "center-view" | "report" | "confirmation" | "feedback";
} | null {
  const match =
    /^\/api\/traffic-works\/([^/]+)\/decomposition-run(?:\/(center-view|report|confirmation|feedback))?$/.exec(
      pathname,
    );

  if (!match) {
    return null;
  }

  return {
    trafficWorkId: decodeURIComponent(match[1]),
    operation: match[2] as
      | "center-view"
      | "report"
      | "confirmation"
      | "feedback"
      | undefined,
  };
}

function handleTaskDecompositionRunError(
  error: unknown,
  response: ServerResponse,
): void {
  if (isTaskDecompositionRunModuleError(error) || isTaskModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new TaskDecompositionRunValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new TaskDecompositionRunValidationError(
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
