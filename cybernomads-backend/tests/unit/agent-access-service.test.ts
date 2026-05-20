import { describe, expect, it } from "vitest";

import { AgentAccessService } from "../../src/modules/agent-access/service.js";
import type {
  AgentProviderConnectionCheckResult,
  AgentProviderContext,
  AgentProviderPort,
  AgentProviderSendMessageInput,
  AgentProviderSubmitMessageResult,
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
  AgentServicePurpose,
} from "../../src/modules/agent-access/types.js";
import type {
  AgentInteractionLogEvent,
  AgentInteractionLogRecorderPort,
} from "../../src/ports/agent-interaction-log-recorder-port.js";

describe("agent access service", () => {
  it("forwards task planning and task execution through the provider-neutral port", async () => {
    const stateStore = new InMemoryAgentServiceStateStore();
    const credentialStore = new InMemoryAgentServiceCredentialStore();
    const planningProvider = new FakeAgentProvider("cybernomads-agent");
    const executionProvider = new FakeAgentProvider("openclaw");
    const service = new AgentAccessService({
      stateStore,
      credentialStore,
      providers: [planningProvider, executionProvider],
      now: () => new Date("2026-04-21T08:00:00.000Z"),
      createAgentServiceId: createSequentialId("agent-service"),
    });

    await service.configureCurrentService({
      purpose: "planning",
      providerCode: "cybernomads-agent",
      endpointUrl: "http://gpt.local/v1",
      model: "gpt-5.5",
      reasoningEffort: "low",
      authentication: {
        kind: "api-key",
        secret: "planning-secret",
      },
    });
    await service.verifyServiceConnection("planning");

    await service.configureCurrentService({
      purpose: "execution",
      providerCode: "openclaw",
      endpointUrl: "http://agent.local:3001",
      authentication: {
        kind: "bearer-token",
        secret: "execution-secret",
      },
    });
    await service.verifyCurrentServiceConnection();

    const planningResult = await service.submitTaskPlanningRequest({
      prompt: "Plan tasks for the launch.",
      context: "workspace alpha",
      title: "planning",
    });

    expect(planningResult.outputText).toContain("Plan tasks for the launch.");
    expect(planningResult.history).toEqual([
      {
        role: "system",
        content: "workspace alpha",
      },
      {
        role: "user",
        content: expect.stringContaining("Plan tasks for the launch."),
      },
      {
        role: "assistant",
        content: expect.stringContaining("Plan tasks for the launch."),
      },
    ]);

    const executionResult = await service.submitTaskExecutionRequest({
      taskId: "task-1",
      instructions: "Execute the first task.",
      contextDirectory: "D:/cybernomads/work/demo",
      title: "execution",
    });

    expect(executionResult.status).toBe("completed");
    expect(executionResult.outputText).toContain("Execute the first task.");
    expect(executionResult.executionId).toBe("task-1:message-1");
    expect(planningProvider.createSessionCalls).toEqual([
      {
        purpose: "task_planning",
        title: "planning",
        context: "workspace alpha",
      },
    ]);
    expect(executionProvider.createSessionCalls).toEqual([
      {
        purpose: "task_execution",
        title: "execution",
        context: "D:/cybernomads/work/demo",
      },
    ]);
    expect(planningProvider.sendMessageCalls).toEqual([
      {
        sessionId: "session-1",
        message: expect.stringContaining("$cybernomads-task-decomposition"),
      },
    ]);
    expect(executionProvider.sendMessageCalls).toEqual([
      {
        sessionId: "session-1",
        message: expect.stringContaining("$cybernomads-task-execution"),
      },
    ]);
    expect(planningProvider.sendMessageCalls[0]?.message).toContain(
      "Plan tasks for the launch.",
    );
    expect(planningProvider.sendMessageCalls[0]?.message).toContain(
      "$cybernomads-task-decomposition",
    );
    expect(executionProvider.sendMessageCalls[0]?.message).toContain(
      "Execute the first task.",
    );
    expect(planningProvider.submitMessageCalls).toEqual([]);
    expect(executionProvider.submitMessageCalls).toEqual([]);
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
      service.submitTaskExecutionRequest({
        taskId: "task-1",
        instructions: "Execute the first task.",
      }),
    ).rejects.toMatchObject({
      code: "AGENT_SERVICE_OPERATION_NOT_ALLOWED",
    });
  });

  it("submits task decomposition requests without waiting for agent completion", async () => {
    const stateStore = new InMemoryAgentServiceStateStore();
    const credentialStore = new InMemoryAgentServiceCredentialStore();
    const provider = new FakeAgentProvider("cybernomads-agent");
    const service = new AgentAccessService({
      stateStore,
      credentialStore,
      providers: [provider],
      now: () => new Date("2026-04-21T08:00:00.000Z"),
      createAgentServiceId: () => "agent-service-1",
    });

    await service.configureCurrentService({
      purpose: "planning",
      providerCode: "cybernomads-agent",
      endpointUrl: "http://gpt.local/v1",
      model: "gpt-5.5",
      reasoningEffort: "low",
      authentication: {
        kind: "api-key",
        secret: "secret-token",
      },
    });
    await service.verifyServiceConnection("planning");
    await service.prepareAgentServiceCapabilities("planning");

    const result = await service.submitTaskDecompositionRequest({
      prompt: "Decompose the current traffic work.",
      context: "traffic-work context",
      title: "traffic-work:1",
    });

    expect(result).toEqual({
      sessionId: "session-1",
      messageId: "message-1",
    });
    expect(provider.submitMessageCalls).toEqual([
      {
        sessionId: "session-1",
        message: expect.stringContaining("$cybernomads-task-decomposition"),
      },
    ]);
    expect(provider.submitMessageCalls[0]?.message).toContain(
      "Decompose the current traffic work.",
    );
  });

  it("records decomposition submission and task execution history without exposing provider-specific contracts", async () => {
    const stateStore = new InMemoryAgentServiceStateStore();
    const credentialStore = new InMemoryAgentServiceCredentialStore();
    const planningProvider = new FakeAgentProvider("cybernomads-agent");
    const executionProvider = new FakeAgentProvider("openclaw");
    const recorder = new InMemoryAgentInteractionLogRecorder();
    const service = new AgentAccessService({
      stateStore,
      credentialStore,
      providers: [planningProvider, executionProvider],
      agentInteractionLogRecorder: recorder,
      now: () => new Date("2026-05-11T08:00:00.000Z"),
      createAgentServiceId: createSequentialId("agent-service"),
    });

    await service.configureCurrentService({
      purpose: "planning",
      providerCode: "cybernomads-agent",
      endpointUrl: "http://gpt.local/v1",
      model: "gpt-5.5",
      reasoningEffort: "low",
      authentication: {
        kind: "api-key",
        secret: "planning-secret",
      },
    });
    await service.verifyServiceConnection("planning");
    await service.prepareAgentServiceCapabilities("planning");
    await service.configureCurrentService({
      purpose: "execution",
      providerCode: "openclaw",
      endpointUrl: "http://agent.local:3001",
      authentication: {
        kind: "bearer-token",
        secret: "execution-secret",
      },
    });
    await service.verifyCurrentServiceConnection();

    await service.submitTaskDecompositionRequest({
      trafficWorkId: "traffic-work-1",
      prompt: "Decompose the current traffic work.",
      context: "traffic-work context",
      title: "traffic-work:1",
    });
    await service.submitTaskExecutionRequest({
      taskId: "task-1",
      instructions: "Execute the first task.",
      contextDirectory: "D:/cybernomads/work/demo",
      title: "execution",
    });

    expect(recorder.events.map((event) => event.eventType)).toEqual([
      "task-decomposition-submitting",
      "task-decomposition-accepted",
      "task-execution-submitted",
      "task-execution-completed",
    ]);
    expect(recorder.events[0]).toMatchObject({
      scope: {
        kind: "traffic-work",
        trafficWorkId: "traffic-work-1",
      },
      correlation: {
        trafficWorkId: "traffic-work-1",
        sessionId: "session-1",
        providerCode: "cybernomads-agent",
      },
      skills: ["cybernomads-task-decomposition"],
    });
    expect(recorder.events[3]).toMatchObject({
      scope: {
        kind: "task",
        taskId: "task-1",
      },
      correlation: {
        taskId: "task-1",
        sessionId: "session-1",
        messageId: "message-1",
      },
      output: {
        status: "completed",
      },
    });
    expect(recorder.events[3]?.skills).toBeUndefined();
    expect(recorder.events[3]?.messages).toEqual([
      {
        role: "system",
        content: "D:/cybernomads/work/demo",
      },
      {
        role: "user",
        content: expect.stringContaining("Execute the first task."),
      },
      {
        role: "assistant",
        content: expect.stringContaining("Execute the first task."),
      },
    ]);
  });

  it("does not fail agent submission when interaction logging fails", async () => {
    const stateStore = new InMemoryAgentServiceStateStore();
    const credentialStore = new InMemoryAgentServiceCredentialStore();
    const provider = new FakeAgentProvider("cybernomads-agent");
    const service = new AgentAccessService({
      stateStore,
      credentialStore,
      providers: [provider],
      agentInteractionLogRecorder: new FailingAgentInteractionLogRecorder(),
      now: () => new Date("2026-05-11T08:00:00.000Z"),
      createAgentServiceId: () => "agent-service-1",
    });

    await service.configureCurrentService({
      purpose: "planning",
      providerCode: "cybernomads-agent",
      endpointUrl: "http://gpt.local/v1",
      model: "gpt-5.5",
      reasoningEffort: "low",
      authentication: {
        kind: "api-key",
        secret: "secret-token",
      },
    });
    await service.verifyServiceConnection("planning");
    await service.prepareAgentServiceCapabilities("planning");

    await expect(
      service.submitTaskDecompositionRequest({
        trafficWorkId: "traffic-work-1",
        prompt: "Decompose the current traffic work.",
        context: "traffic-work context",
        title: "traffic-work:1",
      }),
    ).resolves.toEqual({
      sessionId: "session-1",
      messageId: "message-1",
    });
  });
});

class InMemoryAgentServiceStateStore implements AgentServiceStateStore {
  private readonly services = new Map<
    AgentServicePurpose,
    AgentServiceConnectionRecord
  >();

  async getServiceByPurpose(
    purpose: AgentServicePurpose,
  ): Promise<AgentServiceConnectionRecord | undefined> {
    const service = this.services.get(purpose);
    return service ? { ...service, providerSettings: { ...service.providerSettings } } : undefined;
  }

  async listServices(): Promise<AgentServiceConnectionRecord[]> {
    return Array.from(this.services.values()).map((service) => ({
      ...service,
      providerSettings: { ...service.providerSettings },
    }));
  }

  async saveService(record: AgentServiceConnectionRecord): Promise<void> {
    this.services.set(record.serviceScope, {
      ...record,
      providerSettings: { ...record.providerSettings },
    });
  }

  close(): void {}
}

class InMemoryAgentServiceCredentialStore implements AgentServiceCredentialStore {
  private readonly credentials = new Map<
    string,
    AgentServiceCredentialRecord
  >();

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
  readonly submitMessageCalls: AgentProviderSendMessageInput[] = [];
  readonly sendMessageCalls: AgentProviderSendMessageInput[] = [];
  private readonly sessionMessages = new Map<
    string,
    AgentConversationMessage[]
  >();
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

  async submitMessage(
    _context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSubmitMessageResult> {
    void _context;

    this.submitMessageCalls.push(input);
    this.messageCounter += 1;
    const messages = this.sessionMessages.get(input.sessionId) ?? [];
    messages.push({
      role: "user",
      content: input.message,
    });
    this.sessionMessages.set(input.sessionId, messages);

    return {
      messageId: `message-${this.messageCounter}`,
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

class InMemoryAgentInteractionLogRecorder
  implements AgentInteractionLogRecorderPort
{
  readonly events: AgentInteractionLogEvent[] = [];

  async appendEvent(event: AgentInteractionLogEvent): Promise<void> {
    this.events.push(structuredClone(event));
  }
}

class FailingAgentInteractionLogRecorder
  implements AgentInteractionLogRecorderPort
{
  async appendEvent(_event: AgentInteractionLogEvent): Promise<void> {
    void _event;
    throw new Error("log write failed");
  }
}

function createSequentialId(prefix: string): () => string {
  let tick = 0;

  return () => {
    tick += 1;
    return `${prefix}-${tick}`;
  };
}
