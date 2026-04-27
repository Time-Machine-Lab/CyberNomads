import type { IncomingMessage, ServerResponse } from "node:http";

import {
  isTaskDecompositionSupportToolsError,
  TaskDecompositionSupportToolsValidationError,
} from "./errors.js";
import type { TaskDecompositionSupportToolsService } from "./service.js";
import { isTaskModuleError } from "../tasks/errors.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createTaskDecompositionSupportToolsController(
  service: TaskDecompositionSupportToolsService,
) {
  return async function handleTaskDecompositionSupportToolsRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      if (
        url.pathname ===
        "/api/task-decomposition-support-tools/runtime-resource-copy"
      ) {
        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        const payload = await readJsonBody(request);
        const result = await service.copyRuntimeAgentResource(
          payload as Parameters<
            TaskDecompositionSupportToolsService["copyRuntimeAgentResource"]
          >[0],
        );
        sendJson(response, 200, result);
        return true;
      }

      if (
        url.pathname ===
        "/api/task-decomposition-support-tools/batch-save-tasks"
      ) {
        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        const payload = await readJsonBody(request);
        const result = await service.batchSaveTasks(
          payload as Parameters<
            TaskDecompositionSupportToolsService["batchSaveTasks"]
          >[0],
        );
        sendJson(response, result.mode === "create" ? 201 : 200, result);
        return true;
      }

      if (
        url.pathname ===
        "/api/task-decomposition-support-tools/context-preparation-status"
      ) {
        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        const payload = await readJsonBody(request);
        const result = await service.reportTrafficWorkPreparationStatus(
          payload as Parameters<
            TaskDecompositionSupportToolsService["reportTrafficWorkPreparationStatus"]
          >[0],
        );
        sendJson(response, 200, result);
        return true;
      }

      return false;
    } catch (error) {
      handleTaskDecompositionSupportToolsError(error, response);
      return true;
    }
  };
}

export function handleTaskDecompositionSupportToolsError(
  error: unknown,
  response: ServerResponse,
): void {
  if (isTaskDecompositionSupportToolsError(error) || isTaskModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
      ...(error.details ? { details: error.details } : {}),
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new TaskDecompositionSupportToolsValidationError(
      "Request body must be valid JSON.",
      {
        issues: [
          {
            path: "$",
            message: "Request body must be valid JSON.",
          },
        ],
      },
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
      details: validationError.details,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new TaskDecompositionSupportToolsValidationError(
      "Request body is too large.",
      {
        issues: [
          {
            path: "$",
            message: "Request body is too large.",
          },
        ],
      },
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
      details: validationError.details,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new TaskDecompositionSupportToolsValidationError(
      "Request body is required.",
      {
        issues: [
          {
            path: "$",
            message: "Request body is required.",
          },
        ],
      },
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
      details: validationError.details,
    });
    return;
  }

  sendJson(response, 500, {
    code: "INTERNAL_SERVER_ERROR",
    message: "An unexpected error occurred.",
  });
}
