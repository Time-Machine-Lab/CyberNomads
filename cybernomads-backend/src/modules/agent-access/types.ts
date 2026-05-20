export const PLANNING_AGENT_SERVICE_PURPOSE = "planning";
export const EXECUTION_AGENT_SERVICE_PURPOSE = "execution";
export const DEFAULT_AGENT_SERVICE_PURPOSE = EXECUTION_AGENT_SERVICE_PURPOSE;
export const CYBERNOMADS_AGENT_PROVIDER_CODE = "cybernomads-agent";
export const OPENCLAW_PROVIDER_CODE = "openclaw";

export type AgentServicePurpose =
  | typeof PLANNING_AGENT_SERVICE_PURPOSE
  | typeof EXECUTION_AGENT_SERVICE_PURPOSE;

export type AgentServiceScope = AgentServicePurpose;

export type AgentReasoningEffort = "low" | "medium" | "high";

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
  purpose?: AgentServicePurpose;
  providerCode: string;
  endpointUrl: string;
  model?: string | null;
  reasoningEffort?: AgentReasoningEffort | null;
  authentication: AgentServiceAuthenticationInput;
}

export interface UpdateAgentServiceInput {
  purpose?: AgentServicePurpose;
  providerCode: string;
  endpointUrl: string;
  model?: string | null;
  reasoningEffort?: AgentReasoningEffort | null;
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
  model: string | null;
  reasoningEffort: AgentReasoningEffort | null;
  providerSettings: Record<string, unknown>;
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
  purpose: AgentServicePurpose;
  providerCode: string;
  endpointUrl: string;
  model: string | null;
  reasoningEffort: AgentReasoningEffort | null;
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
  servicesByPurpose: Record<AgentServicePurpose, CurrentAgentService | null>;
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
  providerCode: string;
  model: string | null;
  outputText: string;
  history: AgentConversationMessage[];
}

export interface TaskDecompositionRequest {
  prompt: string;
  context: string;
  title?: string;
  trafficWorkId?: string;
}

export interface TaskDecompositionResult {
  sessionId: string;
  messageId: string;
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
