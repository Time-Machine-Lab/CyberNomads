import type { AgentServiceConnectionRecord } from "../modules/agent-access/types.js";

export interface AgentServiceStateStore {
  getCurrentService(): Promise<AgentServiceConnectionRecord | undefined>;
  saveCurrentService(record: AgentServiceConnectionRecord): Promise<void>;
  close(): void;
}
