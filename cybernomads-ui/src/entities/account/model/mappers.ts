import type {
  AccountDetailDto,
  AccountDetailRecord,
  AccountPlatformView,
  AccountRecord,
  AccountStateView,
  AccountStatus,
  AccountSummaryDto,
  AuthorizationStatus,
  AvailabilityStatus,
  LegacyMockAccountRecord,
  LifecycleStatus,
} from '@/entities/account/model/types'

function formatTimestamp(
  value: string | null | undefined,
  options: Intl.DateTimeFormatOptions = {
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  },
) {
  if (!value) {
    return null
  }

  const date = new Date(value)

  if (Number.isNaN(date.getTime())) {
    return null
  }

  return new Intl.DateTimeFormat('zh-CN', options).format(date).replace(/\//g, '-')
}

function normalizePlatform(platform: string) {
  return platform.trim().toLowerCase()
}

function resolvePlatformView(platform: string): AccountPlatformView {
  const normalized = normalizePlatform(platform)

  if (normalized === 'b站' || normalized.includes('bili')) {
    return {
      label: 'Bilibili',
      icon: 'play_circle',
      color: 'primary',
    }
  }

  if (normalized.includes('小红书') || normalized.includes('xiaohongshu') || normalized === 'red') {
    return {
      label: '小红书',
      icon: 'book',
      color: 'red',
    }
  }

  if (normalized.includes('抖音') || normalized.includes('douyin') || normalized.includes('tiktok')) {
    return {
      label: platform,
      icon: 'music_note',
      color: 'default',
    }
  }

  if (normalized === 'x' || normalized.includes('twitter')) {
    return {
      label: 'X / Twitter',
      icon: 'chat_bubble',
      color: 'blue',
    }
  }

  return {
    label: platform,
    icon: 'public',
    color: 'slate',
  }
}

function resolveLegacyStatus(input: {
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  hasActiveCredential: boolean
  isConsumable: boolean
  hasPendingAuthorizationAttempt: boolean
}): AccountStatus {
  if (input.isConsumable) {
    return 'connected'
  }

  if (
    input.lifecycleStatus === 'deleted' ||
    input.availabilityStatus === 'offline' ||
    input.availabilityStatus === 'restricted' ||
    input.availabilityStatus === 'risk'
  ) {
    return 'error'
  }

  if (
    input.authorizationStatus === 'unauthorized' ||
    input.authorizationStatus === 'expired' ||
    input.authorizationStatus === 'authorizing' ||
    input.hasPendingAuthorizationAttempt ||
    !input.hasActiveCredential
  ) {
    return 'needs-auth'
  }

  return 'error'
}

function resolveState(input: {
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  hasActiveCredential: boolean
  hasPendingAuthorizationAttempt: boolean
  isConsumable: boolean
}): AccountStateView {
  if (input.lifecycleStatus === 'deleted') {
    return {
      label: '已删除',
      detail: '账号已逻辑删除，暂不可调度或授权。',
      tone: 'muted',
      signal: 'muted',
    }
  }

  if (input.lifecycleStatus === 'disabled') {
    return {
      label: '已停用',
      detail: '账号已被停用，需要先恢复生命周期状态。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.hasPendingAuthorizationAttempt || input.authorizationStatus === 'authorizing') {
    return {
      label: '授权中',
      detail: '存在待验证凭证，确认成功后才会切换为生效凭证。',
      tone: 'neutral',
      signal: 'primary',
    }
  }

  if (input.authorizationStatus === 'unauthorized') {
    return {
      label: '未授权',
      detail: '当前账号还没有可用凭证。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.authorizationStatus === 'expired') {
    return {
      label: '授权过期',
      detail: '当前凭证已过期，需要重新录入并验证。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.authorizationStatus === 'revoked') {
    return {
      label: '授权撤销',
      detail: '平台侧已撤销授权，当前凭证不可继续使用。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.availabilityStatus === 'offline') {
    return {
      label: '离线',
      detail: '最近一次检查未通过，账号当前不可连接。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.availabilityStatus === 'restricted') {
    return {
      label: '受限',
      detail: '平台已限制账号能力，需要人工介入确认。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.availabilityStatus === 'risk') {
    return {
      label: '风险',
      detail: '最近检查提示账号存在风控或风险告警。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.authorizationStatus === 'authorized' && !input.hasActiveCredential) {
    return {
      label: '凭证缺失',
      detail: '授权状态异常，未解析到当前生效凭证。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.availabilityStatus === 'unknown') {
    return {
      label: '待校验',
      detail: '授权已完成，但还没有最近一次可用性检查结果。',
      tone: 'neutral',
      signal: 'primary',
    }
  }

  if (input.isConsumable) {
    return {
      label: '可用',
      detail: '账号可供下游模块安全消费。',
      tone: 'healthy',
      signal: 'primary',
    }
  }

  return {
    label: '待处理',
    detail: '当前状态组合不可消费，请检查账号详情。',
    tone: 'neutral',
    signal: 'muted',
  }
}

function buildRecord(input: {
  id: string
  displayName: string
  platform: string
  remark: string | null
  platformAccountUid: string
  tags: string[]
  avatarUrl?: string
  updatedAt: string
  lifecycleStatus: LifecycleStatus
  authorizationStatus: AuthorizationStatus
  availabilityStatus: AvailabilityStatus
  hasActiveCredential: boolean
  hasPendingAuthorizationAttempt: boolean
  isConsumable: boolean
}): AccountRecord {
  const state = resolveState(input)
  const updatedAtLabel = formatTimestamp(input.updatedAt) ?? '未更新'

  return {
    id: input.id,
    name: input.displayName,
    displayName: input.displayName,
    platform: input.platform,
    platformView: resolvePlatformView(input.platform),
    owner: input.remark ?? '',
    remark: input.remark,
    uid: input.platformAccountUid,
    platformAccountUid: input.platformAccountUid,
    avatarUrl: input.avatarUrl,
    tags: input.tags,
    statusLabel: state.label,
    lastActiveLabel: updatedAtLabel,
    status: resolveLegacyStatus(input),
    lastSyncedAt: input.updatedAt,
    updatedAt: input.updatedAt,
    updatedAtLabel,
    lifecycleStatus: input.lifecycleStatus,
    authorizationStatus: input.authorizationStatus,
    availabilityStatus: input.availabilityStatus,
    hasActiveCredential: input.hasActiveCredential,
    hasPendingAuthorizationAttempt: input.hasPendingAuthorizationAttempt,
    isConsumable: input.isConsumable,
    state,
  }
}

export function mapAccountSummaryDtoToRecord(dto: AccountSummaryDto): AccountRecord {
  return buildRecord({
    id: dto.accountId,
    displayName: dto.displayName,
    platform: dto.platform,
    remark: null,
    platformAccountUid: dto.platformAccountUid,
    tags: dto.tags,
    updatedAt: dto.updatedAt,
    lifecycleStatus: dto.lifecycleStatus,
    authorizationStatus: dto.authorizationStatus,
    availabilityStatus: dto.availabilityStatus,
    hasActiveCredential: dto.hasActiveCredential,
    hasPendingAuthorizationAttempt: dto.hasPendingAuthorizationAttempt,
    isConsumable: dto.isConsumable,
  })
}

export function mapAccountDetailDtoToRecord(dto: AccountDetailDto): AccountDetailRecord {
  const base = buildRecord({
    id: dto.accountId,
    displayName: dto.displayName,
    platform: dto.platform,
    remark: dto.remark,
    platformAccountUid: dto.platformAccountUid,
    tags: dto.tags,
    updatedAt: dto.updatedAt,
    lifecycleStatus: dto.lifecycleStatus,
    authorizationStatus: dto.authorizationStatus,
    availabilityStatus: dto.availabilityStatus,
    hasActiveCredential: dto.activeCredential.hasCredential,
    hasPendingAuthorizationAttempt: dto.hasPendingAuthorizationAttempt,
    isConsumable: dto.isConsumable,
  })

  return {
    ...base,
    authorizationStatusReason: dto.authorizationStatusReason,
    availabilityStatusReason: dto.availabilityStatusReason,
    platformMetadata: dto.platformMetadata,
    activeCredential: dto.activeCredential,
    authorizationAttempt: dto.authorizationAttempt,
    lastAuthorizedAt: dto.lastAuthorizedAt,
    lastAuthorizedAtLabel: formatTimestamp(dto.lastAuthorizedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    lastAvailabilityCheckedAt: dto.lastAvailabilityCheckedAt,
    lastAvailabilityCheckedAtLabel: formatTimestamp(dto.lastAvailabilityCheckedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    deletedAt: dto.deletedAt,
    deletedAtLabel: formatTimestamp(dto.deletedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    createdAt: dto.createdAt,
    createdAtLabel:
      formatTimestamp(dto.createdAt, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) ?? '未知',
  }
}

export function mapLegacyMockAccountToRecord(mock: LegacyMockAccountRecord): AccountRecord {
  const semantics =
    mock.status === 'connected'
      ? {
          lifecycleStatus: 'active' as const,
          authorizationStatus: 'authorized' as const,
          availabilityStatus: 'healthy' as const,
          hasActiveCredential: true,
          hasPendingAuthorizationAttempt: false,
          isConsumable: true,
        }
      : mock.status === 'needs-auth'
        ? {
            lifecycleStatus: 'active' as const,
            authorizationStatus: 'expired' as const,
            availabilityStatus: 'unknown' as const,
            hasActiveCredential: false,
            hasPendingAuthorizationAttempt: false,
            isConsumable: false,
          }
        : {
            lifecycleStatus: 'active' as const,
            authorizationStatus: 'authorized' as const,
            availabilityStatus: 'risk' as const,
            hasActiveCredential: true,
            hasPendingAuthorizationAttempt: false,
            isConsumable: false,
          }

  const record = buildRecord({
    id: mock.id,
    displayName: mock.name,
    platform: mock.platform,
    remark: mock.owner,
    platformAccountUid: mock.uid,
    tags: mock.tags,
    avatarUrl: mock.avatarUrl,
    updatedAt: mock.lastSyncedAt,
    ...semantics,
  })

  return {
    ...record,
    status: mock.status,
    statusLabel: mock.statusLabel ?? record.statusLabel,
    lastActiveLabel: mock.lastActiveLabel ?? record.lastActiveLabel,
  }
}

export function mapLegacyMockAccountToDetailRecord(mock: LegacyMockAccountRecord): AccountDetailRecord {
  const record = mapLegacyMockAccountToRecord(mock)

  return {
    ...record,
    authorizationStatusReason:
      record.authorizationStatus === 'expired' ? 'Mock 场景下未配置当前可用凭证。' : null,
    availabilityStatusReason:
      record.availabilityStatus === 'risk' ? 'Mock 场景下模拟为存在平台风控提醒。' : null,
    platformMetadata: {},
    activeCredential: {
      hasCredential: record.hasActiveCredential,
      credentialType: record.hasActiveCredential ? 'token' : null,
      expiresAt: null,
      updatedAt: record.updatedAt,
    },
    authorizationAttempt: null,
    lastAuthorizedAt: record.status === 'connected' ? record.updatedAt : null,
    lastAuthorizedAtLabel:
      record.status === 'connected'
        ? formatTimestamp(record.updatedAt, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : null,
    lastAvailabilityCheckedAt: record.updatedAt,
    lastAvailabilityCheckedAtLabel: formatTimestamp(record.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    deletedAt: null,
    deletedAtLabel: null,
    createdAt: record.updatedAt,
    createdAtLabel:
      formatTimestamp(record.updatedAt, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }) ?? '未知',
  }
}
