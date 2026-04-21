import {
  bootstrapRuntime,
  type BootstrapRuntimeOptions,
  type BootstrapRuntimeResult,
} from "./bootstrap-runtime.js";
import { FileSystemAgentServiceCredentialStore } from "../adapters/storage/file-system/agent-service-credential-store.js";
import { FileSystemProductContentStore } from "../adapters/storage/file-system/product-content-store.js";
import { OpenClawAgentProvider } from "../adapters/agent/openclaw/openclaw-adapter.js";
import { SqliteAgentServiceStateRepository } from "../adapters/storage/sqlite/agent-services-sqlite-repository.js";
import { SqliteProductRepository } from "../adapters/storage/sqlite/products-sqlite-repository.js";
import { AgentAccessService } from "../modules/agent-access/service.js";
import { ProductService } from "../modules/products/service.js";
import type { AgentProviderPort } from "../ports/agent-provider-port.js";
import {
  startHttpServer,
  stopHttpServer,
  type HttpServerState,
} from "./http-server.js";

export interface StartApplicationOptions extends BootstrapRuntimeOptions {
  host?: string;
  port?: number;
  agentProviders?: Iterable<AgentProviderPort>;
}

export interface ApplicationReadyState {
  status: "ready";
  runtime: BootstrapRuntimeResult;
  http: HttpServerState;
  close(): Promise<void>;
}

export async function startApplication(
  options: StartApplicationOptions = {},
): Promise<ApplicationReadyState> {
  const runtime = await bootstrapRuntime(options);
  const productRepository = new SqliteProductRepository(
    runtime.paths.databaseFile,
  );
  const agentServiceStateRepository = new SqliteAgentServiceStateRepository(
    runtime.paths.databaseFile,
  );
  const productContentStore = new FileSystemProductContentStore(
    runtime.paths.productDirectory,
  );
  const agentServiceCredentialStore = new FileSystemAgentServiceCredentialStore(
    runtime.paths.runtimeRoot,
  );
  const productService = new ProductService({
    metadataStore: productRepository,
    contentStore: productContentStore,
  });
  const agentAccessService = new AgentAccessService({
    stateStore: agentServiceStateRepository,
    credentialStore: agentServiceCredentialStore,
    providers: [new OpenClawAgentProvider(), ...(options.agentProviders ?? [])],
  });

  try {
    const http = await startHttpServer({
      productService,
      agentAccessService,
      host: options.host,
      port: options.port,
    });

    return {
      status: "ready",
      runtime,
      http,
      async close() {
        await stopHttpServer(http.server);
        productService.close();
        agentAccessService.close();
      },
    };
  } catch (error) {
    productService.close();
    agentAccessService.close();
    throw error;
  }
}
