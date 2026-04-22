import type { AccountOnboardingSessionRecord } from "../modules/account-onboarding/types.js";

export interface AccountOnboardingStateStore {
  createSession(record: AccountOnboardingSessionRecord): Promise<void>;
  saveSession(record: AccountOnboardingSessionRecord): Promise<void>;
  getSessionById(
    sessionId: string,
  ): Promise<AccountOnboardingSessionRecord | undefined>;
  close(): void;
}
