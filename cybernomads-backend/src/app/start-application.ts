import {
  bootstrapRuntime,
  type BootstrapRuntimeOptions,
  type BootstrapRuntimeResult,
} from "./bootstrap-runtime.js";

export interface ApplicationReadyState {
  status: "ready";
  runtime: BootstrapRuntimeResult;
}

export async function startApplication(
  options: BootstrapRuntimeOptions = {},
): Promise<ApplicationReadyState> {
  const runtime = await bootstrapRuntime(options);

  return {
    status: "ready",
    runtime,
  };
}
