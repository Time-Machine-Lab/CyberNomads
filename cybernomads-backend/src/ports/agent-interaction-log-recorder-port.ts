import type { AgentConversationMessage } from "../modules/agent-access/types.js";

export type AgentInteractionLogScope =
  | {
      kind: "traffic-work";
      trafficWorkId: string;
    }
  | {
      kind: "task";
      taskId: string;
    }
  | {
      kind: "agent-session";
      sessionId: string;
    };

export interface AgentInteractionLogEvent {
  scope: AgentInteractionLogScope;
  eventType: string;
  title?: string;
  occurredAt?: string;
  summary?: string;
  decisionSummary?: string;
  correlation?: Record<string, string | number | boolean | null | undefined>;
  skills?: string[];
  toolCalls?: AgentInteractionToolCall[];
  input?: unknown;
  output?: unknown;
  messages?: AgentConversationMessage[];
  payload?: Record<string, unknown>;
}

export interface AgentInteractionToolCall {
  name: string;
  status?: string;
  summary?: string;
  input?: unknown;
  output?: unknown;
}

export interface AgentInteractionLogRecorderPort {
  appendEvent(event: AgentInteractionLogEvent): Promise<void>;
}

export function recordAgentInteractionEvent(
  recorder: AgentInteractionLogRecorderPort | undefined,
  event: AgentInteractionLogEvent,
): void {
  if (!recorder) {
    return;
  }

  void recorder.appendEvent(event).catch(() => {
    // Agent interaction logs are diagnostic only and must never affect flows.
  });
}
