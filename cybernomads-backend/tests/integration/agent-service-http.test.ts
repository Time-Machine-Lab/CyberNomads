import { access, mkdtemp, readFile, rm } from "node:fs/promises";
import { join } from "node:path";
import { tmpdir } from "node:os";
import { DatabaseSync } from "node:sqlite";
import { afterAll, describe, expect, it } from "vitest";

import {
  startApplication,
  type ApplicationReadyState,
} from "../../src/app/start-application.js";
import { resolveRuntimePaths } from "../../src/adapters/storage/file-system/runtime-paths.js";
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
import type { AgentConversationMessage } from "../../src/modules/agent-access/types.js";

describe.sequential("agent service module http api", () => {
  const temporaryDirectories: string[] = [];
  const applications: ApplicationReadyState[] = [];

  afterAll(async () => {
    await Promise.all(applications.map((application) => application.close()));
    await Promise.all(
      temporaryDirectories.map((temporaryDirectory) =>
        rm(temporaryDirectory, { recursive: true, force: true }),
      ),
    );
  });

  it("configures, verifies, prepares, and updates the current active agent service", async () => {
    const provider = new FakeAgentProvider("openclaw");
    const { application, workingDirectory } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      [provider],
    );
    const runtimePaths = resolveRuntimePaths(workingDirectory);

    const initialStatusResponse = await fetch(
      `${application.http.url}/api/agent-services/current/status`,
    );
    expect(initialStatusResponse.status).toBe(200);
    await expect(initialStatusResponse.json()).resolves.toMatchObject({
      hasCurrentService: false,
      currentService: null,
      connectionStatus: "not_configured",
      capabilityStatus: "not_ready",
      isUsable: false,
    });

    const configureResponse = await fetch(
      `${application.http.url}/api/agent-services/current`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode: "openclaw",
          endpointUrl: "http://agent.local:3001",
          authentication: {
            kind: "bearer-token",
            secret: "secret-token",
          },
        }),
      },
    );

    expect(configureResponse.status).toBe(201);

    const configuredService = (await configureResponse.json()) as {
      agentServiceId: string;
      providerCode: string;
      endpointUrl: string;
      authenticationKind: string;
      hasCredential: boolean;
      connectionStatus: string;
      capabilityStatus: string;
      isUsable: boolean;
      createdAt: string;
      updatedAt: string;
    };

    expect(configuredService.providerCode).toBe("openclaw");
    expect(configuredService.connectionStatus).toBe("pending_verification");
    expect(configuredService.capabilityStatus).toBe("not_ready");
    expect(configuredService.isUsable).toBe(false);
    expect(configuredService.hasCredential).toBe(true);

    const database = new DatabaseSync(runtimePaths.databaseFile);
    const databaseRow = database
      .prepare(
        `
          SELECT credential_ref AS credentialRef
          FROM agent_service_connections
          WHERE service_scope = 'current'
        `,
      )
      .get() as { credentialRef: string } | undefined;
    database.close();

    expect(databaseRow?.credentialRef).toBe(
      `${configuredService.agentServiceId}.json`,
    );

    const credentialPath = join(
      runtimePaths.runtimeRoot,
      ".agent-service-credentials",
      databaseRow!.credentialRef,
    );
    await expect(access(credentialPath)).resolves.toBeUndefined();
    await expect(readFile(credentialPath, "utf8")).resolves.toContain(
      '"secret":"secret-token"',
    );

    const verifyResponse = await fetch(
      `${application.http.url}/api/agent-services/current/connection-verification`,
      {
        method: "POST",
      },
    );
    expect(verifyResponse.status).toBe(200);

    const verificationResult = (await verifyResponse.json()) as {
      agentServiceId: string;
      connectionStatus: string;
      reason: string | null;
      isUsable: boolean;
      verifiedAt: string;
    };

    expect(verificationResult.agentServiceId).toBe(
      configuredService.agentServiceId,
    );
    expect(verificationResult.connectionStatus).toBe("connected");
    expect(verificationResult.reason).toBe("connection ok");
    expect(verificationResult.isUsable).toBe(true);

    const prepareResponse = await fetch(
      `${application.http.url}/api/agent-services/current/capability-provisioning`,
      {
        method: "POST",
      },
    );
    expect(prepareResponse.status).toBe(200);

    const preparationResult = (await prepareResponse.json()) as {
      capabilityStatus: string;
      reason: string | null;
      connectionStatus: string;
      isUsable: boolean;
      preparedAt: string | null;
    };

    expect(preparationResult.capabilityStatus).toBe("ready");
    expect(preparationResult.reason).toBe("capabilities prepared");
    expect(preparationResult.connectionStatus).toBe("connected");
    expect(preparationResult.isUsable).toBe(true);
    expect(preparationResult.preparedAt).not.toBeNull();

    const currentResponse = await fetch(
      `${application.http.url}/api/agent-services/current`,
    );
    const currentService = (await currentResponse.json()) as {
      agentServiceId: string;
      connectionStatus: string;
      capabilityStatus: string;
      isUsable: boolean;
    };

    expect(currentService.agentServiceId).toBe(
      configuredService.agentServiceId,
    );
    expect(currentService.connectionStatus).toBe("connected");
    expect(currentService.capabilityStatus).toBe("ready");
    expect(currentService.isUsable).toBe(true);

    const updateResponse = await fetch(
      `${application.http.url}/api/agent-services/current`,
      {
        method: "PUT",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode: "openclaw",
          endpointUrl: "http://agent.local:4001",
          authentication: {
            kind: "api-key",
            secret: "updated-token",
          },
        }),
      },
    );
    expect(updateResponse.status).toBe(200);

    const updatedService = (await updateResponse.json()) as {
      agentServiceId: string;
      endpointUrl: string;
      authenticationKind: string;
      connectionStatus: string;
      capabilityStatus: string;
    };

    expect(updatedService.agentServiceId).not.toBe(
      configuredService.agentServiceId,
    );
    expect(updatedService.endpointUrl).toBe("http://agent.local:4001/");
    expect(updatedService.authenticationKind).toBe("api-key");
    expect(updatedService.connectionStatus).toBe("pending_verification");
    expect(updatedService.capabilityStatus).toBe("not_ready");

    const updatedStatusResponse = await fetch(
      `${application.http.url}/api/agent-services/current/status`,
    );
    const updatedStatus = (await updatedStatusResponse.json()) as {
      currentService: { agentServiceId: string; endpointUrl: string } | null;
      connectionStatus: string;
      capabilityStatus: string;
      isUsable: boolean;
    };

    expect(updatedStatus.currentService?.agentServiceId).toBe(
      updatedService.agentServiceId,
    );
    expect(updatedStatus.currentService?.endpointUrl).toBe(
      "http://agent.local:4001/",
    );
    expect(updatedStatus.connectionStatus).toBe("pending_verification");
    expect(updatedStatus.capabilityStatus).toBe("not_ready");
    expect(updatedStatus.isUsable).toBe(false);

    expect(provider.verifyCalls).toHaveLength(1);
    expect(provider.prepareCalls).toHaveLength(1);
    expect(provider.verifyCalls[0]?.credential.secret).toBe("secret-token");
    expect(provider.prepareCalls[0]?.credential.secret).toBe("secret-token");
  });

  it("returns explicit conflict and failure states for duplicate configuration and unavailable providers", async () => {
    const { application } = await startTemporaryApplication(
      temporaryDirectories,
      applications,
      [],
    );

    const configureResponse = await fetch(
      `${application.http.url}/api/agent-services/current`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode: "missing-provider",
          endpointUrl: "http://agent.local:3001",
          authentication: {
            kind: "bearer-token",
            secret: "missing-secret",
          },
        }),
      },
    );

    expect(configureResponse.status).toBe(201);

    const duplicateConfigureResponse = await fetch(
      `${application.http.url}/api/agent-services/current`,
      {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          providerCode: "missing-provider",
          endpointUrl: "http://agent.local:3001",
          authentication: {
            kind: "bearer-token",
            secret: "missing-secret",
          },
        }),
      },
    );

    expect(duplicateConfigureResponse.status).toBe(409);
    await expect(duplicateConfigureResponse.json()).resolves.toMatchObject({
      code: "CURRENT_AGENT_SERVICE_ALREADY_EXISTS",
    });

    const verifyResponse = await fetch(
      `${application.http.url}/api/agent-services/current/connection-verification`,
      {
        method: "POST",
      },
    );

    expect(verifyResponse.status).toBe(200);
    await expect(verifyResponse.json()).resolves.toMatchObject({
      connectionStatus: "connection_failed",
      isUsable: false,
      reason: 'Provider "missing-provider" is not available.',
    });

    const statusResponse = await fetch(
      `${application.http.url}/api/agent-services/current/status`,
    );

    expect(statusResponse.status).toBe(200);
    await expect(statusResponse.json()).resolves.toMatchObject({
      hasCurrentService: true,
      connectionStatus: "connection_failed",
      capabilityStatus: "not_ready",
      isUsable: false,
      warning: 'Provider "missing-provider" is not available.',
    });

    const prepareResponse = await fetch(
      `${application.http.url}/api/agent-services/current/capability-provisioning`,
      {
        method: "POST",
      },
    );

    expect(prepareResponse.status).toBe(409);
    await expect(prepareResponse.json()).resolves.toMatchObject({
      code: "AGENT_SERVICE_OPERATION_NOT_ALLOWED",
    });
  });
});

async function startTemporaryApplication(
  temporaryDirectories: string[],
  applications: ApplicationReadyState[],
  agentProviders: AgentProviderPort[],
): Promise<{ application: ApplicationReadyState; workingDirectory: string }> {
  const workingDirectory = await mkdtemp(
    join(tmpdir(), "cybernomads-agent-service-module-"),
  );
  temporaryDirectories.push(workingDirectory);

  const application = await startApplication({
    workingDirectory,
    port: 0,
    agentProviders,
  });
  applications.push(application);

  return {
    application,
    workingDirectory,
  };
}

class FakeAgentProvider implements AgentProviderPort {
  readonly verifyCalls: AgentProviderContext[] = [];
  readonly prepareCalls: AgentProviderContext[] = [];
  private readonly sessionMessages = new Map<
    string,
    AgentConversationMessage[]
  >();
  private sessionCounter = 0;
  private messageCounter = 0;

  constructor(readonly providerCode: string) {}

  async verifyConnection(
    context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult> {
    this.verifyCalls.push(context);
    return {
      isReachable: true,
      reason: "connection ok",
    };
  }

  async prepareCapabilities(
    context: AgentProviderContext,
  ): Promise<{ isPrepared: boolean; reason: string | null }> {
    this.prepareCalls.push(context);
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
