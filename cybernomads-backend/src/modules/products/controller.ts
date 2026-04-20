import type { IncomingMessage, ServerResponse } from "node:http";

import { isProductModuleError, ProductValidationError } from "./errors.js";
import type { ProductService } from "./service.js";
import type { CreateProductInput, UpdateProductInput } from "./types.js";

const MAX_REQUEST_BODY_BYTES = 1_000_000;

export function createProductsController(productService: ProductService) {
  return async function handleProductsRequest(
    request: IncomingMessage,
    response: ServerResponse,
  ): Promise<boolean> {
    const method = request.method ?? "GET";
    const url = new URL(request.url ?? "/", "http://127.0.0.1");

    if (url.pathname === "/api/products") {
      if (method === "GET") {
        const result = await productService.listProducts();
        sendJson(response, 200, result);
        return true;
      }

      if (method === "POST") {
        const payload = (await readJsonBody(request)) as CreateProductInput;
        const product = await productService.createProduct(payload);
        sendJson(response, 201, product);
        return true;
      }

      sendMethodNotAllowed(response, ["GET", "POST"]);
      return true;
    }

    const productDetailMatch = matchProductDetailPath(url.pathname);

    if (!productDetailMatch) {
      return false;
    }

    const { productId } = productDetailMatch;

    if (method === "GET") {
      const product = await productService.getProductDetail(productId);
      sendJson(response, 200, product);
      return true;
    }

    if (method === "PUT") {
      const payload = (await readJsonBody(request)) as UpdateProductInput;
      const product = await productService.updateProduct(productId, payload);
      sendJson(response, 200, product);
      return true;
    }

    sendMethodNotAllowed(response, ["GET", "PUT"]);
    return true;
  };
}

export async function handleControllerError(
  error: unknown,
  response: ServerResponse,
): Promise<void> {
  if (isProductModuleError(error)) {
    sendJson(response, error.statusCode, {
      code: error.code,
      message: error.message,
    });
    return;
  }

  if (error instanceof SyntaxError) {
    const validationError = new ProductValidationError(
      "Request body must be valid JSON.",
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

async function readJsonBody(request: IncomingMessage): Promise<unknown> {
  const chunks: Uint8Array[] = [];
  let totalLength = 0;

  for await (const chunk of request) {
    const chunkBuffer = typeof chunk === "string" ? Buffer.from(chunk) : chunk;
    totalLength += chunkBuffer.byteLength;

    if (totalLength > MAX_REQUEST_BODY_BYTES) {
      throw new ProductValidationError("Request body is too large.");
    }

    chunks.push(chunkBuffer);
  }

  if (chunks.length === 0) {
    throw new ProductValidationError("Request body is required.");
  }

  return JSON.parse(Buffer.concat(chunks).toString("utf8")) as unknown;
}

function matchProductDetailPath(
  pathname: string,
): { productId: string } | null {
  const match = /^\/api\/products\/([^/]+)$/.exec(pathname);

  if (!match) {
    return null;
  }

  return {
    productId: decodeURIComponent(match[1]),
  };
}

function sendMethodNotAllowed(
  response: ServerResponse,
  allowedMethods: string[],
): void {
  response.setHeader("Allow", allowedMethods.join(", "));
  sendJson(response, 405, {
    code: "METHOD_NOT_ALLOWED",
    message: "The requested method is not supported for this route.",
  });
}

function sendJson(
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
