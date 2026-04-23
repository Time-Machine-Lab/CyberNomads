import type { TaskSetWriteInput } from "../tasks/types.js";

export const CURRENT_AGENT_SERVICE_SCOPE = "current";

export type AgentServiceScope = typeof CURRENT_AGENT_SERVICE_SCOPE;

export type StoredConnectionStatus =
  | "pending_verification"
  | "connected"
  | "connection_failed";

export type ConnectionStatus = "not_configured" | StoredConnectionStatus;

export type CapabilityProvisioningStatus =
  | "not_ready"
  | "preparing"
  | "ready"
  | "prepare_failed";

export interface AgentServiceAuthenticationInput {
  kind: string;
  secret: string;
}

export interface ConfigureAgentServiceInput {
  providerCode: string;
  endpointUrl: string;
  authentication: AgentServiceAuthenticationInput;
}

export interface UpdateAgentServiceInput {
  providerCode: string;
  endpointUrl: string;
  authentication: AgentServiceAuthenticationInput;
}

export interface AgentServiceCredentialRecord {
  kind: string;
  secret: string;
}

export interface AgentServiceConnectionRecord {
  serviceScope: AgentServiceScope;
  agentServiceId: string;
  providerCode: string;
  endpointUrl: string;
  authenticationKind: string;
  credentialRef: string;
  connectionStatus: StoredConnectionStatus;
  connectionStatusReason: string | null;
  capabilityStatus: CapabilityProvisioningStatus;
  capabilityStatusReason: string | null;
  lastVerifiedAt: string | null;
  lastConnectedAt: string | null;
  capabilityPreparedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface CurrentAgentService {
  agentServiceId: string;
  providerCode: string;
  endpointUrl: string;
  authenticationKind: string;
  hasCredential: boolean;
  connectionStatus: StoredConnectionStatus;
  connectionStatusReason: string | null;
  capabilityStatus: CapabilityProvisioningStatus;
  capabilityStatusReason: string | null;
  isActive: true;
  isUsable: boolean;
  lastVerifiedAt: string | null;
  lastConnectedAt: string | null;
  capabilityPreparedAt: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface AgentServiceStatusSnapshot {
  hasCurrentService: boolean;
  currentService: CurrentAgentService | null;
  connectionStatus: ConnectionStatus;
  capabilityStatus: CapabilityProvisioningStatus;
  isUsable: boolean;
  warning: string | null;
}

export interface ConnectionVerificationResult {
  agentServiceId: string;
  connectionStatus: StoredConnectionStatus;
  reason: string | null;
  isUsable: boolean;
  verifiedAt: string;
}

export interface CapabilityProvisioningResult {
  agentServiceId: string;
  capabilityStatus: CapabilityProvisioningStatus;
  reason: string | null;
  connectionStatus: StoredConnectionStatus;
  isUsable: boolean;
  preparedAt: string | null;
}

export interface AgentConversationMessage {
  role: "system" | "user" | "assistant" | "tool";
  content: string;
  createdAt?: string;
}

export interface TaskPlanningRequest {
  prompt: string;
  context?: string;
  title?: string;
}

export interface TaskPlanningResult {
  sessionId: string;
  outputText: string;
  history: AgentConversationMessage[];
}

export interface TaskDecompositionRequest {
  prompt: string;
  context: string;
  title?: string;
}

export interface TaskDecompositionResult {
  sessionId: string;
  outputText: string;
  history: AgentConversationMessage[];
  taskSet: TaskSetWriteInput;
}

export interface TaskExecutionRequest {
  taskId: string;
  instructions: string;
  contextDirectory?: string;
  title?: string;
}

export interface TaskExecutionResult {
  sessionId: string;
  executionId: string;
  outputText: string;
  status: "completed";
  history: AgentConversationMessage[];
}
