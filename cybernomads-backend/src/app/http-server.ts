import { createServer, type Server } from "node:http";

import { createAgentAccessController } from "../modules/agent-access/controller.js";
import type { AgentAccessService } from "../modules/agent-access/service.js";
import { createAccountsController } from "../modules/accounts/controller.js";
import type { AccountService } from "../modules/accounts/service.js";
import {
  createProductsController,
  handleControllerError,
} from "../modules/products/controller.js";
import type { ProductService } from "../modules/products/service.js";
import { sendJson } from "../shared/http.js";

const DEFAULT_HOST = "127.0.0.1";
const DEFAULT_PORT = 3000;

export interface StartHttpServerOptions {
  productService: ProductService;
  strategyService: StrategyService;
  accountService: AccountService;
  agentAccessService: AgentAccessService;
  trafficWorkService: TrafficWorkService;
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
  const handleStrategiesRequest = createStrategiesController(
    options.strategyService,
  );
  const handleAccountsRequest = createAccountsController(
    options.accountService,
  );
  const handleAgentAccessRequest = createAgentAccessController(
    options.agentAccessService,
  );
  const handleTrafficWorksRequest = createTrafficWorksController(
    options.trafficWorkService,
  );

  const server = createServer(async (request, response) => {
    try {
      const handlers = [
        handleAgentAccessRequest,
        handleAccountsRequest,
        handleStrategiesRequest,
        handleProductsRequest,
        handleTrafficWorksRequest,
      ];
      let handled = false;

      for (const handleRequest of handlers) {
        handled = await handleRequest(request, response);

        if (handled) {
          break;
        }
      }

      if (!handled) {
        sendJson(response, 404, {
          code: "ROUTE_NOT_FOUND",
          message: "The requested route was not found.",
        });
      }
    } catch (error) {
      if (!response.writableEnded) {
        await handleControllerError(error, response);
      }
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
