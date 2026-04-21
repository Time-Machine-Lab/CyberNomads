import {
  bootstrapRuntime,
  type BootstrapRuntimeOptions,
  type BootstrapRuntimeResult,
} from "./bootstrap-runtime.js";
import { BilibiliStubAccountPlatformAdapter } from "../adapters/platform/bilibili/bilibili-stub-account-platform-adapter.js";
import { FileSystemAccountSecretStore } from "../adapters/storage/file-system/account-secret-store.js";
import { FileSystemAgentServiceCredentialStore } from "../adapters/storage/file-system/agent-service-credential-store.js";
import { FileSystemProductContentStore } from "../adapters/storage/file-system/product-content-store.js";
import { OpenClawAgentProvider } from "../adapters/agent/openclaw/openclaw-adapter.js";
import { SqliteAccountsRepository } from "../adapters/storage/sqlite/accounts-sqlite-repository.js";
import { SqliteAgentServiceStateRepository } from "../adapters/storage/sqlite/agent-services-sqlite-repository.js";
import { SqliteProductRepository } from "../adapters/storage/sqlite/products-sqlite-repository.js";
import { AgentAccessService } from "../modules/agent-access/service.js";
import { AccountService } from "../modules/accounts/service.js";
import { ProductService } from "../modules/products/service.js";
import type { AccountPlatformPort } from "../ports/account-platform-port.js";
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
  accountPlatforms?: Iterable<AccountPlatformPort>;
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
  const accountRepository = new SqliteAccountsRepository(
    runtime.paths.databaseFile,
  );
  const agentServiceStateRepository = new SqliteAgentServiceStateRepository(
    runtime.paths.databaseFile,
  );
  const productContentStore = new FileSystemProductContentStore(
    runtime.paths.productDirectory,
  );
  const accountSecretStore = new FileSystemAccountSecretStore(
    runtime.paths.runtimeRoot,
  );
  const agentServiceCredentialStore = new FileSystemAgentServiceCredentialStore(
    runtime.paths.runtimeRoot,
  );
  const productService = new ProductService({
    metadataStore: productRepository,
    contentStore: productContentStore,
  });
  const accountService = new AccountService({
    stateStore: accountRepository,
    secretStore: accountSecretStore,
    platforms: [
      new BilibiliStubAccountPlatformAdapter(),
      ...(options.accountPlatforms ?? []),
    ],
  });
  const agentAccessService = new AgentAccessService({
    stateStore: agentServiceStateRepository,
    credentialStore: agentServiceCredentialStore,
    providers: [new OpenClawAgentProvider(), ...(options.agentProviders ?? [])],
  });

  try {
    const http = await startHttpServer({
      productService,
      accountService,
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
        accountService.close();
        agentAccessService.close();
      },
    };
  } catch (error) {
    productService.close();
    accountService.close();
    agentAccessService.close();
    throw error;
  }
}
