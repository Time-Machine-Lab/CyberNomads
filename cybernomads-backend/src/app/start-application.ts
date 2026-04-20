import {
  bootstrapRuntime,
  type BootstrapRuntimeOptions,
  type BootstrapRuntimeResult,
} from "./bootstrap-runtime.js";
import { FileSystemProductContentStore } from "../adapters/storage/file-system/product-content-store.js";
import { SqliteProductRepository } from "../adapters/storage/sqlite/products-sqlite-repository.js";
import { ProductService } from "../modules/products/service.js";
import {
  startHttpServer,
  stopHttpServer,
  type HttpServerState,
} from "./http-server.js";

export interface StartApplicationOptions extends BootstrapRuntimeOptions {
  host?: string;
  port?: number;
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
  const productContentStore = new FileSystemProductContentStore(
    runtime.paths.productDirectory,
  );
  const productService = new ProductService({
    metadataStore: productRepository,
    contentStore: productContentStore,
  });

  try {
    const http = await startHttpServer({
      productService,
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
      },
    };
  } catch (error) {
    productService.close();
    throw error;
  }
}
