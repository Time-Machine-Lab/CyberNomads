import type {
  AccountRecord,
  ListAccountsFilters,
} from "../modules/accounts/types.js";

export interface AccountStateStore {
  createAccount(record: AccountRecord): Promise<void>;
  saveAccount(record: AccountRecord): Promise<void>;
  getAccountById(accountId: string): Promise<AccountRecord | undefined>;
  listAccounts(filters: ListAccountsFilters): Promise<AccountRecord[]>;
  close(): void;
}
