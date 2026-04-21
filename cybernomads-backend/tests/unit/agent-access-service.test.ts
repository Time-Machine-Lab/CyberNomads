import { describe, expect, it } from "vitest";

import { AgentAccessService } from "../../src/modules/agent-access/service.js";
import type {
  AgentProviderConnectionCheckResult,
  AgentProviderContext,
  AgentProviderPort,
  AgentProviderSendMessageInput,
  AgentProviderSendMessageResult,
  AgentProviderSession,
  AgentProviderSessionCreateInput,
  AgentProviderSessionHistoryInput,
  AgentProviderSubagentInvocationInput,
  AgentProviderSubagentInvocationResult,
} from "../../src/ports/agent-provider-port.js";
import type { AgentServiceCredentialStore } from "../../src/ports/agent-service-credential-store-port.js";
import type { AgentServiceStateStore } from "../../src/ports/agent-service-state-store-port.js";
import type {
  AgentConversationMessage,
  AgentServiceConnectionRecord,
  AgentServiceCredentialRecord,
} from "../../src/modules/agent-access/types.js";

describe("agent access service", () => {
  it("forwards task planning and task execution through the provider-neutral port", async () => {
    const stateStore = new InMemoryAgentServiceStateStore();
    const credentialStore = new InMemoryAgentServiceCredentialStore();
    const provider = new FakeAgentProvider("openclaw");
    const service = new AgentAccessService({
      stateStore,
      credentialStore,
      providers: [provider],
      now: () => new Date("2026-04-21T08:00:00.000Z"),
      createAgentServiceId: () => "agent-service-1",
    });

    await service.configureCurrentService({
      providerCode: "openclaw",
      endpointUrl: "http://agent.local:3001",
      authentication: {
        kind: "bearer-token",
        secret: "secret-token",
      },
    });

    await service.verifyCurrentServiceConnection();

    const planningResult = await service.submitTaskPlanningRequest({
      prompt: "Plan tasks for the launch.",
      context: "workspace alpha",
      title: "planning",
    });

    expect(planningResult.outputText).toBe("handled:Plan tasks for the launch.");
    expect(planningResult.history).toEqual([
      {
        role: "system",
        content: "workspace alpha",
      },
      {
        role: "user",
        content: "Plan tasks for the launch.",
      },
      {
        role: "assistant",
        content: "handled:Plan tasks for the launch.",
      },
    ]);

    const executionResult = await service.submitTaskExecutionRequest({
      taskId: "task-1",
      instructions: "Execute the first task.",
      contextDirectory: "D:/cybernomads/work/demo",
      title: "execution",
    });

    expect(executionResult.status).toBe("completed");
    expect(executionResult.outputText).toBe("handled:Execute the first task.");
    expect(executionResult.executionId).toBe("task-1:message-2");
    expect(provider.createSessionCalls).toEqual([
      {
        purpose: "task_planning",
        title: "planning",
        context: "workspace alpha",
      },
      {
        purpose: "task_execution",
        title: "execution",
        context: "D:/cybernomads/work/demo",
      },
    ]);
    expect(provider.sendMessageCalls).toEqual([
      {
        sessionId: "session-1",
        message: "Plan tasks for the launch.",
      },
      {
        sessionId: "session-2",
        message: "Execute the first task.",
      },
    ]);
  });

  it("rejects upper-layer access until the current agent service is connected", async () => {
    const service = new AgentAccessService({
      stateStore: new InMemoryAgentServiceStateStore(),
      credentialStore: new InMemoryAgentServiceCredentialStore(),
      providers: [new FakeAgentProvider("openclaw")],
      createAgentServiceId: () => "agent-service-1",
    });

    await service.configureCurrentService({
      providerCode: "openclaw",
      endpointUrl: "http://agent.local:3001",
      authentication: {
        kind: "bearer-token",
        secret: "secret-token",
      },
    });

    await expect(
      service.submitTaskPlanningRequest({
        prompt: "Plan tasks for the launch.",
      }),
    ).rejects.toMatchObject({
      code: "AGENT_SERVICE_OPERATION_NOT_ALLOWED",
    });
  });
});

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

class FakeAgentProvider implements AgentProviderPort {
  readonly createSessionCalls: AgentProviderSessionCreateInput[] = [];
  readonly sendMessageCalls: AgentProviderSendMessageInput[] = [];
  private readonly sessionMessages = new Map<string, AgentConversationMessage[]>();
  private sessionCounter = 0;
  private messageCounter = 0;

  constructor(readonly providerCode: string) {}

  async verifyConnection(
    _context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult> {
    void _context;

    return {
      isReachable: true,
      reason: "connection ok",
    };
  }

  async prepareCapabilities(
    _context: AgentProviderContext,
  ): Promise<{ isPrepared: boolean; reason: string | null }> {
    void _context;

    return {
      isPrepared: true,
      reason: "capabilities prepared",
    };
  }

  async createSession(
    _context: AgentProviderContext,
    input: AgentProviderSessionCreateInput,
  ): Promise<AgentProviderSession> {
    void _context;

    this.createSessionCalls.push(input);
    this.sessionCounter += 1;
    const sessionId = `session-${this.sessionCounter}`;
    const messages: AgentConversationMessage[] = [];

    if (input.context) {
      messages.push({
        role: "system",
        content: input.context,
      });
    }

    this.sessionMessages.set(sessionId, messages);

    return {
      sessionId,
    };
  }

  async sendMessage(
    _context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSendMessageResult> {
    void _context;

    this.sendMessageCalls.push(input);
    this.messageCounter += 1;
    const messages = this.sessionMessages.get(input.sessionId) ?? [];
    messages.push({
      role: "user",
      content: input.message,
    });
    messages.push({
      role: "assistant",
      content: `handled:${input.message}`,
    });
    this.sessionMessages.set(input.sessionId, messages);

    return {
      messageId: `message-${this.messageCounter}`,
      outputText: `handled:${input.message}`,
    };
  }

  async listSessionMessages(
    _context: AgentProviderContext,
    input: AgentProviderSessionHistoryInput,
  ): Promise<AgentConversationMessage[]> {
    void _context;

    return [...(this.sessionMessages.get(input.sessionId) ?? [])];
  }

  async invokeSubagent(
    _context: AgentProviderContext,
    input: AgentProviderSubagentInvocationInput,
  ): Promise<AgentProviderSubagentInvocationResult> {
    void _context;

    return {
      invocationId: `subagent:${input.sessionId}`,
      outputText: `subagent:${input.instructions}`,
      status: "completed",
    };
  }
}
