import type { AccountConnectionAttemptRecord } from "../modules/account-connection-attempts/types.js";

export interface AccountConnectionAttemptStateStore {
  createAttempt(record: AccountConnectionAttemptRecord): Promise<void>;
  saveAttempt(record: AccountConnectionAttemptRecord): Promise<void>;
  getAttemptById(
    accountId: string,
    attemptId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined>;
  getLatestAttemptForAccount(
    accountId: string,
  ): Promise<AccountConnectionAttemptRecord | undefined>;
  close(): void;
}
