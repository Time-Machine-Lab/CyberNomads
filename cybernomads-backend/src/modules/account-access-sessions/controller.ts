import type { IncomingMessage, ServerResponse } from "node:http";

import { handleAccountsControllerError } from "../accounts/controller.js";
import type { AccountAccessSessionService } from "./service.js";
import type {
  PollAccessSessionInput,
  StartManualAccessSessionInput,
  StartQrAccessSessionInput,
  VerifyAccessSessionInput,
} from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

export function createAccountAccessSessionsController(
  service: AccountAccessSessionService,
) {
  return async function handleAccountAccessSessionRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    try {
      const logsMatch = matchLogsPath(url.pathname);

      if (logsMatch) {
        if (method === "GET") {
          const result = await service.getAccessSessionLogs(
            logsMatch.accountId,
            logsMatch.sessionId,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      const verifyMatch = matchVerifyPath(url.pathname);

      if (verifyMatch) {
        if (method === "POST") {
          const payload = (await readOptionalJsonBody(
            request,
          )) as VerifyAccessSessionInput;
          const result = await service.verifyAccessSession(
            verifyMatch.accountId,
            verifyMatch.sessionId,
            payload,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const pollMatch = matchPollPath(url.pathname);

      if (pollMatch) {
        if (method === "POST") {
          const payload = (await readOptionalJsonBody(
            request,
          )) as PollAccessSessionInput;
          const result = await service.pollAccessSession(
            pollMatch.accountId,
            pollMatch.sessionId,
            payload,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const startTokenMatch = matchTokenCollectionPath(url.pathname);

      if (startTokenMatch) {
        if (method === "POST") {
          const payload = (await readJsonBody(request)) as StartManualAccessSessionInput;
          const result = await service.startManualAccessSession(
            startTokenMatch.accountId,
            payload,
          );
          sendJson(response, 201, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const startQrMatch = matchQrCollectionPath(url.pathname);

      if (startQrMatch) {
        if (method === "POST") {
          const payload = (await readOptionalJsonBody(
            request,
          )) as StartQrAccessSessionInput;
          const result = await service.startQrAccessSession(
            startQrMatch.accountId,
            payload,
          );
          sendJson(response, 201, result);
          return true;
        }

        sendMethodNotAllowed(response, ["POST"]);
        return true;
      }

      const detailMatch = matchSessionDetailPath(url.pathname);

      if (detailMatch) {
        if (method === "GET") {
          const result = await service.getAccessSession(
            detailMatch.accountId,
            detailMatch.sessionId,
          );
          sendJson(response, 200, result);
          return true;
        }

        sendMethodNotAllowed(response, ["GET"]);
        return true;
      }

      return false;
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

function matchTokenCollectionPath(
  pathname: string,
): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/access-sessions\/token$/.exec(pathname);
  return match ? { accountId: decodeURIComponent(match[1]) } : null;
}

function matchQrCollectionPath(
  pathname: string,
): { accountId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/access-sessions\/qr$/.exec(pathname);
  return match ? { accountId: decodeURIComponent(match[1]) } : null;
}

function matchSessionDetailPath(
  pathname: string,
): { accountId: string; sessionId: string } | null {
  const match = /^\/api\/accounts\/([^/]+)\/access-sessions\/([^/]+)$/.exec(pathname);
  return match
    ? {
        accountId: decodeURIComponent(match[1]),
        sessionId: decodeURIComponent(match[2]),
      }
    : null;
}

function matchPollPath(
  pathname: string,
): { accountId: string; sessionId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/access-sessions\/([^/]+)\/poll$/.exec(pathname);
  return match
    ? {
        accountId: decodeURIComponent(match[1]),
        sessionId: decodeURIComponent(match[2]),
      }
    : null;
}

function matchVerifyPath(
  pathname: string,
): { accountId: string; sessionId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/access-sessions\/([^/]+)\/verify$/.exec(pathname);
  return match
    ? {
        accountId: decodeURIComponent(match[1]),
        sessionId: decodeURIComponent(match[2]),
      }
    : null;
}

function matchLogsPath(
  pathname: string,
): { accountId: string; sessionId: string } | null {
  const match =
    /^\/api\/accounts\/([^/]+)\/access-sessions\/([^/]+)\/logs$/.exec(pathname);
  return match
    ? {
        accountId: decodeURIComponent(match[1]),
        sessionId: decodeURIComponent(match[2]),
      }
    : null;
}
