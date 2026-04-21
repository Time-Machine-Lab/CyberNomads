import { describe, expect, it } from 'vitest'

import {
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
  mapLegacyMockAccountToRecord,
} from '@/entities/account/model/mappers'
import type { AccountDetailDto, AccountSummaryDto, LegacyMockAccountRecord } from '@/entities/account/model/types'

describe('account view model mappers', () => {
  it('maps backend account summary into consumable list presentation', () => {
    const summary: AccountSummaryDto = {
      accountId: 'acc-001',
      platform: 'bilibili',
      platformAccountUid: 'bili-main-001',
      displayName: 'Bili Main',
      tags: ['主账号', '种子'],
      lifecycleStatus: 'active',
      authorizationStatus: 'authorized',
      availabilityStatus: 'healthy',
      hasActiveCredential: true,
      hasPendingAuthorizationAttempt: false,
      isConsumable: true,
      updatedAt: '2026-04-21T12:30:00.000Z',
    }

    const record = mapAccountSummaryDtoToRecord(summary)

    expect(record.id).toBe('acc-001')
    expect(record.displayName).toBe('Bili Main')
    expect(record.platformAccountUid).toBe('bili-main-001')
    expect(record.platformView.label).toBe('Bilibili')
    expect(record.platformView.icon).toBe('play_circle')
    expect(record.state.label).toBe('可用')
    expect(record.status).toBe('connected')
    expect(record.isConsumable).toBe(true)
  })

  it('maps backend account detail into deleted read model without leaking raw credential payload', () => {
    const detail: AccountDetailDto = {
      accountId: 'acc-deleted',
      platform: 'bilibili',
      platformAccountUid: 'bili-deleted-001',
      displayName: 'Deleted Account',
      remark: 'to restore',
      tags: ['回收'],
      platformMetadata: {
        region: 'cn',
      },
      lifecycleStatus: 'deleted',
      authorizationStatus: 'authorized',
      authorizationStatusReason: 'Authorized before deletion.',
      availabilityStatus: 'unknown',
      availabilityStatusReason: 'Availability must be rechecked.',
      hasPendingAuthorizationAttempt: false,
      isConsumable: false,
      activeCredential: {
        hasCredential: true,
        credentialType: 'token',
        expiresAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-04-21T12:00:00.000Z',
      },
      authorizationAttempt: null,
      lastAuthorizedAt: '2026-04-21T12:00:00.000Z',
      lastAvailabilityCheckedAt: null,
      deletedAt: '2026-04-21T13:00:00.000Z',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-21T13:00:00.000Z',
    }

    const record = mapAccountDetailDtoToRecord(detail)

    expect(record.lifecycleStatus).toBe('deleted')
    expect(record.state.label).toBe('已删除')
    expect(record.platformAccountUid).toBe('bili-deleted-001')
    expect(record.activeCredential.credentialType).toBe('token')
    expect(record.deletedAtLabel).toContain('2026')
    expect(record.platformMetadata).toEqual({ region: 'cn' })
  })

  it('maps legacy mock account into stable semantic fields', () => {
    const legacy: LegacyMockAccountRecord = {
      id: 'mock-01',
      name: 'Mock Account',
      platform: '小红书',
      owner: 'mock owner',
      uid: 'xh-001',
      tags: ['科技'],
      status: 'needs-auth',
      statusLabel: 'Token 过期',
      lastActiveLabel: '刚刚',
      lastSyncedAt: '2026-04-21T11:00:00.000Z',
    }

    const record = mapLegacyMockAccountToRecord(legacy)

    expect(record.authorizationStatus).toBe('expired')
    expect(record.availabilityStatus).toBe('unknown')
    expect(record.state.label).toBe('授权过期')
    expect(record.status).toBe('needs-auth')
    expect(record.isConsumable).toBe(false)
  })
})
