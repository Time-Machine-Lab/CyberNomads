import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { join } from "node:path";

import type { AgentServiceCredentialStore } from "../../../ports/agent-service-credential-store-port.js";
import type { AgentServiceCredentialRecord } from "../../../modules/agent-access/types.js";

const CREDENTIAL_DIRECTORY_NAME = ".agent-service-credentials";

export class FileSystemAgentServiceCredentialStore
  implements AgentServiceCredentialStore
{
  constructor(private readonly runtimeRoot: string) {}

  async writeCredential(
    credentialRef: string,
    credential: AgentServiceCredentialRecord,
  ): Promise<void> {
    await mkdir(this.credentialsDirectory, { recursive: true });
    await writeFile(
      resolveCredentialPath(this.credentialsDirectory, credentialRef),
      JSON.stringify(credential),
      "utf8",
    );
  }

  async readCredential(
    credentialRef: string,
  ): Promise<AgentServiceCredentialRecord> {
    const content = await readFile(
      resolveCredentialPath(this.credentialsDirectory, credentialRef),
      "utf8",
    );
    return JSON.parse(content) as AgentServiceCredentialRecord;
  }

  async deleteCredential(credentialRef: string): Promise<void> {
    await rm(resolveCredentialPath(this.credentialsDirectory, credentialRef), {
      force: true,
    });
  }

  private get credentialsDirectory(): string {
    return join(this.runtimeRoot, CREDENTIAL_DIRECTORY_NAME);
  }
}

function resolveCredentialPath(
  credentialsDirectory: string,
  credentialRef: string,
): string {
  return join(credentialsDirectory, credentialRef);
}
