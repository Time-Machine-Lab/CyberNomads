import {
  mapAccessSessionDetailDtoToRecord,
  mapAccessSessionLogsResponseDtoToRecord,
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
  mapLegacyMockAccountToDetailRecord,
  mapLegacyMockAccountToRecord,
} from '@/entities/account/model/mappers'
import type {
  AccessSessionDetailDto,
  AccessSessionDetailRecord,
  AccessSessionLogsRecord,
  AccessSessionLogsResponseDto,
  AccountDetailDto,
  AccountDetailRecord,
  AccountRecord,
  CreateAccountInput,
  ListAccountsQuery,
  ListAccountsResultDto,
  PollAccessSessionInput,
  StartQrAccessSessionInput,
  StartTokenAccessSessionInput,
  UpdateAccountInput,
  VerifyAccessSessionInput,
  VerifyAccessSessionResponseDto,
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

function resolveSource(source?: AccountDataSource): AccountDataSource {
  return source ?? 'real'
}

function assertRealAccountApi(source: AccountDataSource) {
  if (source === 'real') {
    return
  }

  throw new Error('当前未启用账号模块真实后端，请开启真实账号接口后重试。')
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
    connectionStatus: options.connectionStatus,
    availabilityStatus: options.availabilityStatus,
    includeDeleted: options.includeDeleted,
    onlyConnected: options.onlyConnected,
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

export async function startTokenAccessSession(
  accountId: string,
  input: StartTokenAccessSessionInput,
  options: AccountRequestOptions = {},
): Promise<AccessSessionDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccessSessionDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/token`,
    {
      method: 'POST',
      body: input,
    },
  )

  return mapAccessSessionDetailDtoToRecord(dto)
}

export async function startQrAccessSession(
  accountId: string,
  input: StartQrAccessSessionInput = {},
  options: AccountRequestOptions = {},
): Promise<AccessSessionDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccessSessionDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/qr`,
    {
      method: 'POST',
      body: input,
    },
  )

  return mapAccessSessionDetailDtoToRecord(dto)
}

export async function getAccessSession(
  accountId: string,
  sessionId: string,
  options: AccountRequestOptions = {},
): Promise<AccessSessionDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccessSessionDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/${encodeURIComponent(sessionId)}`,
  )

  return mapAccessSessionDetailDtoToRecord(dto)
}

export async function pollAccessSession(
  accountId: string,
  sessionId: string,
  input: PollAccessSessionInput = {},
  options: AccountRequestOptions = {},
): Promise<AccessSessionDetailRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccessSessionDetailDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/${encodeURIComponent(sessionId)}/poll`,
    {
      method: 'POST',
      body: input,
    },
  )

  return mapAccessSessionDetailDtoToRecord(dto)
}

export async function verifyAccessSession(
  accountId: string,
  sessionId: string,
  input: VerifyAccessSessionInput = {},
  options: AccountRequestOptions = {},
): Promise<VerifyAccessSessionResponseDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<VerifyAccessSessionResponseDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/${encodeURIComponent(sessionId)}/verify`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function getAccessSessionLogs(
  accountId: string,
  sessionId: string,
  options: AccountRequestOptions = {},
): Promise<AccessSessionLogsRecord> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  const dto = await requestJson<AccessSessionLogsResponseDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/access-sessions/${encodeURIComponent(sessionId)}/logs`,
  )

  return mapAccessSessionLogsResponseDtoToRecord(dto)
}
