import {
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
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
  return true
}

export async function listAccounts(options: ListAccountsOptions = {}): Promise<AccountRecord[]> {
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
  _options: AccountRequestOptions = {},
): Promise<AccountDetailRecord | null> {
  void _options

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
  _options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  void _options

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function deleteAccount(
  id: string,
  _options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  void _options

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function restoreAccount(
  id: string,
  _options: AccountRequestOptions = {},
): Promise<AccountDetailRecord> {
  void _options

  const dto = await requestJson<AccountDetailDto>(`${ACCOUNT_API_ROOT}/${encodeURIComponent(id)}/restore`, {
    method: 'POST',
  })

  return mapAccountDetailDtoToRecord(dto)
}

export async function startAuthorizationAttempt(
  accountId: string,
  input: StartAuthorizationAttemptInput,
  _options: AccountRequestOptions = {},
): Promise<AuthorizationAttemptSummary> {
  void _options

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
  _options: AccountRequestOptions = {},
): Promise<VerifyAuthorizationAttemptResponseDto> {
  void _options

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
  _options: AccountRequestOptions = {},
): Promise<AvailabilityCheckResultDto> {
  void _options

  return requestJson<AvailabilityCheckResultDto>(
    `${ACCOUNT_API_ROOT}/${encodeURIComponent(accountId)}/availability-checks`,
    {
      method: 'POST',
    },
  )
}

export async function startAccountOnboardingSession(
  input: StartAccountOnboardingSessionInput,
  _options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  void _options

  return requestJson<AccountOnboardingSessionDetailDto>(ACCOUNT_ONBOARDING_API_ROOT, {
    method: 'POST',
    body: input,
  })
}

export async function getAccountOnboardingSession(
  sessionId: string,
  _options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  void _options

  return requestJson<AccountOnboardingSessionDetailDto>(
    `${ACCOUNT_ONBOARDING_API_ROOT}/${encodeURIComponent(sessionId)}`,
  )
}

export async function resolveAccountOnboardingSession(
  sessionId: string,
  input: ResolveAccountOnboardingSessionInput,
  _options: AccountRequestOptions = {},
): Promise<AccountOnboardingSessionDetailDto> {
  void _options

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
  _options: AccountRequestOptions = {},
): Promise<FinalizeAccountOnboardingSessionResponseDto> {
  void _options

  return requestJson<FinalizeAccountOnboardingSessionResponseDto>(
    `${ACCOUNT_ONBOARDING_API_ROOT}/${encodeURIComponent(sessionId)}/finalize`,
    {
      method: 'POST',
    },
  )
}

export async function updateAccountStatus(
  id: string,
  status: AccountStatus,
  _options: AccountRequestOptions = {},
): Promise<AccountDetailRecord | null> {
  void _options

  throw new Error(`Legacy updateAccountStatus is removed for real backend runtime (${id}, ${status}).`)
}
