import { appendFile, mkdir } from "node:fs/promises";
import { dirname, join } from "node:path";

import type {
  AgentInteractionLogEvent,
  AgentInteractionLogRecorderPort,
  AgentInteractionLogScope,
  AgentInteractionToolCall,
} from "../../../ports/agent-interaction-log-recorder-port.js";
import type { AgentConversationMessage } from "../../../modules/agent-access/types.js";

export interface FileSystemAgentInteractionLogRecorderOptions {
  logsDirectory: string;
  enabled?: boolean;
  now?: () => Date;
}

export class FileSystemAgentInteractionLogRecorder
  implements AgentInteractionLogRecorderPort
{
  private readonly enabled: boolean;
  private readonly now: () => Date;

  constructor(
    private readonly options: FileSystemAgentInteractionLogRecorderOptions,
  ) {
    this.enabled = options.enabled ?? true;
    this.now = options.now ?? (() => new Date());
  }

  async appendEvent(event: AgentInteractionLogEvent): Promise<void> {
    if (!this.enabled) {
      return;
    }

    const targetFile = resolveLogFile(this.options.logsDirectory, event.scope);
    await mkdir(dirname(targetFile), { recursive: true });
    await appendFile(targetFile, formatAgentInteractionLogEvent(event, this.now), {
      encoding: "utf8",
    });
  }
}

export function formatAgentInteractionLogEvent(
  event: AgentInteractionLogEvent,
  now: () => Date = () => new Date(),
): string {
  const occurredAt = event.occurredAt ?? now().toISOString();
  const parts = [
    `## ${occurredAt} | ${event.eventType}${event.title ? ` | ${event.title}` : ""}`,
    ``,
    `Scope: ${formatScope(event.scope)}`,
  ];

  appendCorrelation(parts, event.correlation);
  appendList(parts, "Skills", event.skills);

  if (event.summary) {
    parts.push(``, `Summary:`, sanitizeText(event.summary));
  }

  if (event.decisionSummary) {
    parts.push(``, `Decision Summary:`, sanitizeText(event.decisionSummary));
  }

  appendValueBlock(parts, "Input", event.input);
  appendToolCalls(parts, event.toolCalls);
  appendMessages(parts, event.messages);
  appendValueBlock(parts, "Output", event.output);
  appendValueBlock(parts, "Payload", event.payload);

  return `${parts.join("\n")}\n\n`;
}

export function sanitizeAgentInteractionLogText(value: string): string {
  return sanitizeText(value);
}

function resolveLogFile(
  logsDirectory: string,
  scope: AgentInteractionLogScope,
): string {
  switch (scope.kind) {
    case "traffic-work":
      return join(
        logsDirectory,
        "traffic-works",
        `${sanitizePathSegment(scope.trafficWorkId)}.logs`,
      );
    case "task":
      return join(
        logsDirectory,
        "tasks",
        `${sanitizePathSegment(scope.taskId)}.logs`,
      );
    case "agent-session":
      return join(
        logsDirectory,
        "agent-sessions",
        `${sanitizePathSegment(scope.sessionId)}.logs`,
      );
  }
}

function formatScope(scope: AgentInteractionLogScope): string {
  switch (scope.kind) {
    case "traffic-work":
      return `traffic-work:${scope.trafficWorkId}`;
    case "task":
      return `task:${scope.taskId}`;
    case "agent-session":
      return `agent-session:${scope.sessionId}`;
  }
}

function appendCorrelation(
  parts: string[],
  correlation: AgentInteractionLogEvent["correlation"],
): void {
  if (!correlation) {
    return;
  }

  const entries = Object.entries(correlation).filter(
    ([, value]) => value !== undefined && value !== null,
  );

  if (entries.length === 0) {
    return;
  }

  parts.push(``, `Correlation:`);

  for (const [key, value] of entries) {
    parts.push(`- ${sanitizeText(key)}: ${sanitizeText(String(value))}`);
  }
}

function appendList(
  parts: string[],
  title: string,
  values: string[] | undefined,
): void {
  if (!values || values.length === 0) {
    return;
  }

  parts.push(``, `${title}:`);

  for (const value of values) {
    parts.push(`- ${sanitizeText(value)}`);
  }
}

function appendToolCalls(
  parts: string[],
  toolCalls: AgentInteractionToolCall[] | undefined,
): void {
  if (!toolCalls || toolCalls.length === 0) {
    return;
  }

  parts.push(``, `Tool Calls:`);

  for (const toolCall of toolCalls) {
    parts.push(
      `- ${sanitizeText(toolCall.name)}${toolCall.status ? ` (${sanitizeText(toolCall.status)})` : ""}`,
    );

    if (toolCall.summary) {
      parts.push(`  Summary: ${sanitizeText(toolCall.summary)}`);
    }

    appendValueBlock(parts, `  Input`, toolCall.input);
    appendValueBlock(parts, `  Output`, toolCall.output);
  }
}

function appendMessages(
  parts: string[],
  messages: AgentConversationMessage[] | undefined,
): void {
  if (!messages || messages.length === 0) {
    return;
  }

  parts.push(``, `Messages:`);

  messages.forEach((message, index) => {
    parts.push(
      `### Message ${index + 1} | ${message.role}${message.createdAt ? ` | ${sanitizeText(message.createdAt)}` : ""}`,
      sanitizeText(message.content),
      ``,
    );
  });
}

function appendValueBlock(parts: string[], title: string, value: unknown): void {
  if (value === undefined) {
    return;
  }

  parts.push(``, `${title}:`, "```json", sanitizeText(toJson(value)), "```");
}

function toJson(value: unknown): string {
  if (typeof value === "string") {
    return JSON.stringify(value);
  }

  return JSON.stringify(value, null, 2) ?? "null";
}

function sanitizeText(value: string): string {
  return value
    .replace(/(Bearer\s+)[A-Za-z0-9._~+/=-]+/gi, "$1[REDACTED]")
    .replace(
      /("(?:authorization|credential|secret|providerSecret|token|password|apiKey|providerApiKey|api_key|accessToken|refreshToken)"\s*:\s*")([^"]*)(")/gi,
      "$1[REDACTED]$3",
    )
    .replace(
      /((?:authorization|credential|secret|providerSecret|token|password|apiKey|providerApiKey|api_key|accessToken|refreshToken)\s*[=:]\s*)([^\s,;]+)/gi,
      "$1[REDACTED]",
    );
}

function sanitizePathSegment(value: string): string {
  const sanitized = value
    .trim()
    .replace(/[^a-zA-Z0-9._-]+/g, "-")
    .replace(/^-+|-+$/g, "");

  return sanitized.length > 0 ? sanitized : "unknown";
}
