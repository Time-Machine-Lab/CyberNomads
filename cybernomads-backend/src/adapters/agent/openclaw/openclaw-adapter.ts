import { randomUUID } from "node:crypto";

import type {
  AgentProviderCapabilityPreparationResult,
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
} from "../../../ports/agent-provider-port.js";
import type { AgentConversationMessage } from "../../../modules/agent-access/types.js";
import {
  OpenClawHttpClient,
  OpenClawProviderError,
  type OpenClawToolInvocationResult,
} from "./openclaw-http-client.js";
import { OpenClawWsClient } from "./openclaw-ws-client.js";

interface StoredSessionMetadata {
  purpose: AgentProviderSessionCreateInput["purpose"];
  title: string | null;
  context: string | null;
}

const DEFAULT_SEND_TIMEOUT_MS = 60_000;
const DEFAULT_WAIT_TIMEOUT_MS = 60_000;
const TASK_PLANNING_SEND_TIMEOUT_MS = 300_000;
const TASK_PLANNING_WAIT_TIMEOUT_MS = 300_000;

export interface OpenClawAgentProviderOptions {
  httpClient?: Pick<OpenClawHttpClient, "invokeTool">;
  wsClient?: Pick<OpenClawWsClient, "request">;
  createId?: () => string;
  defaultAgentId?: string;
}

export class OpenClawAgentProvider implements AgentProviderPort {
  readonly providerCode = "openclaw";
  private readonly sessionMetadata = new Map<string, StoredSessionMetadata>();
  private readonly httpClient: Pick<OpenClawHttpClient, "invokeTool">;
  private readonly wsClient: Pick<OpenClawWsClient, "request">;
  private readonly createId: () => string;
  private readonly defaultAgentId: string;

  constructor(options: OpenClawAgentProviderOptions = {}) {
    this.httpClient = options.httpClient ?? new OpenClawHttpClient();
    this.wsClient = options.wsClient ?? new OpenClawWsClient();
    this.createId = options.createId ?? (() => randomUUID());
    this.defaultAgentId = options.defaultAgentId ?? "main";
  }

  async verifyConnection(
    context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult> {
    try {
      await this.httpClient.invokeTool(context, {
        tool: "sessions_list",
        args: {
          limit: 1,
        },
      });

      return {
        isReachable: true,
        reason: "OpenClaw gateway reachable.",
      };
    } catch (error) {
      return {
        isReachable: false,
        reason: toErrorMessage(error),
      };
    }
  }

  async prepareCapabilities(
    context: AgentProviderContext,
  ): Promise<AgentProviderCapabilityPreparationResult> {
    try {
      await this.httpClient.invokeTool(context, {
        tool: "sessions_list",
        args: {
          limit: 1,
        },
      });
      await this.httpClient.invokeTool(context, {
        tool: "subagents",
        args: {
          action: "list",
        },
        sessionKey: "main",
      });

      return {
        isPrepared: true,
        reason: "OpenClaw gateway capabilities are ready.",
      };
    } catch (error) {
      return {
        isPrepared: false,
        reason: toErrorMessage(error),
      };
    }
  }

  async createSession(
    _context: AgentProviderContext,
    input: AgentProviderSessionCreateInput,
  ): Promise<AgentProviderSession> {
    const sessionId = buildSessionKey({
      agentId: this.defaultAgentId,
      purpose: input.purpose,
      title: input.title,
      createId: this.createId,
    });

    this.sessionMetadata.set(sessionId, {
      purpose: input.purpose,
      title: input.title,
      context: input.context,
    });

    return {
      sessionId,
    };
  }

  async sendMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSendMessageResult> {
    const { sessionId, runId, waitTimeoutMs } =
      await this.submitMessageInternal(context, input);
    const waitResult = await this.wsClient.request(
      context,
      "agent.wait",
      {
        runId,
        timeoutMs: waitTimeoutMs,
      },
      {
        timeoutMs: waitTimeoutMs + 10_000,
      },
    );
    const waitRecord = asRecord(waitResult);
    const waitStatus = readRequiredString(
      waitRecord?.status,
      "OpenClaw did not report the run status.",
    );

    if (!isSuccessfulRunStatus(waitStatus)) {
      const failureMessage =
        readOptionalString(waitRecord?.error) ??
        `OpenClaw run did not complete successfully (status: ${waitStatus}).`;
      throw new OpenClawProviderError(failureMessage);
    }

    const history = await this.listSessionMessages(context, {
      sessionId,
    });
    const outputText =
      [...history].reverse().find((message) => message.role === "assistant")
        ?.content ?? "";

    return {
      messageId: runId,
      outputText,
    };
  }

  async submitMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<{ messageId: string }> {
    const { runId } = await this.submitMessageInternal(context, input);

    return {
      messageId: runId,
    };
  }

  private async submitMessageInternal(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<{
    sessionId: string;
    runId: string;
    waitTimeoutMs: number;
  }> {
    const sessionId = normalizeSessionId(input.sessionId);
    const metadata = this.sessionMetadata.get(sessionId);
    const sendTimeoutMs =
      metadata?.purpose === "task_planning"
        ? TASK_PLANNING_SEND_TIMEOUT_MS
        : DEFAULT_SEND_TIMEOUT_MS;
    const waitTimeoutMs =
      metadata?.purpose === "task_planning"
        ? TASK_PLANNING_WAIT_TIMEOUT_MS
        : DEFAULT_WAIT_TIMEOUT_MS;
    const accepted = await this.wsClient.request(
      context,
      "agent",
      {
        sessionKey: sessionId,
        message: input.message,
        deliver: false,
        timeout: sendTimeoutMs,
        idempotencyKey: this.createId(),
        ...(metadata?.title ? { label: metadata.title } : {}),
        ...(metadata?.context
          ? {
              extraSystemPrompt: buildExtraSystemPrompt(metadata),
            }
          : {}),
      },
      {
        timeoutMs: sendTimeoutMs + 30_000,
      },
    );
    const acceptedRecord = asRecord(accepted);
    const runId = readRequiredString(
      acceptedRecord?.runId,
      "OpenClaw did not return a run id for the accepted request.",
    );

    return {
      sessionId,
      runId,
      waitTimeoutMs,
    };
  }

  async listSessionMessages(
    context: AgentProviderContext,
    input: AgentProviderSessionHistoryInput,
  ): Promise<AgentConversationMessage[]> {
    const sessionId = normalizeSessionId(input.sessionId);
    const historyPayload = await this.wsClient.request(
      context,
      "chat.history",
      {
        sessionKey: sessionId,
        limit: 100,
      },
      {
        timeoutMs: 30_000,
      },
    );
    const historyRecord = asRecord(historyPayload);
    const rawMessages = Array.isArray(historyRecord?.messages)
      ? historyRecord.messages
      : [];
    const normalizedMessages = rawMessages
      .map((message) => normalizeConversationMessage(message))
      .filter(
        (message): message is AgentConversationMessage => message !== null,
      );
    const metadata = this.sessionMetadata.get(sessionId);

    if (
      metadata?.context &&
      !normalizedMessages.some(
        (message) =>
          message.role === "system" && message.content === metadata.context,
      )
    ) {
      return [
        {
          role: "system",
          content: metadata.context,
        },
        ...normalizedMessages,
      ];
    }

    return normalizedMessages;
  }

  async invokeSubagent(
    context: AgentProviderContext,
    input: AgentProviderSubagentInvocationInput,
  ): Promise<AgentProviderSubagentInvocationResult> {
    try {
      const result = await this.httpClient.invokeTool(context, {
        tool: "sessions_spawn",
        sessionKey: normalizeSessionId(input.sessionId),
        args: {
          agentId: this.defaultAgentId,
          task: buildSubagentTask(input),
          mode: "run",
          cleanup: "keep",
          label: "cybernomads-subagent",
        },
      });
      const details = extractToolResultDetails(result);
      const invocationId =
        readOptionalString(details?.runId) ??
        readOptionalString(details?.childSessionKey) ??
        readOptionalString(details?.sessionId) ??
        this.createId();
      const status = readOptionalString(details?.status);

      return {
        invocationId,
        outputText:
          readOptionalString(details?.message) ??
          readOptionalString(details?.reply) ??
          "OpenClaw subagent invocation accepted.",
        status:
          status === "ok" || status === "accepted" || status === "completed"
            ? "completed"
            : "failed",
      };
    } catch (error) {
      return {
        invocationId: this.createId(),
        outputText: toSubagentFailureMessage(error),
        status: "failed",
      };
    }
  }
}

function buildSessionKey(input: {
  agentId: string;
  purpose: AgentProviderSessionCreateInput["purpose"];
  title: string | null;
  createId: () => string;
}): string {
  const titleSegment = sanitizeSegment(input.title) ?? input.purpose;

  return `agent:${input.agentId}:${titleSegment}-${input.createId()}`;
}

function sanitizeSegment(value: string | null): string | null {
  if (!value) {
    return null;
  }

  const sanitized = value
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : null;
}

function buildExtraSystemPrompt(metadata: StoredSessionMetadata): string {
  const parts = [
    metadata.title ? `Session title: ${metadata.title}` : null,
    metadata.purpose === "task_planning"
      ? "Session purpose: task planning."
      : "Session purpose: task execution.",
    metadata.context ? `Session context:\n${metadata.context}` : null,
  ].filter((value): value is string => value !== null);

  return parts.join("\n\n");
}

function buildSubagentTask(
  input: AgentProviderSubagentInvocationInput,
): string {
  if (!input.contextDirectory) {
    return input.instructions;
  }

  return `${input.instructions}\n\nContext directory: ${input.contextDirectory}`;
}

function normalizeConversationMessage(
  rawMessage: unknown,
): AgentConversationMessage | null {
  const record = asRecord(rawMessage);

  if (!record) {
    return null;
  }

  const role = normalizeRole(record.role);
  const content = extractMessageText(record);

  if (!role || content.length === 0) {
    return null;
  }

  const createdAt = toIsoTimestamp(record.createdAt ?? record.ts);

  return {
    role,
    content,
    ...(createdAt ? { createdAt } : {}),
  };
}

function normalizeRole(
  value: unknown,
): AgentConversationMessage["role"] | null {
  if (typeof value !== "string") {
    return null;
  }

  switch (value) {
    case "system":
    case "user":
    case "assistant":
    case "tool":
      return value;
    default:
      return null;
  }
}

function extractMessageText(record: Record<string, unknown>): string {
  const content = extractTextValue(record.content);

  if (content.length > 0) {
    return content;
  }

  if (typeof record.message === "string") {
    return record.message.trim();
  }

  if (typeof record.text === "string") {
    return record.text.trim();
  }

  return "";
}

function extractTextValue(value: unknown): string {
  if (typeof value === "string") {
    return value.trim();
  }

  if (Array.isArray(value)) {
    return value
      .map((entry) => extractTextValue(entry))
      .filter((entry) => entry.length > 0)
      .join("\n")
      .trim();
  }

  const record = asRecord(value);

  if (!record) {
    return "";
  }

  if (typeof record.text === "string") {
    return record.text.trim();
  }

  if (record.type === "text" && typeof record.value === "string") {
    return record.value.trim();
  }

  if (record.content !== undefined) {
    return extractTextValue(record.content);
  }

  if (record.parts !== undefined) {
    return extractTextValue(record.parts);
  }

  return "";
}

function toIsoTimestamp(value: unknown): string | undefined {
  if (typeof value === "string") {
    return value;
  }

  if (typeof value === "number" && Number.isFinite(value)) {
    return new Date(value).toISOString();
  }

  return undefined;
}

function extractToolResultDetails(
  result: OpenClawToolInvocationResult,
): Record<string, unknown> | null {
  const record = asRecord(result.result);

  if (!record) {
    return null;
  }

  const details = asRecord(record.details);

  if (details) {
    return details;
  }

  const content = Array.isArray(record.content) ? record.content : [];

  for (const entry of content) {
    const entryRecord = asRecord(entry);
    const text = entryRecord?.text;

    if (typeof text !== "string") {
      continue;
    }

    try {
      const parsed = JSON.parse(text) as unknown;
      const parsedRecord = asRecord(parsed);

      if (parsedRecord) {
        return parsedRecord;
      }
    } catch {}
  }

  return null;
}

function normalizeSessionId(sessionId: string): string {
  const normalized = sessionId.trim();

  if (normalized.length === 0) {
    throw new OpenClawProviderError("OpenClaw session id is required.");
  }

  return normalized;
}

function readRequiredString(value: unknown, message: string): string {
  const normalized = readOptionalString(value);

  if (!normalized) {
    throw new OpenClawProviderError(message);
  }

  return normalized;
}

function readOptionalString(value: unknown): string | null {
  if (typeof value !== "string") {
    return null;
  }

  const normalized = value.trim();
  return normalized.length > 0 ? normalized : null;
}

function isSuccessfulRunStatus(status: string): boolean {
  return status === "completed" || status === "ok";
}

function toSubagentFailureMessage(error: unknown): string {
  const message = toErrorMessage(error);

  if (message.includes("Tool not available: sessions_spawn")) {
    return (
      "OpenClaw subagent spawning is disabled on this gateway. " +
      "Enable `sessions_spawn` in the gateway HTTP tool allowlist to use it."
    );
  }

  return message;
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "OpenClaw provider request failed.";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
