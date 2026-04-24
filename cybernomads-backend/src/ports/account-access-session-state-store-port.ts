import type { AccountAccessSessionRecord } from "../modules/account-access-sessions/types.js";

export interface AccountAccessSessionStateStore {
  createSession(record: AccountAccessSessionRecord): Promise<void>;
  saveSession(record: AccountAccessSessionRecord): Promise<void>;
  getSessionById(
    accountId: string,
    sessionId: string,
  ): Promise<AccountAccessSessionRecord | undefined>;
  getLatestSessionForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord | undefined>;
  listSessionsForAccount(
    accountId: string,
  ): Promise<AccountAccessSessionRecord[]>;
  close(): void;
}
