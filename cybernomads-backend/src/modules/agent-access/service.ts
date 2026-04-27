import { randomUUID } from "node:crypto";

import {
  type AgentProviderContext,
  type AgentProviderPort,
} from "../../ports/agent-provider-port.js";
import type { AgentServiceCredentialStore } from "../../ports/agent-service-credential-store-port.js";
import type { AgentServiceStateStore } from "../../ports/agent-service-state-store-port.js";
import {
  renderTaskDecompositionSkillInstruction,
  renderTaskExecutionSkillInstruction,
} from "../../shared/agent-task-skill-instructions.js";
import {
  AgentServiceOperationConflictError,
  AgentServiceUnavailableError,
  AgentServiceValidationError,
  CurrentAgentServiceAlreadyExistsError,
  CurrentAgentServiceNotFoundError,
} from "./errors.js";
import {
  CURRENT_AGENT_SERVICE_SCOPE,
  type AgentServiceAuthenticationInput,
  type AgentServiceConnectionRecord,
  type AgentServiceCredentialRecord,
  type AgentServiceStatusSnapshot,
  type CapabilityProvisioningResult,
  type ConfigureAgentServiceInput,
  type ConnectionVerificationResult,
  type CurrentAgentService,
  type TaskDecompositionRequest,
  type TaskDecompositionResult,
  type TaskExecutionRequest,
  type TaskExecutionResult,
  type TaskPlanningRequest,
  type TaskPlanningResult,
  type UpdateAgentServiceInput,
} from "./types.js";

export interface AgentAccessServiceOptions {
  stateStore: AgentServiceStateStore;
  credentialStore: AgentServiceCredentialStore;
  providers?: Iterable<AgentProviderPort>;
  now?: () => Date;
  createAgentServiceId?: () => string;
}

export class AgentAccessService {
  private readonly providers: Map<string, AgentProviderPort>;
  private readonly now: () => Date;
  private readonly createAgentServiceId: () => string;

  constructor(private readonly options: AgentAccessServiceOptions) {
    this.providers = new Map(
      Array.from(options.providers ?? []).map((provider) => [
        normalizeCode(provider.providerCode),
        provider,
      ]),
    );
    this.now = options.now ?? (() => new Date());
    this.createAgentServiceId =
      options.createAgentServiceId ?? (() => randomUUID());
  }

  async configureCurrentService(
    input: ConfigureAgentServiceInput,
  ): Promise<CurrentAgentService> {
    const existing = await this.options.stateStore.getCurrentService();

    if (existing) {
      throw new CurrentAgentServiceAlreadyExistsError();
    }

    const normalizedInput = normalizeServiceInput(input);
    const timestamp = this.now().toISOString();
    const agentServiceId = this.createAgentServiceId();
    const credentialRef = createCredentialRef(agentServiceId);

    await this.options.credentialStore.writeCredential(credentialRef, {
      kind: normalizedInput.authentication.kind,
      secret: normalizedInput.authentication.secret,
    });

    try {
      const record: AgentServiceConnectionRecord = {
        serviceScope: CURRENT_AGENT_SERVICE_SCOPE,
        agentServiceId,
        providerCode: normalizedInput.providerCode,
        endpointUrl: normalizedInput.endpointUrl,
        authenticationKind: normalizedInput.authentication.kind,
        credentialRef,
        connectionStatus: "pending_verification",
        connectionStatusReason: null,
        capabilityStatus: "not_ready",
        capabilityStatusReason: null,
        lastVerifiedAt: null,
        lastConnectedAt: null,
        capabilityPreparedAt: null,
        createdAt: timestamp,
        updatedAt: timestamp,
      };

      await this.options.stateStore.saveCurrentService(record);

      return toCurrentAgentService(record);
    } catch (error) {
      await this.options.credentialStore.deleteCredential(credentialRef);
      throw error;
    }
  }

  async updateCurrentService(
    input: UpdateAgentServiceInput,
  ): Promise<CurrentAgentService> {
    const existing = await this.getCurrentServiceRecord();
    const normalizedInput = normalizeServiceInput(input);
    const timestamp = this.now().toISOString();
    const nextAgentServiceId = this.createAgentServiceId();
    const nextCredentialRef = createCredentialRef(nextAgentServiceId);

    await this.options.credentialStore.writeCredential(nextCredentialRef, {
      kind: normalizedInput.authentication.kind,
      secret: normalizedInput.authentication.secret,
    });

    try {
      const record: AgentServiceConnectionRecord = {
        serviceScope: CURRENT_AGENT_SERVICE_SCOPE,
        agentServiceId: nextAgentServiceId,
        providerCode: normalizedInput.providerCode,
        endpointUrl: normalizedInput.endpointUrl,
        authenticationKind: normalizedInput.authentication.kind,
        credentialRef: nextCredentialRef,
        connectionStatus: "pending_verification",
        connectionStatusReason: null,
        capabilityStatus: "not_ready",
        capabilityStatusReason: null,
        lastVerifiedAt: null,
        lastConnectedAt: null,
        capabilityPreparedAt: null,
        createdAt: existing.createdAt,
        updatedAt: timestamp,
      };

      await this.options.stateStore.saveCurrentService(record);
      await this.options.credentialStore.deleteCredential(
        existing.credentialRef,
      );

      return toCurrentAgentService(record);
    } catch (error) {
      await this.options.credentialStore.deleteCredential(nextCredentialRef);
      throw error;
    }
  }

  async getCurrentAgentService(): Promise<CurrentAgentService> {
    return toCurrentAgentService(await this.getCurrentServiceRecord());
  }

  async getCurrentAgentServiceStatus(): Promise<AgentServiceStatusSnapshot> {
    const currentService = await this.options.stateStore.getCurrentService();

    if (!currentService) {
      return {
        hasCurrentService: false,
        currentService: null,
        connectionStatus: "not_configured",
        capabilityStatus: "not_ready",
        isUsable: false,
        warning: "No current active agent service is configured.",
      };
    }

    return {
      hasCurrentService: true,
      currentService: toCurrentAgentService(currentService),
      connectionStatus: currentService.connectionStatus,
      capabilityStatus: currentService.capabilityStatus,
      isUsable: isCurrentServiceUsable(currentService),
      warning: deriveStatusWarning(currentService),
    };
  }

  async verifyCurrentServiceConnection(): Promise<ConnectionVerificationResult> {
    const currentService = await this.getCurrentServiceRecord();
    const verifiedAt = this.now().toISOString();

    let connectionStatus: ConnectionVerificationResult["connectionStatus"];
    let reason: string | null = null;

    try {
      const providerAccess = await this.loadProviderAccess(currentService);
      const verification = await providerAccess.provider.verifyConnection(
        providerAccess.context,
      );

      connectionStatus = verification.isReachable
        ? "connected"
        : "connection_failed";
      reason = verification.reason;
    } catch (error) {
      connectionStatus = "connection_failed";
      reason = toErrorMessage(error);
    }

    const nextRecord: AgentServiceConnectionRecord = {
      ...currentService,
      connectionStatus,
      connectionStatusReason: reason,
      lastVerifiedAt: verifiedAt,
      lastConnectedAt:
        connectionStatus === "connected"
          ? verifiedAt
          : currentService.lastConnectedAt,
      updatedAt: verifiedAt,
    };

    await this.options.stateStore.saveCurrentService(nextRecord);

    return {
      agentServiceId: nextRecord.agentServiceId,
      connectionStatus,
      reason,
      isUsable: isCurrentServiceUsable(nextRecord),
      verifiedAt,
    };
  }

  async prepareCurrentAgentServiceCapabilities(): Promise<CapabilityProvisioningResult> {
    const currentService = await this.getCurrentServiceRecord();

    if (currentService.connectionStatus !== "connected") {
      throw new AgentServiceOperationConflictError(
        "Capabilities can only be prepared for a connected current agent service.",
      );
    }

    const startedAt = this.now().toISOString();
    const preparingRecord: AgentServiceConnectionRecord = {
      ...currentService,
      capabilityStatus: "preparing",
      capabilityStatusReason: null,
      updatedAt: startedAt,
    };
    await this.options.stateStore.saveCurrentService(preparingRecord);

    try {
      const providerAccess = await this.loadProviderAccess(preparingRecord);
      const preparation = await providerAccess.provider.prepareCapabilities(
        providerAccess.context,
      );
      const finishedAt = this.now().toISOString();
      const nextRecord: AgentServiceConnectionRecord = {
        ...preparingRecord,
        capabilityStatus: preparation.isPrepared ? "ready" : "prepare_failed",
        capabilityStatusReason: preparation.reason,
        capabilityPreparedAt: preparation.isPrepared
          ? finishedAt
          : currentService.capabilityPreparedAt,
        updatedAt: finishedAt,
      };

      await this.options.stateStore.saveCurrentService(nextRecord);

      return {
        agentServiceId: nextRecord.agentServiceId,
        capabilityStatus: nextRecord.capabilityStatus,
        reason: nextRecord.capabilityStatusReason,
        connectionStatus: nextRecord.connectionStatus,
        isUsable: isCurrentServiceUsable(nextRecord),
        preparedAt: nextRecord.capabilityPreparedAt,
      };
    } catch (error) {
      const finishedAt = this.now().toISOString();
      const nextRecord: AgentServiceConnectionRecord = {
        ...preparingRecord,
        capabilityStatus: "prepare_failed",
        capabilityStatusReason: toErrorMessage(error),
        updatedAt: finishedAt,
      };

      await this.options.stateStore.saveCurrentService(nextRecord);

      return {
        agentServiceId: nextRecord.agentServiceId,
        capabilityStatus: nextRecord.capabilityStatus,
        reason: nextRecord.capabilityStatusReason,
        connectionStatus: nextRecord.connectionStatus,
        isUsable: isCurrentServiceUsable(nextRecord),
        preparedAt: nextRecord.capabilityPreparedAt,
      };
    }
  }

  async submitTaskPlanningRequest(
    request: TaskPlanningRequest,
  ): Promise<TaskPlanningResult> {
    const providerAccess = await this.loadCurrentServiceForUpperLayerAccess();
    const normalizedRequest = normalizeTaskPlanningRequest(request);
    const session = await providerAccess.provider.createSession(
      providerAccess.context,
      {
        purpose: "task_planning",
        title: normalizedRequest.title ?? null,
        context: normalizedRequest.context ?? null,
      },
    );
    const messageResult = await providerAccess.provider.sendMessage(
      providerAccess.context,
      {
        sessionId: session.sessionId,
        message: [
          renderTaskDecompositionSkillInstruction(),
          normalizedRequest.prompt,
        ].join("\n\n"),
      },
    );
    const history = await providerAccess.provider.listSessionMessages(
      providerAccess.context,
      {
        sessionId: session.sessionId,
      },
    );

    return {
      sessionId: session.sessionId,
      outputText: messageResult.outputText,
      history,
    };
  }

  async submitTaskDecompositionRequest(
    request: TaskDecompositionRequest,
  ): Promise<TaskDecompositionResult> {
    const providerAccess = await this.loadCurrentServiceForTaskDecomposition();
    const normalizedRequest = normalizeTaskDecompositionRequest(request);
    const session = await providerAccess.provider.createSession(
      providerAccess.context,
      {
        purpose: "task_planning",
        title: normalizedRequest.title ?? null,
        context: normalizedRequest.context,
      },
    );
    const messageResult = await providerAccess.provider.submitMessage(
      providerAccess.context,
      {
        sessionId: session.sessionId,
        message: [
          renderTaskDecompositionSkillInstruction(),
          normalizedRequest.prompt,
        ].join("\n\n"),
      },
    );

    return {
      sessionId: session.sessionId,
      messageId: messageResult.messageId,
    };
  }

  async submitTaskExecutionRequest(
    request: TaskExecutionRequest,
  ): Promise<TaskExecutionResult> {
    const providerAccess = await this.loadCurrentServiceForUpperLayerAccess();
    const normalizedRequest = normalizeTaskExecutionRequest(request);
    const session = await providerAccess.provider.createSession(
      providerAccess.context,
      {
        purpose: "task_execution",
        title: normalizedRequest.title ?? null,
        context: normalizedRequest.contextDirectory ?? null,
      },
    );
    const messageResult = await providerAccess.provider.sendMessage(
      providerAccess.context,
      {
        sessionId: session.sessionId,
        message: [
          renderTaskExecutionSkillInstruction(normalizedRequest.taskId),
          normalizedRequest.instructions,
        ].join("\n\n"),
      },
    );
    const history = await providerAccess.provider.listSessionMessages(
      providerAccess.context,
      {
        sessionId: session.sessionId,
      },
    );

    return {
      sessionId: session.sessionId,
      executionId: `${normalizedRequest.taskId}:${messageResult.messageId}`,
      outputText: messageResult.outputText,
      status: "completed",
      history,
    };
  }

  close(): void {
    this.options.stateStore.close();
  }

  private async getCurrentServiceRecord(): Promise<AgentServiceConnectionRecord> {
    const currentService = await this.options.stateStore.getCurrentService();

    if (!currentService) {
      throw new CurrentAgentServiceNotFoundError();
    }

    return currentService;
  }

  private async loadCurrentServiceForUpperLayerAccess(): Promise<{
    provider: AgentProviderPort;
    context: AgentProviderContext;
  }> {
    const currentService = await this.getCurrentServiceRecord();

    if (currentService.connectionStatus !== "connected") {
      throw new AgentServiceOperationConflictError(
        "The current agent service must be connected before upper-layer access can be used.",
      );
    }

    return this.loadProviderAccess(currentService);
  }

  private async loadCurrentServiceForTaskDecomposition(): Promise<{
    provider: AgentProviderPort;
    context: AgentProviderContext;
  }> {
    const currentService = await this.getCurrentServiceRecord();

    if (currentService.connectionStatus !== "connected") {
      throw new AgentServiceOperationConflictError(
        "The current agent service must be connected before task decomposition can be used.",
      );
    }

    if (currentService.capabilityStatus !== "ready") {
      throw new AgentServiceOperationConflictError(
        "The current agent service capabilities must be prepared before task decomposition can be used.",
      );
    }

    return this.loadProviderAccess(currentService);
  }

  private async loadProviderAccess(
    currentService: AgentServiceConnectionRecord,
  ): Promise<{
    provider: AgentProviderPort;
    context: AgentProviderContext;
  }> {
    const provider = this.providers.get(
      normalizeCode(currentService.providerCode),
    );

    if (!provider) {
      throw new AgentServiceUnavailableError(
        `Provider "${currentService.providerCode}" is not available.`,
      );
    }

    let credential: AgentServiceCredentialRecord;

    try {
      credential = await this.options.credentialStore.readCredential(
        currentService.credentialRef,
      );
    } catch (error) {
      throw new AgentServiceUnavailableError(
        "Credential for the current agent service is unavailable.",
        { cause: error },
      );
    }

    return {
      provider,
      context: {
        agentServiceId: currentService.agentServiceId,
        providerCode: currentService.providerCode,
        endpointUrl: currentService.endpointUrl,
        authenticationKind: currentService.authenticationKind,
        credential,
      },
    };
  }
}

function normalizeServiceInput(
  input: ConfigureAgentServiceInput | UpdateAgentServiceInput,
): ConfigureAgentServiceInput | UpdateAgentServiceInput {
  const providerCode = normalizeRequiredString(
    input.providerCode,
    "Provider code is required.",
  );
  const endpointUrl = normalizeEndpointUrl(input.endpointUrl);
  const authentication = normalizeAuthenticationInput(input.authentication);

  return {
    providerCode,
    endpointUrl,
    authentication,
  };
}

function normalizeAuthenticationInput(
  authentication: AgentServiceAuthenticationInput,
): AgentServiceAuthenticationInput {
  if (
    typeof authentication !== "object" ||
    authentication === null ||
    Array.isArray(authentication)
  ) {
    throw new AgentServiceValidationError("Authentication is required.");
  }

  return {
    kind: normalizeRequiredString(
      authentication.kind,
      "Authentication kind is required.",
    ),
    secret: normalizeRequiredString(
      authentication.secret,
      "Authentication secret is required.",
    ),
  };
}

function normalizeEndpointUrl(endpointUrl: string): string {
  const normalizedEndpointUrl = normalizeRequiredString(
    endpointUrl,
    "Endpoint URL is required.",
  );

  try {
    return new URL(normalizedEndpointUrl).toString();
  } catch (error) {
    throw new AgentServiceValidationError("Endpoint URL must be a valid URI.", {
      cause: error,
    });
  }
}

function normalizeRequiredString(value: string, message: string): string {
  if (typeof value !== "string") {
    throw new AgentServiceValidationError(message);
  }

  const normalizedValue = value.trim();

  if (normalizedValue.length === 0) {
    throw new AgentServiceValidationError(message);
  }

  return normalizedValue;
}

function normalizeCode(value: string): string {
  return value.trim().toLowerCase();
}

function createCredentialRef(agentServiceId: string): string {
  return `${agentServiceId}.json`;
}

function toCurrentAgentService(
  record: AgentServiceConnectionRecord,
): CurrentAgentService {
  return {
    agentServiceId: record.agentServiceId,
    providerCode: record.providerCode,
    endpointUrl: record.endpointUrl,
    authenticationKind: record.authenticationKind,
    hasCredential: record.credentialRef.length > 0,
    connectionStatus: record.connectionStatus,
    connectionStatusReason: record.connectionStatusReason,
    capabilityStatus: record.capabilityStatus,
    capabilityStatusReason: record.capabilityStatusReason,
    isActive: true,
    isUsable: isCurrentServiceUsable(record),
    lastVerifiedAt: record.lastVerifiedAt,
    lastConnectedAt: record.lastConnectedAt,
    capabilityPreparedAt: record.capabilityPreparedAt,
    createdAt: record.createdAt,
    updatedAt: record.updatedAt,
  };
}

function isCurrentServiceUsable(record: AgentServiceConnectionRecord): boolean {
  return record.connectionStatus === "connected";
}

function deriveStatusWarning(
  record: AgentServiceConnectionRecord,
): string | null {
  if (record.connectionStatus === "connection_failed") {
    return (
      record.connectionStatusReason ??
      "The current agent service connection verification failed."
    );
  }

  if (record.capabilityStatus === "prepare_failed") {
    return (
      record.capabilityStatusReason ??
      "Capability preparation for the current agent service failed."
    );
  }

  if (record.capabilityStatus === "not_ready") {
    return "Capabilities are not prepared for the current agent service.";
  }

  if (record.capabilityStatus === "preparing") {
    return "Capabilities are being prepared for the current agent service.";
  }

  return null;
}

function normalizeTaskPlanningRequest(
  request: TaskPlanningRequest,
): TaskPlanningRequest {
  return {
    prompt: normalizeRequiredString(
      request.prompt,
      "Task planning prompt is required.",
    ),
    context:
      request.context === undefined
        ? undefined
        : normalizeRequiredString(
            request.context,
            "Task planning context must be a non-empty string.",
          ),
    title:
      request.title === undefined
        ? undefined
        : normalizeRequiredString(
            request.title,
            "Task planning title must be a non-empty string.",
          ),
  };
}

function normalizeTaskDecompositionRequest(
  request: TaskDecompositionRequest,
): TaskDecompositionRequest {
  return {
    prompt: normalizeRequiredString(
      request.prompt,
      "Task decomposition prompt is required.",
    ),
    context: normalizeRequiredString(
      request.context,
      "Task decomposition context is required.",
    ),
    title:
      request.title === undefined
        ? undefined
        : normalizeRequiredString(
            request.title,
            "Task decomposition title must be a non-empty string.",
          ),
  };
}

function normalizeTaskExecutionRequest(
  request: TaskExecutionRequest,
): TaskExecutionRequest {
  return {
    taskId: normalizeRequiredString(request.taskId, "Task ID is required."),
    instructions: normalizeRequiredString(
      request.instructions,
      "Task execution instructions are required.",
    ),
    contextDirectory:
      request.contextDirectory === undefined
        ? undefined
        : normalizeRequiredString(
            request.contextDirectory,
            "Task execution contextDirectory must be a non-empty string.",
          ),
    title:
      request.title === undefined
        ? undefined
        : normalizeRequiredString(
            request.title,
            "Task execution title must be a non-empty string.",
          ),
  };
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "An unexpected provider error occurred.";
}
