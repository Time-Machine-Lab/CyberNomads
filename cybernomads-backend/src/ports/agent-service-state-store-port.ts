import type {
  AgentServiceConnectionRecord,
  AgentServicePurpose,
} from "../modules/agent-access/types.js";

export interface AgentServiceStateStore {
  getServiceByPurpose(
    purpose: AgentServicePurpose,
  ): Promise<AgentServiceConnectionRecord | undefined>;
  listServices(): Promise<AgentServiceConnectionRecord[]>;
  saveService(record: AgentServiceConnectionRecord): Promise<void>;
  close(): void;
}
