import type { AgentProviderContext } from "../../../ports/agent-provider-port.js";

export interface OpenClawToolInvocationInput {
  tool: string;
  action?: string;
  args?: Record<string, unknown>;
  sessionKey?: string;
}

export interface OpenClawToolInvocationResult {
  ok: true;
  result: unknown;
}

export class OpenClawProviderError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "OpenClawProviderError";
  }
}

export class OpenClawHttpClient {
  constructor(
    private readonly fetchImpl: typeof fetch = fetch,
  ) {}

  async invokeTool(
    context: AgentProviderContext,
    input: OpenClawToolInvocationInput,
  ): Promise<OpenClawToolInvocationResult> {
    const endpoint = new URL("/tools/invoke", context.endpointUrl);
    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${resolveCredentialSecret(context)}`,
      },
      body: JSON.stringify({
        tool: input.tool,
        ...(input.action ? { action: input.action } : {}),
        ...(input.sessionKey ? { sessionKey: input.sessionKey } : {}),
        args: input.args ?? {},
      }),
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new OpenClawProviderError(extractHttpErrorMessage(payload));
    }

    if (!isRecord(payload) || payload.ok !== true) {
      throw new OpenClawProviderError(extractHttpErrorMessage(payload));
    }

    return {
      ok: true,
      result: payload.result,
    };
  }
}

function resolveCredentialSecret(context: AgentProviderContext): string {
  const secret = context.credential.secret.trim();

  if (secret.length === 0) {
    throw new OpenClawProviderError("OpenClaw credential secret is required.");
  }

  return secret;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new OpenClawProviderError(
      "OpenClaw gateway returned a non-JSON response.",
      { cause: error },
    );
  }
}

function extractHttpErrorMessage(payload: unknown): string {
  if (isRecord(payload)) {
    const error = payload.error;

    if (isRecord(error) && typeof error.message === "string") {
      return error.message;
    }
  }

  return "OpenClaw gateway request failed.";
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return (
    typeof value === "object" &&
    value !== null &&
    !Array.isArray(value)
  );
}
