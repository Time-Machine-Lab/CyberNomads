import {
  mapAccountConnectionAttemptDetailDtoToRecord,
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
  mapConnectionAttemptLogsResponseDtoToRecord,
  mapLegacyMockAccountToDetailRecord,
  mapLegacyMockAccountToRecord,
} from '@/entities/account/model/mappers'
import type {
  AccountConnectionAttemptDetailDto,
  AccountConnectionAttemptDetailRecord,
  AccountDetailDto,
  AccountDetailRecord,
  AccountRecord,
  AvailabilityCheckResultDto,
  ConnectionAttemptLogsRecord,
  ConnectionAttemptLogsResponseDto,
  CreateAccountInput,
  ListAccountsQuery,
  ListAccountsResultDto,
  ResolveConnectionAttemptInput,
  StartConnectionAttemptInput,
  UpdateAccountInput,
  ValidateConnectionAttemptInput,
  ValidateConnectionAttemptResponseDto,
} from '@/entities/account/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'
import { getAccountData, listAccountsData } from '@/shared/mocks/runtime'

type AccountDataSource = 'mock' | 'real'

export interface AccountRequestOptions {
  source?: AccountDataSource
}

export interface ListAccountsOptions extends ListAccountsQuery {
  source?: AccountDataSource
}

const ACCOUNT_API_ROOT = '/accounts'

export function isRealAccountApiEnabled() {
  return true
}

function resolveSource(source?: AccountDataSource): AccountDataSource {
  return source ?? 'real'
}

function assertRealAccountApi(source: AccountDataSource) {
  if (source === 'real') {
    return
  }

  throw new Error('当前未启用账号模块真实后端，请开启 VITE_USE_REAL_ACCOUNT_API 后重试。')
}

export async function listAccounts(options: ListAccountsOptions = {}): Promise<AccountRecord[]> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return listAccountsData().map(mapLegacyMockAccountToRecord)
  }

  const query: Record<string, string | number | boolean | null | undefined> = {
    platform: options.platform,
    keyword: options.keyword,
    lifecycleStatus: options.lifecycleStatus,
    loginStatus: options.loginStatus,
    availabilityStatus: options.availabilityStatus,
    includeDeleted: options.includeDeleted,
    onlyConsumable: options.onlyConsumable,
  }
  const result = await requestJson<ListAccountsResultDto>(ACCOUNT_API_ROOT, {
    query,
  })

  return result.items.map(mapAccountSummaryDtoToRecord)
}

export async function createAccount(
  input: CreateAccountInput,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountDetailDto>(ACCOUNT_API_ROOT, {
    method: 'POST',
    body: input,
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function getAccountById(
  id: string,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord | null> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    const mockAccount = getAccountData(id)
    return mockAccount ? mapLegacyMockAccountToDetailRecord(mockAccount) : null
  }

  try {
    const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}`)
    return mapAccountDetailDtoToRecord(dto)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function updateAccount(
  id: string,
  input: UpdateAccountInput,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function deleteAccount(
  id: string,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function restoreAccount(
  id: string,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function startConnectionAttempt(
  accountId: string,
  input: StartConnectionAttemptInput,
  options: AccountRequestOptions = {},
): Promise<AccountConnectionAttemptDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountConnectionAttemptDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/connection-attempts`,
    {
      method: 'POST',
      body: input,
    },
  )

  return mapAccountConnectionAttemptDetailDtoToRecord(dto)
}

export async function getConnectionAttempt(
  accountId: string,
  attemptId: string,
  options: AccountRequestOptions = {},
): Promise<AccountConnectionAttemptDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountConnectionAttemptDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/connection-attempts/${encodeURIComponent(attemptId)}`,
  )

  return mapAccountConnectionAttemptDetailDtoToRecord(dto)
}

export async function resolveConnectionAttempt(
  accountId: string,
  attemptId: string,
  input: ResolveConnectionAttemptInput,
  options: AccountRequestOptions = {},
): Promise<AccountConnectionAttemptDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccountConnectionAttemptDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/connection-attempts/${encodeURIComponent(attemptId)}/resolve`,
    {
      method: 'POST',
      body: input,
    },
  )

  return mapAccountConnectionAttemptDetailDtoToRecord(dto)
}

export async function validateConnectionAttempt(
  accountId: string,
  attemptId: string,
  input: ValidateConnectionAttemptInput,
  options: AccountRequestOptions = {},
): Promise<ValidateConnectionAttemptResponseDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<ValidateConnectionAttemptResponseDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/connection-attempts/${encodeURIComponent(attemptId)}/validate`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function getConnectionAttemptLogs(
  accountId: string,
  attemptId: string,
  options: AccountRequestOptions = {},
): Promise<ConnectionAttemptLogsRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<ConnectionAttemptLogsResponseDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/connection-attempts/${encodeURIComponent(attemptId)}/logs`,
  )

  return mapConnectionAttemptLogsResponseDtoToRecord(dto)
}

export async function runAvailabilityCheck(
  accountId: string,
  options: AccountRequestOptions = {},
): Promise<AvailabilityCheckResultDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<AvailabilityCheckResultDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/availability-checks`,
    {
      method: 'POST',
    },
  )
}
