import type { IncomingMessage, ServerResponse } from "node:http";

import {
  AgentServiceValidationError,
  isAgentAccessModuleError,
} from "./errors.js";
import type { AgentAccessService } from "./service.js";
import type {
  ConfigureAgentServiceInput,
  UpdateAgentServiceInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createAgentAccessController(agentAccessService: AgentAccessService) {
  return async function handleAgentAccessRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (!url.pathname.startsWith("/api/agent-services")) {
      return false;
    }

    try {
      if (url.pathname === "/api/agent-services/current") {
        if (method === "POST") {
          const payload = (await readJsonBody(
            request,
          )) as ConfigureAgentServiceInput;
          const currentService =
            await agentAccessService.configureCurrentService(payload);
          sendJson(response, 201, currentService);
          return true;
        }

        if (method === "GET") {
          const currentService = await agentAccessService.getCurrentAgentService();
          sendJson(response, 200, currentService);
          return true;
        }

        if (method === "PUT") {
          const payload = (await readJsonBody(
            request,
          )) as UpdateAgentServiceInput;
          const currentService = await agentAccessService.updateCurrentService(
            payload,
          );
          sendJson(response, 200, currentService);
          return true;
        }

        sendMethodNotAllowed(response, ["POST", "GET", "PUT"]);
        return true;
      }

      if (url.pathname === "/api/agent-services/current/status") {
        if (method === "GET") {
          const status = await agentAccessService.getCurrentAgentServiceStatus();
          sendJson(response, 200, status);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      if (url.pathname === "/api/agent-services/current/connection-verification") {
        if (method === "POST") {
          const result =
            await agentAccessService.verifyCurrentServiceConnection();
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      if (url.pathname === "/api/agent-services/current/capability-provisioning") {
        if (method === "POST") {
          const result =
            await agentAccessService.prepareCurrentAgentServiceCapabilities();
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }
    } catch (error) {
      await handleAgentAccessControllerError(error, response);
      return true;
    }

    return false;
  };
}

export async function handleAgentAccessControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isAgentAccessModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new AgentServiceValidationError(
      "Request body must be valid JSON.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new AgentServiceValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new AgentServiceValidationError(
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
