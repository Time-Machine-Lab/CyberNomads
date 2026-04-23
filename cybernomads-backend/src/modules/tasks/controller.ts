import type { IncomingMessage, ServerResponse } from "node:http";

import { isTaskModuleError, TaskValidationError } from "./errors.js";
import type { TaskService } from "./service.js";
import type {
  CreateTaskOutputRecordInput,
  ListTasksFilters,
  TaskSetWriteInput,
  UpdateTaskStatusInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createTasksController(taskService: TaskService) {
  return async function handleTasksRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      const taskSetMatch = matchTrafficWorkTaskSetPath(url.pathname);

      if (taskSetMatch) {
        if (method === "POST") {
          const payload = (await readJsonBody(request)) as TaskSetWriteInput;
          const result = await taskService.createTaskSetForTrafficWork(
            taskSetMatch.trafficWorkId,
            payload,
          );
          sendJson(response, 201, result);
          return true;
        }

        if (method === "PUT") {
          const payload = (await readJsonBody(request)) as TaskSetWriteInput;
          const result = await taskService.replaceTaskSetForTrafficWork(
            taskSetMatch.trafficWorkId,
            payload,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST", "PUT"]);
        return true;
      }

      if (!url.pathname.startsWith("/api/tasks")) {
        return false;
      }

      if (url.pathname === "/api/tasks") {
        if (method === "GET") {
          const result = await taskService.listTasks(readListFilters(url));
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      const outputMatch = matchTaskOutputsPath(url.pathname);

      if (outputMatch) {
        if (method === "GET") {
          const result = await taskService.listTaskOutputRecords(
            outputMatch.taskId,
          );
          sendJson(response, 200, result);
          return true;
        }

        if (method === "POST") {
          const payload = (await readJsonBody(
            request,
          )) as CreateTaskOutputRecordInput;
          const result = await taskService.createTaskOutputRecord(
            outputMatch.taskId,
            payload,
          );
          sendJson(response, 201, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET", "POST"]);
        return true;
      }

      const statusMatch = matchTaskStatusPath(url.pathname);

      if (statusMatch) {
        if (method !== "PATCH") {
          sendMethodNotAllowed(response, ["PATCH"]);
          return true;
        }

        const payload = (await readJsonBody(request)) as UpdateTaskStatusInput;
        const result = await taskService.updateTaskStatus(
          statusMatch.taskId,
          payload,
        );
        sendJson(response, 200, result);
        return true;
      }

      const detailMatch = matchTaskDetailPath(url.pathname);

      if (!detailMatch) {
        return false;
      }

      if (method === "GET") {
        const result = await taskService.getTaskDetail(detailMatch.taskId);
        sendJson(response, 200, result);
        return true;
      }

      sendMethodNotAllowed(response, ["GET"]);
      return true;
    } catch (error) {
      await handleTaskControllerError(error, response);
      return true;
    }
  };
}

export async function handleTaskControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isTaskModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new TaskValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new TaskValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new TaskValidationError(
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

function readListFilters(url: URL): ListTasksFilters {
  return {
    trafficWorkId: url.searchParams.get("trafficWorkId") ?? undefined,
    status:
      (url.searchParams.get("status") as ListTasksFilters["status"] | null) ??
      undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
  };
}

function matchTaskDetailPath(pathname: string): { taskId: string } | null {
  const match = /^\/api\/tasks\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    taskId: decodeURIComponent(match[1]),
  };
}

function matchTaskStatusPath(pathname: string): { taskId: string } | null {
  const match = /^\/api\/tasks\/([^/]+)\/status$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    taskId: decodeURIComponent(match[1]),
  };
}

function matchTaskOutputsPath(pathname: string): { taskId: string } | null {
  const match = /^\/api\/tasks\/([^/]+)\/outputs$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    taskId: decodeURIComponent(match[1]),
  };
}

function matchTrafficWorkTaskSetPath(
  pathname: string,
): { trafficWorkId: string } | null {
  const match = /^\/api\/traffic-works\/([^/]+)\/task-set$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    trafficWorkId: decodeURIComponent(match[1]),
  };
}
