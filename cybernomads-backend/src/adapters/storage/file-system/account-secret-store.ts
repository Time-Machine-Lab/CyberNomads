import { mkdir, readFile, rm, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";

import type { AccountSecretStore } from "../../../ports/account-secret-store-port.js";

const SECRET_DIRECTORY_NAME = ".account-secrets";

export class FileSystemAccountSecretStore implements AccountSecretStore {
  constructor(private readonly runtimeRoot: string) {}

  async writeSecret(secretRef: string, payload: unknown): Promise<void> {
    const secretPath = resolveSecretPath(this.secretsDirectory, secretRef);
    await mkdir(dirname(secretPath), { recursive: true });
    await writeFile(secretPath, JSON.stringify(payload), "utf8");
  }

  async readSecret<T>(secretRef: string): Promise<T> {
    const content = await readFile(
      resolveSecretPath(this.secretsDirectory, secretRef),
      "utf8",
    );
    return JSON.parse(content) as T;
  }

  async deleteSecret(secretRef: string): Promise<void> {
    await rm(resolveSecretPath(this.secretsDirectory, secretRef), {
      force: true,
    });
  }

  private get secretsDirectory(): string {
    return join(this.runtimeRoot, SECRET_DIRECTORY_NAME);
  }
}

function resolveSecretPath(secretDirectory: string, secretRef: string): string {
  return join(secretDirectory, secretRef);
}
