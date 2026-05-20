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
import { CYBERNOMADS_AGENT_PROVIDER_CODE } from "../../../modules/agent-access/types.js";

interface StoredSession {
  title: string | null;
  context: string | null;
  messages: AgentConversationMessage[];
}

export interface CybernomadsAgentProviderOptions {
  fetchImpl?: typeof fetch;
  createId?: () => string;
}

export class CybernomadsAgentProvider implements AgentProviderPort {
  readonly providerCode = CYBERNOMADS_AGENT_PROVIDER_CODE;
  private readonly fetchImpl: typeof fetch;
  private readonly createId: () => string;
  private readonly sessions = new Map<string, StoredSession>();

  constructor(options: CybernomadsAgentProviderOptions = {}) {
    this.fetchImpl = options.fetchImpl ?? fetch;
    this.createId = options.createId ?? (() => randomUUID());
  }

  async verifyConnection(
    context: AgentProviderContext,
  ): Promise<AgentProviderConnectionCheckResult> {
    try {
      await this.createResponse(context, {
        input: "Reply with the single word: ok",
      });

      return {
        isReachable: true,
        reason: "Cybernomads Agent GPT provider reachable.",
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
    if (!context.model) {
      return {
        isPrepared: false,
        reason: "Cybernomads Agent model is not configured.",
      };
    }

    return {
      isPrepared: true,
      reason: "Cybernomads Agent GPT runtime capabilities are ready.",
    };
  }

  async createSession(
    _context: AgentProviderContext,
    input: AgentProviderSessionCreateInput,
  ): Promise<AgentProviderSession> {
    void _context;

    const sessionId = `cybernomads-agent:${this.createId()}`;
    const messages: AgentConversationMessage[] = [];

    if (input.context) {
      messages.push({
        role: "system",
        content: input.context,
      });
    }

    this.sessions.set(sessionId, {
      title: input.title,
      context: input.context,
      messages,
    });

    return {
      sessionId,
    };
  }

  async sendMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<AgentProviderSendMessageResult> {
    const session = this.getSession(input.sessionId);
    const outputText = await this.createResponse(context, {
      input: buildResponsesInput(session, input.message),
    });
    const messageId = `response:${this.createId()}`;

    session.messages.push({
      role: "user",
      content: input.message,
    });
    session.messages.push({
      role: "assistant",
      content: outputText,
    });

    return {
      messageId,
      outputText,
    };
  }

  async submitMessage(
    context: AgentProviderContext,
    input: AgentProviderSendMessageInput,
  ): Promise<{ messageId: string }> {
    const result = await this.sendMessage(context, input);
    return {
      messageId: result.messageId,
    };
  }

  async listSessionMessages(
    _context: AgentProviderContext,
    input: AgentProviderSessionHistoryInput,
  ): Promise<AgentConversationMessage[]> {
    void _context;
    return this.getSession(input.sessionId).messages.map((message) => ({
      ...message,
    }));
  }

  async invokeSubagent(
    _context: AgentProviderContext,
    input: AgentProviderSubagentInvocationInput,
  ): Promise<AgentProviderSubagentInvocationResult> {
    void _context;
    return {
      invocationId: `unsupported:${this.createId()}`,
      outputText:
        "Cybernomads Agent provider does not expose unrestricted subagent invocation.",
      status: "failed",
    };
  }

  private async createResponse(
    context: AgentProviderContext,
    input: {
      input: string;
    },
  ): Promise<string> {
    const model = requireContextString(context.model, "Model is required.");
    const secret = requireContextString(
      context.credential.secret,
      "API Key is required.",
    );
    const endpoint = resolveResponsesEndpoint(context.endpointUrl);
    const body: Record<string, unknown> = {
      model,
      input: input.input,
    };

    if (context.reasoningEffort) {
      body.reasoning = {
        effort: context.reasoningEffort,
      };
    }

    const response = await this.fetchImpl(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        Authorization: `Bearer ${secret}`,
      },
      body: JSON.stringify(body),
    });
    const payload = await parseJsonResponse(response);

    if (!response.ok) {
      throw new CybernomadsAgentProviderError(extractProviderError(payload));
    }

    const outputText = extractOutputText(payload);

    if (!outputText) {
      throw new CybernomadsAgentProviderError(
        "Cybernomads Agent provider returned an empty response.",
      );
    }

    return outputText;
  }

  private getSession(sessionId: string): StoredSession {
    const session = this.sessions.get(sessionId);

    if (!session) {
      throw new CybernomadsAgentProviderError(
        `Cybernomads Agent session "${sessionId}" was not found.`,
      );
    }

    return session;
  }
}

export class CybernomadsAgentProviderError extends Error {
  constructor(message: string, options: { cause?: unknown } = {}) {
    super(message, { cause: options.cause });
    this.name = "CybernomadsAgentProviderError";
  }
}

function buildResponsesInput(session: StoredSession, message: string): string {
  return [
    session.title ? `Session title: ${session.title}` : null,
    session.context ? `Context:\n${session.context}` : null,
    `User request:\n${message}`,
  ]
    .filter((value): value is string => value !== null)
    .join("\n\n");
}

function resolveResponsesEndpoint(endpointUrl: string): string {
  const normalized = endpointUrl.trim().replace(/\/+$/, "");

  if (normalized.endsWith("/responses")) {
    return normalized;
  }

  return `${normalized}/responses`;
}

function requireContextString(value: string | null, message: string): string {
  const normalized = value?.trim() ?? "";

  if (normalized.length === 0) {
    throw new CybernomadsAgentProviderError(message);
  }

  return normalized;
}

async function parseJsonResponse(response: Response): Promise<unknown> {
  const text = await response.text();

  if (text.trim().length === 0) {
    return {};
  }

  try {
    return JSON.parse(text) as unknown;
  } catch (error) {
    throw new CybernomadsAgentProviderError(
      "Cybernomads Agent provider returned a non-JSON response.",
      {
        cause: error,
      },
    );
  }
}

function extractOutputText(payload: unknown): string | null {
  const record = asRecord(payload);

  if (!record) {
    return null;
  }

  if (typeof record.output_text === "string") {
    return record.output_text.trim();
  }

  if (Array.isArray(record.output)) {
    const parts = record.output
      .flatMap((item) => extractOutputItemText(item))
      .filter((part) => part.length > 0);

    if (parts.length > 0) {
      return parts.join("\n").trim();
    }
  }

  if (typeof record.text === "string") {
    return record.text.trim();
  }

  return null;
}

function extractOutputItemText(item: unknown): string[] {
  const record = asRecord(item);

  if (!record) {
    return [];
  }

  if (typeof record.content === "string") {
    return [record.content.trim()];
  }

  if (!Array.isArray(record.content)) {
    return [];
  }

  return record.content
    .map((contentItem) => {
      const contentRecord = asRecord(contentItem);
      if (!contentRecord) {
        return "";
      }

      if (typeof contentRecord.text === "string") {
        return contentRecord.text.trim();
      }

      if (typeof contentRecord.value === "string") {
        return contentRecord.value.trim();
      }

      return "";
    })
    .filter((value) => value.length > 0);
}

function extractProviderError(payload: unknown): string {
  const record = asRecord(payload);
  const error = asRecord(record?.error);

  if (typeof error?.message === "string") {
    return error.message;
  }

  return "Cybernomads Agent provider request failed.";
}

function toErrorMessage(error: unknown): string {
  if (error instanceof Error) {
    return error.message;
  }

  return "Cybernomads Agent provider request failed.";
}

function asRecord(value: unknown): Record<string, unknown> | null {
  if (typeof value !== "object" || value === null || Array.isArray(value)) {
    return null;
  }

  return value as Record<string, unknown>;
}
