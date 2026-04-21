import type { IncomingMessage, ServerResponse } from "node:http";

const MAX_REQUEST_BODY_BYTES = 1_000_000;

export async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of request) {
    const chunkBuffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    totalLength += chunkBuffer.byteLength;

    if (totalLength > MAX_REQUEST_BODY_BYTES) {
      throw new Error("REQUEST_BODY_TOO_LARGE");
    }

    chunks.push(chunkBuffer);
  }

  if (chunks.length === 0) {
    throw new Error("REQUEST_BODY_REQUIRED");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

export function sendJson(
  response: ServerResponse,
  statusCode: number,
  payload: unknown,
): void {
  const body = JSON.stringify(payload);
  response.statusCode = statusCode;
  response.setHeader("Content-Type", "application/json; charset=utf-8");
  response.setHeader("Content-Length", Buffer.byteLength(body));
  response.end(body);
}

export function sendMethodNotAllowed(
  response: ServerResponse,
  allowedMethods: string[],
): void {
  response.setHeader("Allow", allowedMethods.join(", "));
  sendJson(response, 405, {
    code: "METHOD_NOT_ALLOWED",
    message: "The requested method is not supported for this route.",
  });
}
