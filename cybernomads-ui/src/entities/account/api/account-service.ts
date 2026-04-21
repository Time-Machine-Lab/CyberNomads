import type { AccountRecord, AccountStatus } from '@/entities/account/model/types'
import { env } from '@/shared/config/env'
import { getAccountData, listAccountsData, updateAccountStatusData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real account APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function listAccounts(): Promise<AccountRecord[]> {
  assertMockOnly()
  return listAccountsData()
}

export async function getAccountById(id: string): Promise<AccountRecord | null> {
  assertMockOnly()
  return getAccountData(id)
}

export async function updateAccountStatus(
  id: string,
  status: AccountStatus,
): Promise<AccountRecord | null> {
  assertMockOnly()
  return updateAccountStatusData(id, status)
}
