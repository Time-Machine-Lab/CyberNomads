import type { IncomingMessage, ServerResponse } from "node:http";

import { isProductModuleError, ProductValidationError } from "./errors.js";
import type { ProductService } from "./service.js";
import type { CreateProductInput, UpdateProductInput } from "./types.js";
import {
  readJsonBody,
  sendJson,
  sendMethodNotAllowed,
} from "../../shared/http.js";

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

    if (method === "DELETE") {
      await productService.deleteProduct(productId);
      response.statusCode = 204;
      response.end();
      return true;
    }

    sendMethodNotAllowed(response, ["GET", "PUT", "DELETE"]);
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

  if (error instanceof Error && error.message === "REQUEST_BODY_TOO_LARGE") {
    const validationError = new ProductValidationError(
      "Request body is too large.",
    );
    sendJson(response, validationError.statusCode, {
      code: validationError.code,
      message: validationError.message,
    });
    return;
  }

  if (error instanceof Error && error.message === "REQUEST_BODY_REQUIRED") {
    const validationError = new ProductValidationError(
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
