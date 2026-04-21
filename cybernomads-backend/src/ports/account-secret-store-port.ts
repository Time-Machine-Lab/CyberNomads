export interface AccountSecretStore {
  writeSecret(secretRef: string, payload: unknown): Promise<void>;
  readSecret<T>(secretRef: string): Promise<T>;
  deleteSecret(secretRef: string): Promise<void>;
}
