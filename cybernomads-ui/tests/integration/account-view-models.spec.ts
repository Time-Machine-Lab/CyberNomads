import { describe, expect, it } from 'vitest'

import {
  mapAccountDetailDtoToRecord,
  mapAccountSummaryDtoToRecord,
  mapLegacyMockAccountToRecord,
} from '@/entities/account/model/mappers'
import type { AccountDetailDto, AccountSummaryDto, LegacyMockAccountRecord } from '@/entities/account/model/types'

describe('account view model mappers', () => {
  it('maps backend account summary into the rebuilt account list presentation', () => {
    const summary: AccountSummaryDto = {
      accountId: 'acc-001',
      platform: 'bilibili',
      internalDisplayName: 'Bili Main',
      tags: ['主账号', '种子'],
      lifecycleStatus: 'active',
      connectionStatus: 'connected',
      availabilityStatus: 'healthy',
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: 'bili-main-001',
        resolvedDisplayName: 'Bili Main',
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
      },
      hasCurrentCredential: true,
      updatedAt: '2026-04-21T12:30:00.000Z',
    }

    const record = mapAccountSummaryDtoToRecord(summary)

    expect(record.id).toBe('acc-001')
    expect(record.internalDisplayName).toBe('Bili Main')
    expect(record.resolvedPlatformProfile.resolvedPlatformAccountUid).toBe('bili-main-001')
    expect(record.platformView.label).toBe('Bilibili')
    expect(record.platformView.icon).toBe('play_circle')
    expect(record.state.label).toBe('已连接')
    expect(record.connectionStatus).toBe('connected')
    expect(record.hasCurrentCredential).toBe(true)
  })

  it('maps backend account detail into deleted read model without leaking raw credential payload', () => {
    const detail: AccountDetailDto = {
      accountId: 'acc-deleted',
      platform: 'bilibili',
      internalDisplayName: 'Deleted Account',
      remark: 'to restore',
      tags: ['回收'],
      platformMetadata: {
        region: 'cn',
      },
      lifecycleStatus: 'deleted',
      connectionStatus: 'connected',
      connectionStatusReason: 'Authorized before deletion.',
      availabilityStatus: 'unknown',
      availabilityStatusReason: 'Availability must be rechecked.',
      resolvedPlatformProfile: {
        resolvedPlatformAccountUid: 'bili-deleted-001',
        resolvedDisplayName: 'Deleted Account',
        resolvedAvatarUrl: null,
        resolvedProfileMetadata: {},
      },
      currentCredential: {
        hasCredential: true,
        expiresAt: '2026-05-01T00:00:00.000Z',
        updatedAt: '2026-04-21T12:00:00.000Z',
      },
      currentAccessSession: null,
      lastConnectedAt: '2026-04-21T12:00:00.000Z',
      lastVerifiedAt: '2026-04-21T12:00:00.000Z',
      deletedAt: '2026-04-21T13:00:00.000Z',
      createdAt: '2026-04-20T08:00:00.000Z',
      updatedAt: '2026-04-21T13:00:00.000Z',
    }

    const record = mapAccountDetailDtoToRecord(detail)

    expect(record.lifecycleStatus).toBe('deleted')
    expect(record.state.label).toBe('已删除')
    expect(record.resolvedPlatformProfile.resolvedPlatformAccountUid).toBe('bili-deleted-001')
    expect(record.currentCredential.hasCredential).toBe(true)
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

    expect(record.connectionStatus).toBe('expired')
    expect(record.availabilityStatus).toBe('unknown')
    expect(record.state.label).toBe('令牌过期')
    expect(record.hasCurrentCredential).toBe(false)
    expect(record.platformView.label).toBe('小红书')
  })
})
