import { describe, expect, it } from "vitest";

import { AgentAccessService } from "../../src/modules/agent-access/service.js";
import { OpenClawAgentProvider } from "../../src/adapters/agent/openclaw/openclaw-adapter.js";
import type {
  AgentProviderContext,
} from "../../src/ports/agent-provider-port.js";
import type { AgentServiceCredentialStore } from "../../src/ports/agent-service-credential-store-port.js";
import type { AgentServiceStateStore } from "../../src/ports/agent-service-state-store-port.js";
import type {
  AgentServiceConnectionRecord,
  AgentServiceCredentialRecord,
} from "../../src/modules/agent-access/types.js";

describe("openclaw agent provider", () => {
  it("normalizes connection checks, capability preparation, messaging, and history", async () => {
    const httpClient = new FakeOpenClawHttpClient();
    const wsClient = new FakeOpenClawWsClient();
    const provider = new OpenClawAgentProvider({
      httpClient,
      wsClient,
      createId: createSequence(["session-1", "run-1"]),
    });
    const context = createProviderContext();

    await expect(provider.verifyConnection(context)).resolves.toEqual({
      isReachable: true,
      reason: "OpenClaw gateway reachable.",
    });

    await expect(provider.prepareCapabilities(context)).resolves.toEqual({
      isPrepared: true,
      reason: "OpenClaw gateway capabilities are ready.",
    });

    const session = await provider.createSession(context, {
      purpose: "task_planning",
      title: "Roadmap",
      context: "workspace alpha",
    });

    await expect(
      provider.sendMessage(context, {
        sessionId: session.sessionId,
        message: "Plan the launch tasks.",
      }),
    ).resolves.toEqual({
      messageId: "run-1",
      outputText: "handled:Plan the launch tasks.",
    });

    await expect(
      provider.listSessionMessages(context, {
        sessionId: session.sessionId,
      }),
    ).resolves.toEqual([
      {
        role: "system",
        content: "workspace alpha",
      },
      {
        role: "user",
        content: "Plan the launch tasks.",
      },
      {
        role: "assistant",
        content: "handled:Plan the launch tasks.",
      },
    ]);

    expect(httpClient.invocations.map((invocation) => invocation.tool)).toEqual([
      "sessions_list",
      "sessions_list",
      "subagents",
    ]);
    expect(wsClient.calls[0]).toMatchObject({
      method: "agent",
      params: {
        message: "Plan the launch tasks.",
        label: "Roadmap",
        extraSystemPrompt: "Session title: Roadmap\n\nSession purpose: task planning.\n\nSession context:\nworkspace alpha",
      },
    });
  });

  it("returns a provider-neutral failed subagent result when gateway policy denies spawn", async () => {
    const httpClient = new FakeOpenClawHttpClient({
      spawnError: new Error("Tool not available: sessions_spawn"),
    });
    const provider = new OpenClawAgentProvider({
      httpClient,
      wsClient: new FakeOpenClawWsClient(),
      createId: createSequence(["subagent-1"]),
    });

    await expect(
      provider.invokeSubagent(createProviderContext(), {
        sessionId: "agent:main:session-1",
        instructions: "Investigate the bug.",
        contextDirectory: "D:/workspace/demo",
      }),
    ).resolves.toEqual({
      invocationId: "subagent-1",
      outputText:
        "OpenClaw subagent spawning is disabled on this gateway. Enable `sessions_spawn` in the gateway HTTP tool allowlist to use it.",
      status: "failed",
    });
  });

  it("accepts ok as a successful completed run status", async () => {
    const provider = new OpenClawAgentProvider({
      httpClient: new FakeOpenClawHttpClient(),
      wsClient: new FakeOpenClawWsClient({
        waitStatus: "ok",
      }),
      createId: createSequence(["session-1", "run-1"]),
    });
    const context = createProviderContext();
    const session = await provider.createSession(context, {
      purpose: "task_planning",
      title: "Roadmap",
      context: null,
    });

    await expect(
      provider.sendMessage(context, {
        sessionId: session.sessionId,
        message: "List the skills.",
      }),
    ).resolves.toEqual({
      messageId: "run-1",
      outputText: "handled:List the skills.",
    });
  });
});

describe("agent access service with openclaw provider", () => {
  it("routes upper-layer execution through provider-neutral results", async () => {
    const service = new AgentAccessService({
      stateStore: new InMemoryAgentServiceStateStore(),
      credentialStore: new InMemoryAgentServiceCredentialStore(),
      providers: [
        new OpenClawAgentProvider({
          httpClient: new FakeOpenClawHttpClient(),
          wsClient: new FakeOpenClawWsClient(),
          createId: createSequence(["session-1", "run-1", "session-2", "run-2"]),
        }),
      ],
      createAgentServiceId: () => "agent-service-1",
      now: () => new Date("2026-04-21T08:00:00.000Z"),
    });

    await service.configureCurrentService({
      providerCode: "openclaw",
      endpointUrl: "http://127.0.0.1:18889",
      authentication: {
        kind: "bearer-token",
        secret: "secret-token",
      },
    });
    await service.verifyCurrentServiceConnection();

    const result = await service.submitTaskExecutionRequest({
      taskId: "task-1",
      instructions: "Execute the first task.",
      contextDirectory: "D:/cybernomads/work/demo",
      title: "execution",
    });

    expect(result.status).toBe("completed");
    expect(result.executionId).toBe("task-1:run-1");
    expect(result.outputText).toBe("handled:Execute the first task.");
    expect(result.history).toEqual([
      {
        role: "system",
        content: "D:/cybernomads/work/demo",
      },
      {
        role: "user",
        content: "Execute the first task.",
      },
      {
        role: "assistant",
        content: "handled:Execute the first task.",
      },
    ]);
  });
});

class FakeOpenClawHttpClient {
  readonly invocations: Array<{
    tool: string;
    action?: string;
    args?: Record<string, unknown>;
    sessionKey?: string;
  }> = [];

  constructor(
    private readonly options: {
      spawnError?: Error;
    } = {},
  ) {}

  async invokeTool(
    _context: AgentProviderContext,
    input: {
      tool: string;
      action?: string;
      args?: Record<string, unknown>;
      sessionKey?: string;
    },
  ): Promise<{ ok: true; result: unknown }> {
    this.invocations.push(input);

    if (input.tool === "sessions_spawn" && this.options.spawnError) {
      throw this.options.spawnError;
    }

    if (input.tool === "sessions_spawn") {
      return {
        ok: true,
        result: {
          details: {
            status: "accepted",
            runId: "subagent-run-1",
            message: "OpenClaw subagent invocation accepted.",
          },
        },
      };
    }

    return {
      ok: true,
      result: {
        details: {
          status: "ok",
        },
      },
    };
  }
}

class FakeOpenClawWsClient {
  readonly calls: Array<{
    method: string;
    params: Record<string, unknown>;
  }> = [];
  private readonly messages = new Map<string, Array<Record<string, unknown>>>();

  constructor(
    private readonly options: {
      waitStatus?: string;
    } = {},
  ) {}

  async request(
    _context: AgentProviderContext,
    method: string,
    params: Record<string, unknown>,
  ): Promise<unknown> {
    this.calls.push({ method, params });

    if (method === "agent") {
      const sessionKey = String(params.sessionKey);
      const message = String(params.message);
      this.messages.set(sessionKey, [
        {
          role: "user",
          content: message,
        },
        {
          role: "assistant",
          content: `handled:${message}`,
        },
      ]);

      return {
        runId: "run-1",
        status: "accepted",
      };
    }

    if (method === "agent.wait") {
      return {
        runId: "run-1",
        status: this.options.waitStatus ?? "completed",
      };
    }

    if (method === "chat.history") {
      const sessionKey = String(params.sessionKey);

      return {
        sessionKey,
        messages: this.messages.get(sessionKey) ?? [],
      };
    }

    throw new Error(`Unexpected gateway method: ${method}`);
  }
}

class InMemoryAgentServiceStateStore implements AgentServiceStateStore {
  private currentService: AgentServiceConnectionRecord | undefined;

  async getCurrentService(): Promise<AgentServiceConnectionRecord | undefined> {
    return this.currentService;
  }

  async saveCurrentService(record: AgentServiceConnectionRecord): Promise<void> {
    this.currentService = { ...record };
  }

  close(): void {}
}

class InMemoryAgentServiceCredentialStore
  implements AgentServiceCredentialStore
{
  private readonly credentials = new Map<string, AgentServiceCredentialRecord>();

  async writeCredential(
    credentialRef: string,
    credential: AgentServiceCredentialRecord,
  ): Promise<void> {
    this.credentials.set(credentialRef, { ...credential });
  }

  async readCredential(
    credentialRef: string,
  ): Promise<AgentServiceCredentialRecord> {
    const credential = this.credentials.get(credentialRef);

    if (!credential) {
      throw new Error(`Credential "${credentialRef}" was not found.`);
    }

    return { ...credential };
  }

  async deleteCredential(credentialRef: string): Promise<void> {
    this.credentials.delete(credentialRef);
  }
}

function createProviderContext(): AgentProviderContext {
  return {
    agentServiceId: "agent-service-1",
    providerCode: "openclaw",
    endpointUrl: "http://127.0.0.1:18889",
    authenticationKind: "bearer-token",
    credential: {
      kind: "bearer-token",
      secret: "secret-token",
    },
  };
}

function createSequence(values: string[]): () => string {
  let index = 0;

  return () => {
    const value = values[index];

    if (!value) {
      throw new Error("Sequence exhausted.");
    }

    index += 1;
    return value;
  };
}
