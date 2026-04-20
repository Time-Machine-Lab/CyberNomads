import { createServer, type Server } from "node:http";

import {
  createProductsController,
  handleControllerError,
} from "../modules/products/controller.js";
import type { ProductService } from "../modules/products/service.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

export interface StartHttpServerOptions {
  productService: ProductService;
  host?: string;
  port?: number;
}

export interface HttpServerState {
  server: Server;
  host: string;
  port: number;
  url: string;
}

export async function startHttpServer(
  options: StartHttpServerOptions,
): Promise<HttpServerState> {
  const host = options.host ?? DEFAULT_HOST;
  const port = options.port ?? DEFAULT_PORT;
  const handleProductsRequest = createProductsController(
    options.productService,
  );

  const server = createServer(async (request, response) => {
    try {
      const handled = await handleProductsRequest(request, response);

      if (!handled) {
        response.statusCode = 404;
        response.setHeader("Content-Type", "application/json; charset=utf-8");
        response.end(
          JSON.stringify({
            code: "ROUTE_NOT_FOUND",
            message: "The requested route was not found.",
          }),
        );
      }
    } catch (error) {
      await handleControllerError(error, response);
    }
  });

  await listen(server, port, host);

  const address = server.address();

  if (!address || typeof address === "string") {
    throw new Error("Failed to resolve HTTP server address.");
  }

  return {
    server,
    host,
    port: address.port,
    url: `http://${host}:${address.port}`,
  };
}

export async function stopHttpServer(server: Server): Promise<void> {
  if (!server.listening) {
    return;
  }

  await new Promise<void>((resolve, reject) => {
    server.close((error) => {
      if (error) {
        reject(error);
        return;
      }

      resolve();
    });
  });
}

async function listen(
  server: Server,
  port: number,
  host: string,
): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    server.once("error", reject);
    server.listen(port, host, () => {
      server.off("error", reject);
      resolve();
    });
  });
}
