import {
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
  mapLegacyMockAccountToDetailRecord,
  mapLegacyMockAccountToRecord,
} from '@/entities/account/model/mappers'
import type {
  AccountDetailDto,
  AccountDetailRecord,
  AccountOnboardingSessionDetailDto,
  AccountRecord,
  AccountStatus,
  AuthorizationAttemptSummary,
  AvailabilityCheckResultDto,
  FinalizeAccountOnboardingSessionResponseDto,
  ListAccountsQuery,
  ListAccountsResultDto,
  ResolveAccountOnboardingSessionInput,
  StartAccountOnboardingSessionInput,
  StartAuthorizationAttemptInput,
  UpdateAccountInput,
  VerifyAuthorizationAttemptInput,
  VerifyAuthorizationAttemptResponseDto,
} from '@/entities/account/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'
import { env } from '@/shared/config/env'
import { getAccountData, listAccountsData, updateAccountStatusData } from '@/shared/mocks/runtime'

type AccountDataSource = 'mock' | 'real'

export interface AccountRequestOptions {
  source?: AccountDataSource
}

export interface ListAccountsOptions extends ListAccountsQuery {
  source?: AccountDataSource
}

const ACCOUNT_API_ROOT = '/accounts'
const ACCOUNT_ONBOARDING_API_ROOT = '/account-onboarding-sessions'

export function isRealAccountApiEnabled() {
  return env.useRealAccountApi
}

function resolveSource(source?: AccountDataSource): AccountDataSource {
  return source ?? (env.useRealAccountApi ? 'real' : 'mock')
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
    authorizationStatus: options.authorizationStatus,
    availabilityStatus: options.availabilityStatus,
    includeDeleted: options.includeDeleted,
    onlyConsumable: options.onlyConsumable,
  }
  const result = await requestJson<ListAccountsResultDto>(ACCOUNT_API_ROOT, {
    query,
  })

  return result.items.map(mapAccountSummaryDtoToRecord)
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

export async function startAuthorizationAttempt(
  accountId: string,
  input: StartAuthorizationAttemptInput,
  options: AccountRequestOptions = {},
): Promise<AuthorizationAttemptSummary> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<AuthorizationAttemptSummary>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/authorization-attempts`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function verifyAuthorizationAttempt(
  accountId: string,
  attemptId: string,
  input: VerifyAuthorizationAttemptInput,
  options: AccountRequestOptions = {},
): Promise<VerifyAuthorizationAttemptResponseDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<VerifyAuthorizationAttemptResponseDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/authorization-attempts/${encodeURIComponent(attemptId)}/verify`,
    {
      method: 'POST',
      body: input,
    },
  )
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

export async function startAccountOnboardingSession(
  input: StartAccountOnboardingSessionInput,
  options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<AccountOnboardingSessionDetailDto>(ACCOUNT_ONBOARDING_API_ROOT, {
    method: 'POST',
    body: input,
  })
}

export async function getAccountOnboardingSession(
  sessionId: string,
  options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<AccountOnboardingSessionDetailDto>(
    `${ACCOUNT_ONBOARDING_API_ROOT}/${encodeURIComponent(sessionId)}`,
  )
}

export async function resolveAccountOnboardingSession(
  sessionId: string,
  input: ResolveAccountOnboardingSessionInput,
  options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<AccountOnboardingSessionDetailDto>(
    `${ACCOUNT_ONBOARDING_API_ROOT}/${encodeURIComponent(sessionId)}/resolve`,
    {
      method: 'POST',
      body: input,
    },
  )
}

export async function finalizeAccountOnboardingSession(
  sessionId: string,
  options: AccountRequestOptions = {},
): Promise<FinalizeAccountOnboardingSessionResponseDto> {
  const source = resolveSource(options.source)

  assertRealAccountApi(source)

  return requestJson<FinalizeAccountOnboardingSessionResponseDto>(
    `${ACCOUNT_ONBOARDING_API_ROOT}/${encodeURIComponent(sessionId)}/finalize`,
    {
      method: 'POST',
    },
  )
}

// 兼容旧的 mock 页面动作，真实后端不再支持直接改状态。
export async function updateAccountStatus(
  id: string,
  status: AccountStatus,
  options: AccountRequestOptions = {},
): Promise<AccountDetailRecord | null> {
  const source = resolveSource(options.source)

  if (source === 'real') {
    throw new Error('Legacy updateAccountStatus 已废弃，请改用授权验证或可用性检查接口。')
  }

  const account = updateAccountStatusData(id, status)
  return account ? mapLegacyMockAccountToDetailRecord(account) : null
}
