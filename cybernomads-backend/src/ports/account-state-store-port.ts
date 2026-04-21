import type {
  ListAccountsFilters,
  PlatformAccountRecord,
} from "../modules/accounts/types.js";

export interface AccountStateStore {
  createAccount(record: PlatformAccountRecord): Promise<void>;
  saveAccount(record: PlatformAccountRecord): Promise<void>;
  getAccountById(accountId: string): Promise<PlatformAccountRecord | undefined>;
  getAccountByPlatformIdentity(
    platform: string,
    platformAccountUid: string,
  ): Promise<PlatformAccountRecord | undefined>;
  listAccounts(filters: ListAccountsFilters): Promise<PlatformAccountRecord[]>;
  close(): void;
}
