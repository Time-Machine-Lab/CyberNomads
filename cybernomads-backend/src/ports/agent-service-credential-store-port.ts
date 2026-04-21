import type { AgentServiceCredentialRecord } from "../modules/agent-access/types.js";

export interface AgentServiceCredentialStore {
  writeCredential(
    credentialRef: string,
    credential: AgentServiceCredentialRecord,
  ): Promise<void>;
  readCredential(credentialRef: string): Promise<AgentServiceCredentialRecord>;
  deleteCredential(credentialRef: string): Promise<void>;
}
