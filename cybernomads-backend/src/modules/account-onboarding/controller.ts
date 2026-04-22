import type { IncomingMessage, ServerResponse } from "node:http";

import { handleAccountsControllerError } from "../accounts/controller.js";
import type { AccountOnboardingService } from "./service.js";
import type {
  ResolveAccountOnboardingSessionInput,
  StartAccountOnboardingSessionInput,
} from "./types.js";
import { readJsonBody, sendJson, sendMethodNotAllowed } from "../../shared/http.js";

export function createAccountOnboardingController(
  service: AccountOnboardingService,
) {
  return async function handleAccountOnboardingRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      if (url.pathname === "/api/account-onboarding-sessions") {
        if (method === "POST") {
          const payload =
            (await readJsonBody(request)) as StartAccountOnboardingSessionInput;
          const result = await service.startSession(payload);
          sendJson(response, 201, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const resolveMatch = matchResolveSessionPath(url.pathname);

      if (resolveMatch) {
        if (method === "POST") {
          const payload =
            (await readJsonBody(request)) as ResolveAccountOnboardingSessionInput;
          const result = await service.resolveSession(resolveMatch.sessionId, payload);
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const finalizeMatch = matchFinalizeSessionPath(url.pathname);

      if (finalizeMatch) {
        if (method === "POST") {
          const result = await service.finalizeSession(finalizeMatch.sessionId);
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const detailMatch = matchSessionDetailPath(url.pathname);

      if (!detailMatch) {
        return false;
      }

      if (method === "GET") {
        const result = await service.getSession(detailMatch.sessionId);
        sendJson(response, 200, result);
        return true;
      }

      sendMethodNotAllowed(response, ["GET"]);
      return true;
    } catch (error) {
      await handleAccountsControllerError(error, response);
      return true;
    }
  };
}

function matchSessionDetailPath(pathname: string): { sessionId: string } | null {
  const match = /^\/api\/account-onboarding-sessions\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { sessionId: decodeURIComponent(match[1]) };
}

function matchResolveSessionPath(pathname: string): { sessionId: string } | null {
  const match =
    /^\/api\/account-onboarding-sessions\/([^/]+)\/resolve$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { sessionId: decodeURIComponent(match[1]) };
}

function matchFinalizeSessionPath(pathname: string): { sessionId: string } | null {
  const match =
    /^\/api\/account-onboarding-sessions\/([^/]+)\/finalize$/.exec(pathname);

  if (!match) {
    return null;
  }

  return { sessionId: decodeURIComponent(match[1]) };
}
