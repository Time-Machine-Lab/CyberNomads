import type {
  AgentConversationMessage,
  AgentServiceCredentialRecord,
} from "../modules/agent-access/types.js";

export interface AgentProviderContext {
  agentServiceId: string;
  providerCode: string;
  endpointUrl: string;
  authenticationKind: string;
  credential: AgentServiceCredentialRecord;
}

export interface AgentProviderConnectionCheckResult {
  isReachable: boolean;
  reason: string | null;
}

export interface AgentProviderCapabilityPreparationResult {
  isPrepared: boolean;
  reason: string | null;
}

export interface AgentProviderSessionCreateInput {
  purpose: "task_planning" | "task_execution";
  title: string | null;
  context: string | null;
}

export interface AgentProviderSession {
  sessionId: string;
}

export interface AgentProviderSendMessageInput {
  sessionId: string;
  message: string;
}

export interface AgentProviderSubmitMessageResult {
  messageId: string;
}

export interface AgentProviderSendMessageResult {
  messageId: string;
  outputText: string;
}

export interface AgentProviderSessionHistoryInput {
  sessionId: string;
}

export interface AgentProviderSubagentInvocationInput {
  sessionId: string;
  instructions: string;
  contextDirectory: string | null;
}

export interface AgentProviderSubagentInvocationResult {
  invocationId: string;
  outputText: string;
  status: "completed" | "failed";
}

export interface AgentProviderPort {
  readonly providerCode: string;

  verifyConnection(
    context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult>;

  prepareCapabilities(
    context: AgentProviderContext,
  ): Promise<AgentProviderCapabilityPreparationResult>;

  createSession(
    context: AgentProviderContext,
    input: AgentProviderSessionCreateInput,
  ): Promise<AgentProviderSession>;

  submitMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSubmitMessageResult>;

  sendMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSendMessageResult>;

  listSessionMessages(
    context: AgentProviderContext,
    input: AgentProviderSessionHistoryInput,
  ): Promise<AgentConversationMessage[]>;

  invokeSubagent(
    context: AgentProviderContext,
    input: AgentProviderSubagentInvocationInput,
  ): Promise<AgentProviderSubagentInvocationResult>;
}
