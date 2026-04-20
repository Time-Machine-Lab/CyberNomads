import { startApplication } from "./app/start-application.js";
import { isBootstrapError } from "./shared/bootstrap-error.js";

try {
  const application = await startApplication();

  console.info("Cybernomads backend is ready.");
  console.info(`Runtime root: ${application.runtime.paths.runtimeRoot}`);
  console.info(`SQLite database: ${application.runtime.paths.databaseFile}`);
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
