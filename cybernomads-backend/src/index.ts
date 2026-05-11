import { startApplication } from "./app/start-application.js";
import { isBootstrapError } from "./shared/bootstrap-error.js";

function resolveServerPort() {
  const value = process.env.SERVER_PORT?.trim();

  if (!value) {
    return undefined;
  }

  const parsed = Number(value);
  return Number.isInteger(parsed) && parsed > 0 ? parsed : undefined;
}

try {
  const application = await startApplication({
    host: process.env.SERVER_HOST?.trim() || undefined,
    port: resolveServerPort(),
  });

  console.info("Cybernomads backend is ready.");
  console.info(`Runtime root: ${application.runtime.paths.runtimeRoot}`);
  console.info(`SQLite database: ${application.runtime.paths.databaseFile}`);
  console.info(`HTTP server: ${application.http.url}`);
} catch (error) {
  if (isBootstrapError(error)) {
    console.error(`[bootstrap:${error.code}] ${error.message}`);

    if (error.cause instanceof Error) {
      console.error(error.cause.message);
    }
  } else if (error instanceof Error) {
    console.error(error.message);
  } else {
    console.error("Unknown startup error.", error);
  }

  process.exitCode = 1;
}
