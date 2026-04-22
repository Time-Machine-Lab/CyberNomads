import type { IncomingMessage, ServerResponse } from "node:http";

import {
  isTrafficWorkModuleError,
  TrafficWorkValidationError,
} from "./errors.js";
import type { TrafficWorkService } from "./service.js";
import type {
  CreateTrafficWorkInput,
  ListTrafficWorksFilters,
  UpdateTrafficWorkInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createTrafficWorksController(
  trafficWorkService: TrafficWorkService,
) {
  return async function handleTrafficWorksRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (!url.pathname.startsWith("/api/traffic-works")) {
      return false;
    }

    try {
      if (url.pathname === "/api/traffic-works") {
        if (method === "GET") {
          const result = await trafficWorkService.listTrafficWorks(
            readListFilters(url),
          );
          sendJson(response, 200, result);
          return true;
        }

        if (method === "POST") {
          const payload = (await readJsonBody(
            request,
          )) as CreateTrafficWorkInput;
          const trafficWork =
            await trafficWorkService.createTrafficWork(payload);
          sendJson(response, 201, trafficWork);
          return true;
        }

        sendMethodNotAllowed(response, ["GET", "POST"]);
        return true;
      }

      const lifecycleMatch = matchTrafficWorkLifecyclePath(url.pathname);

      if (lifecycleMatch) {
        const { trafficWorkId, operation } = lifecycleMatch;

        if (method !== "POST") {
          sendMethodNotAllowed(response, ["POST"]);
          return true;
        }

        const result = await runLifecycleOperation(
          trafficWorkService,
          trafficWorkId,
          operation,
        );
        sendJson(response, 200, result);
        return true;
      }

      const detailMatch = matchTrafficWorkDetailPath(url.pathname);

      if (!detailMatch) {
        return false;
      }

      const { trafficWorkId } = detailMatch;

      if (method === "GET") {
        const trafficWork =
          await trafficWorkService.getTrafficWorkDetail(trafficWorkId);
        sendJson(response, 200, trafficWork);
        return true;
      }

      if (method === "PUT") {
        const payload = (await readJsonBody(request)) as UpdateTrafficWorkInput;
        const trafficWork = await trafficWorkService.updateTrafficWork(
          trafficWorkId,
          payload,
        );
        sendJson(response, 200, trafficWork);
        return true;
      }

      if (method === "DELETE") {
        const trafficWork =
          await trafficWorkService.deleteTrafficWork(trafficWorkId);
        sendJson(response, 200, trafficWork);
        return true;
      }

      sendMethodNotAllowed(response, ["GET", "PUT", "DELETE"]);
      return true;
    } catch (error) {
      await handleTrafficWorkControllerError(error, response);
      return true;
    }
  };
}

export async function handleTrafficWorkControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isTrafficWorkModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new TrafficWorkValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new TrafficWorkValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new TrafficWorkValidationError(
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

function readListFilters(url: URL): ListTrafficWorksFilters {
  return {
    productId: url.searchParams.get("productId") ?? undefined,
    strategyId: url.searchParams.get("strategyId") ?? undefined,
    keyword: url.searchParams.get("keyword") ?? undefined,
    lifecycleStatus:
      (url.searchParams.get("lifecycleStatus") as
        | ListTrafficWorksFilters["lifecycleStatus"]
        | null) ?? undefined,
    contextPreparationStatus:
      (url.searchParams.get("contextPreparationStatus") as
        | ListTrafficWorksFilters["contextPreparationStatus"]
        | null) ?? undefined,
  };
}

function matchTrafficWorkDetailPath(
  pathname: string,
): { trafficWorkId: string } | null {
  const match = /^\/api\/traffic-works\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    trafficWorkId: decodeURIComponent(match[1]),
  };
}

function matchTrafficWorkLifecyclePath(pathname: string): {
  trafficWorkId: string;
  operation: "start" | "pause" | "end" | "archive";
} | null {
  const match =
    /^\/api\/traffic-works\/([^/]+)\/(start|pause|end|archive)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    trafficWorkId: decodeURIComponent(match[1]),
    operation: match[2] as "start" | "pause" | "end" | "archive",
  };
}

async function runLifecycleOperation(
  trafficWorkService: TrafficWorkService,
  trafficWorkId: string,
  operation: "start" | "pause" | "end" | "archive",
) {
  switch (operation) {
    case "start":
      return trafficWorkService.startTrafficWork(trafficWorkId);
    case "pause":
      return trafficWorkService.pauseTrafficWork(trafficWorkId);
    case "end":
      return trafficWorkService.endTrafficWork(trafficWorkId);
    case "archive":
      return trafficWorkService.archiveTrafficWork(trafficWorkId);
  }
}
