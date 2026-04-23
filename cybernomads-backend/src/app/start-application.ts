import {
  bootstrapRuntime,
  type BootstrapRuntimeOptions,
  type BootstrapRuntimeResult,
} from "./bootstrap-runtime.js";
import { BilibiliStubAccountPlatformAdapter } from "../adapters/platform/bilibili/bilibili-stub-account-platform-adapter.js";
import { AgentAccessTrafficWorkContextPreparationAdapter } from "../adapters/agent/traffic-work-context-preparation-adapter.js";
import { FileSystemAccountSecretStore } from "../adapters/storage/file-system/account-secret-store.js";
import { FileSystemAgentServiceCredentialStore } from "../adapters/storage/file-system/agent-service-credential-store.js";
import { FileSystemProductContentStore } from "../adapters/storage/file-system/product-content-store.js";
import { FileSystemTrafficWorkContextStore } from "../adapters/storage/file-system/traffic-work-context-store.js";
import { FileSystemStrategyContentStore } from "../adapters/storage/file-system/strategy-content-store.js";
import { OpenClawAgentProvider } from "../adapters/agent/openclaw/openclaw-adapter.js";
import { SqliteAccountConnectionAttemptsRepository } from "../adapters/storage/sqlite/account-connection-attempts-sqlite-repository.js";
import { SqliteAccountsRepository } from "../adapters/storage/sqlite/accounts-sqlite-repository.js";
import { SqliteAgentServiceStateRepository } from "../adapters/storage/sqlite/agent-services-sqlite-repository.js";
import { SqliteProductRepository } from "../adapters/storage/sqlite/products-sqlite-repository.js";
import {
  SqliteStrategyReferenceRepository,
  SqliteStrategyRepository,
} from "../adapters/storage/sqlite/strategies-sqlite-repository.js";
import { SqliteTaskRepository } from "../adapters/storage/sqlite/tasks-sqlite-repository.js";
import { SqliteTrafficWorkRepository } from "../adapters/storage/sqlite/traffic-works-sqlite-repository.js";
import { AccountConnectionAttemptService } from "../modules/account-connection-attempts/service.js";
import { AgentAccessService } from "../modules/agent-access/service.js";
import { AccountService } from "../modules/accounts/service.js";
import { ProductService } from "../modules/products/service.js";
import { TaskService } from "../modules/tasks/service.js";
import { TrafficWorkService } from "../modules/traffic-works/service.js";
import { StrategyService } from "../modules/strategies/service.js";
import type { AccountPlatformPort } from "../ports/account-platform-port.js";
import type { AgentProviderPort } from "../ports/agent-provider-port.js";
import {
  startHttpServer,
  stopHttpServer,
  type HttpServerState,
} from "./http-server.js";
import { ThreadTaskPlanner } from "./thread-task-planner.js";

export interface StartThreadTaskPlannerOptions {
  enabled?: boolean;
  intervalMs?: number;
}

export interface StartApplicationOptions extends BootstrapRuntimeOptions {
  host?: string;
  port?: number;
  agentProviders?: Iterable<AgentProviderPort>;
  accountPlatforms?: Iterable<AccountPlatformPort>;
  threadTaskPlanner?: StartThreadTaskPlannerOptions;
}

export interface ApplicationReadyState {
  status: "ready";
  runtime: BootstrapRuntimeResult;
  http: HttpServerState;
  threadTaskPlanner: ThreadTaskPlanner | null;
  close(): Promise<void>;
}

export async function startApplication(
  options: StartApplicationOptions = {},
): Promise<ApplicationReadyState> {
  const runtime = await bootstrapRuntime(options);
  const productRepository = new SqliteProductRepository(
    runtime.paths.databaseFile,
  );
  const strategyRepository = new SqliteStrategyRepository(
    runtime.paths.databaseFile,
  );
  const accountRepository = new SqliteAccountsRepository(
    runtime.paths.databaseFile,
  );
  const accountConnectionAttemptRepository = new SqliteAccountConnectionAttemptsRepository(
    runtime.paths.databaseFile,
  );
  const agentServiceStateRepository = new SqliteAgentServiceStateRepository(
    runtime.paths.databaseFile,
  );
  const strategyReferenceRepository = new SqliteStrategyReferenceRepository(
    runtime.paths.databaseFile,
  );
  const trafficWorkRepository = new SqliteTrafficWorkRepository(
    runtime.paths.databaseFile,
  );
  const taskRepository = new SqliteTaskRepository(runtime.paths.databaseFile);
  const productContentStore = new FileSystemProductContentStore(
    runtime.paths.productDirectory,
  );
  const strategyContentStore = new FileSystemStrategyContentStore(
    runtime.paths.strategyDirectory,
  );
  const accountSecretStore = new FileSystemAccountSecretStore(
    runtime.paths.runtimeRoot,
  );
  const agentServiceCredentialStore = new FileSystemAgentServiceCredentialStore(
    runtime.paths.runtimeRoot,
  );
  const trafficWorkContextStore = new FileSystemTrafficWorkContextStore(
    runtime.paths.workDirectory,
  );
  const productService = new ProductService({
    metadataStore: productRepository,
    contentStore: productContentStore,
  });
  const strategyService = new StrategyService({
    metadataStore: strategyRepository,
    contentStore: strategyContentStore,
  });
  const accountService = new AccountService({
    stateStore: accountRepository,
    connectionAttemptStateStore: accountConnectionAttemptRepository,
    secretStore: accountSecretStore,
    platforms: [
      new BilibiliStubAccountPlatformAdapter(),
      ...(options.accountPlatforms ?? []),
    ],
  });
  const accountConnectionAttemptService = new AccountConnectionAttemptService({
    accountStateStore: accountRepository,
    attemptStateStore: accountConnectionAttemptRepository,
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
  const taskService = new TaskService({
    taskStore: taskRepository,
  });
  const trafficWorkService = new TrafficWorkService({
    stateStore: trafficWorkRepository,
    contextStore: trafficWorkContextStore,
    contextPreparation: new AgentAccessTrafficWorkContextPreparationAdapter(
      agentAccessService,
    ),
    productStore: productRepository,
    productContentStore,
    strategyStore: strategyReferenceRepository,
    strategyContentStore,
    taskSetPersistence: taskService,
  });

  let threadTaskPlanner: ThreadTaskPlanner | null = null;

  try {
    const threadTaskPlannerOptions = options.threadTaskPlanner ?? {};

    if (threadTaskPlannerOptions.enabled !== false) {
      threadTaskPlanner = new ThreadTaskPlanner({
        taskService,
        trafficWorkService,
        agentAccessService,
        intervalMs: threadTaskPlannerOptions.intervalMs,
      });
    }

    const http = await startHttpServer({
      productService,
      strategyService,
      accountService,
      accountConnectionAttemptService,
      agentAccessService,
      trafficWorkService,
      taskService,
      host: options.host,
      port: options.port,
    });

    threadTaskPlanner?.start();

    return {
      status: "ready",
      runtime,
      http,
      threadTaskPlanner,
      async close() {
        await threadTaskPlanner?.stop();
        await stopHttpServer(http.server);
        productService.close();
        strategyService.close();
        accountService.close();
        accountConnectionAttemptService.close();
        agentAccessService.close();
        trafficWorkService.close();
        taskService.close();
        strategyReferenceRepository.close();
      },
    };
  } catch (error) {
    await threadTaskPlanner?.stop();
    productService.close();
    strategyService.close();
    accountService.close();
    accountConnectionAttemptService.close();
    agentAccessService.close();
    trafficWorkService.close();
    taskService.close();
    strategyReferenceRepository.close();
    throw error;
  }
}
