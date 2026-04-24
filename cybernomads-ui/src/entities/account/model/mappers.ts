import type {
  AccessSessionDetailDto,
  AccessSessionDetailRecord,
  AccessSessionLogsRecord,
  AccessSessionLogsResponseDto,
  AccountDetailDto,
  AccountDetailRecord,
  AccountPlatformColor,
  AccountPlatformView,
  AccountRecord,
  AccountStateTone,
  AccountStateView,
  AccountSummaryDto,
  AvailabilityStatus,
  ConnectionStatus,
  CurrentAccessSessionSummaryDto,
  CurrentAccessSessionSummaryRecord,
  CurrentCredentialSummaryDto,
  CurrentCredentialSummaryRecord,
  LegacyMockAccountRecord,
  LifecycleStatus,
  ResolvedPlatformProfileDto,
  ResolvedPlatformProfileRecord,
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

export function resolvePlatformView(platform: string): AccountPlatformView {
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
      label: '抖音',
      icon: 'music_note',
      color: 'amber',
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

export function resolvePlatformColorClass(color: AccountPlatformColor) {
  if (color === 'red') return 'red'
  if (color === 'blue') return 'blue'
  if (color === 'amber') return 'amber'
  if (color === 'slate') return 'slate'
  if (color === 'default') return 'default'
  return 'primary'
}

function resolveState(input: {
  lifecycleStatus: LifecycleStatus
  connectionStatus: ConnectionStatus
  availabilityStatus: AvailabilityStatus
  hasCurrentCredential: boolean
}): AccountStateView {
  if (input.lifecycleStatus === 'deleted') {
    return {
      label: '已删除',
      detail: '账号已逻辑删除，暂不可继续接入。',
      tone: 'muted',
      signal: 'muted',
    }
  }

  if (input.lifecycleStatus === 'disabled') {
    return {
      label: '已停用',
      detail: '账号已停用，需要先恢复后再继续操作。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.connectionStatus === 'connecting') {
    return {
      label: '接入中',
      detail: '当前存在进行中的令牌接入会话。',
      tone: 'neutral',
      signal: 'primary',
    }
  }

  if (input.connectionStatus === 'not_logged_in') {
    return {
      label: '未登录',
      detail: '当前账号还没有已生效令牌。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.connectionStatus === 'connect_failed') {
    return {
      label: '接入失败',
      detail: '最近一次令牌校验未通过。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.connectionStatus === 'expired') {
    return {
      label: '令牌过期',
      detail: '当前令牌已过期，需要重新接入。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (!input.hasCurrentCredential) {
    return {
      label: '未登录',
      detail: '当前账号还没有已生效令牌。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.availabilityStatus === 'offline') {
    return {
      label: '已连接',
      detail: '连接已建立，但最近一次诊断提示离线。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.availabilityStatus === 'restricted' || input.availabilityStatus === 'risk') {
    return {
      label: '已连接',
      detail: '连接已建立，但当前存在风险或受限提示。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  return {
    label: '已连接',
    detail: '账号已完成接入，可继续查看或替换当前令牌。',
    tone: 'healthy',
    signal: 'primary',
  }
}

function mapResolvedPlatformProfile(
  dto: ResolvedPlatformProfileDto,
): ResolvedPlatformProfileRecord {
  return {
    ...dto,
  }
}

function mapCurrentCredential(dto: CurrentCredentialSummaryDto): CurrentCredentialSummaryRecord {
  return {
    ...dto,
    expiresAtLabel: formatTimestamp(dto.expiresAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    updatedAtLabel: formatTimestamp(dto.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

function resolveSessionState(
  sessionStatus: AccessSessionDetailDto['sessionStatus'],
): { label: string; tone: AccountStateTone } {
  if (sessionStatus === 'waiting_for_scan') return { label: '待扫码', tone: 'neutral' }
  if (sessionStatus === 'waiting_for_confirmation') return { label: '待确认', tone: 'neutral' }
  if (sessionStatus === 'ready_for_verification') return { label: '待验证', tone: 'warning' }
  if (sessionStatus === 'verifying') return { label: '验证中', tone: 'neutral' }
  if (sessionStatus === 'verified') return { label: '已生效', tone: 'healthy' }
  if (sessionStatus === 'verify_failed') return { label: '验证失败', tone: 'danger' }
  if (sessionStatus === 'expired') return { label: '已过期', tone: 'warning' }
  return { label: '已取消', tone: 'muted' }
}

function resolveChallengeImageUrl(challenge: Record<string, unknown> | null) {
  if (!challenge || typeof challenge.imageUrl !== 'string') {
    return null
  }

  return challenge.imageUrl
}

function resolveChallengeMessage(challenge: Record<string, unknown> | null) {
  if (!challenge || typeof challenge.message !== 'string') {
    return null
  }

  return challenge.message
}

function mapCurrentAccessSession(
  dto: CurrentAccessSessionSummaryDto,
): CurrentAccessSessionSummaryRecord {
  const state = resolveSessionState(dto.sessionStatus)

  return {
    ...dto,
    createdAtLabel: formatTimestamp(dto.createdAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    updatedAtLabel: formatTimestamp(dto.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    verifiedAtLabel: formatTimestamp(dto.verifiedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    appliedAtLabel: formatTimestamp(dto.appliedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    expiresAtLabel: formatTimestamp(dto.expiresAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    challengeImageUrl: resolveChallengeImageUrl(dto.challenge),
    challengeMessage: resolveChallengeMessage(dto.challenge),
    stateLabel: state.label,
    stateTone: state.tone,
  }
}

function buildRecord(input: {
  id: string
  platform: string
  internalDisplayName: string
  remark: string | null
  tags: string[]
  lifecycleStatus: LifecycleStatus
  connectionStatus: ConnectionStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileRecord
  hasCurrentCredential: boolean
  updatedAt: string
}): AccountRecord {
  const state = resolveState(input)
  const updatedAtLabel = formatTimestamp(input.updatedAt) ?? '未更新'

  return {
    id: input.id,
    platform: input.platform,
    platformView: resolvePlatformView(input.platform),
    internalDisplayName: input.internalDisplayName,
    remark: input.remark,
    tags: input.tags,
    lifecycleStatus: input.lifecycleStatus,
    connectionStatus: input.connectionStatus,
    availabilityStatus: input.availabilityStatus,
    resolvedPlatformProfile: input.resolvedPlatformProfile,
    hasCurrentCredential: input.hasCurrentCredential,
    updatedAt: input.updatedAt,
    updatedAtLabel,
    state,
  }
}

export function mapAccountSummaryDtoToRecord(dto: AccountSummaryDto): AccountRecord {
  return buildRecord({
    id: dto.accountId,
    platform: dto.platform,
    internalDisplayName: dto.internalDisplayName,
    remark: null,
    tags: dto.tags,
    lifecycleStatus: dto.lifecycleStatus,
    connectionStatus: dto.connectionStatus,
    availabilityStatus: dto.availabilityStatus,
    resolvedPlatformProfile: mapResolvedPlatformProfile(dto.resolvedPlatformProfile),
    hasCurrentCredential: dto.hasCurrentCredential,
    updatedAt: dto.updatedAt,
  })
}

export function mapAccountDetailDtoToRecord(dto: AccountDetailDto): AccountDetailRecord {
  const base = buildRecord({
    id: dto.accountId,
    platform: dto.platform,
    internalDisplayName: dto.internalDisplayName,
    remark: dto.remark,
    tags: dto.tags,
    lifecycleStatus: dto.lifecycleStatus,
    connectionStatus: dto.connectionStatus,
    availabilityStatus: dto.availabilityStatus,
    resolvedPlatformProfile: mapResolvedPlatformProfile(dto.resolvedPlatformProfile),
    hasCurrentCredential: dto.currentCredential.hasCredential,
    updatedAt: dto.updatedAt,
  })

  return {
    ...base,
    connectionStatusReason: dto.connectionStatusReason,
    availabilityStatusReason: dto.availabilityStatusReason,
    platformMetadata: dto.platformMetadata,
    currentCredential: mapCurrentCredential(dto.currentCredential),
    currentAccessSession: dto.currentAccessSession
      ? mapCurrentAccessSession(dto.currentAccessSession)
      : null,
    lastConnectedAt: dto.lastConnectedAt,
    lastConnectedAtLabel: formatTimestamp(dto.lastConnectedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    lastVerifiedAt: dto.lastVerifiedAt,
    lastVerifiedAtLabel: formatTimestamp(dto.lastVerifiedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    createdAt: dto.createdAt,
    createdAtLabel: formatTimestamp(dto.createdAt, {
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
  }
}

export function mapAccessSessionDetailDtoToRecord(
  dto: AccessSessionDetailDto,
): AccessSessionDetailRecord {
  const state = resolveSessionState(dto.sessionStatus)

  return {
    ...dto,
    stateLabel: state.label,
    stateTone: state.tone,
    challengeImageUrl: resolveChallengeImageUrl(dto.challenge),
    challengeMessage: resolveChallengeMessage(dto.challenge),
    createdAtLabel: formatTimestamp(dto.createdAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    updatedAtLabel: formatTimestamp(dto.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    verifiedAtLabel: formatTimestamp(dto.verifiedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    appliedAtLabel: formatTimestamp(dto.appliedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    expiresAtLabel: formatTimestamp(dto.expiresAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
  }
}

export function mapAccessSessionLogsResponseDtoToRecord(
  dto: AccessSessionLogsResponseDto,
): AccessSessionLogsRecord {
  return {
    accountId: dto.accountId,
    sessionId: dto.sessionId,
    entries: dto.entries.map((entry) => ({
      ...entry,
      timestampLabel: formatTimestamp(entry.timestamp, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit',
        hour12: false,
      }),
    })),
  }
}

export function mapLegacyMockAccountToRecord(mock: LegacyMockAccountRecord): AccountRecord {
  const semantics =
    mock.status === 'connected'
      ? {
          connectionStatus: 'connected' as const,
          availabilityStatus: 'healthy' as const,
          hasCurrentCredential: true,
        }
      : mock.status === 'needs-auth'
        ? {
            connectionStatus: 'expired' as const,
            availabilityStatus: 'unknown' as const,
            hasCurrentCredential: false,
          }
        : {
            connectionStatus: 'connected' as const,
            availabilityStatus: 'risk' as const,
            hasCurrentCredential: true,
          }

  return buildRecord({
    id: mock.id,
    platform: mock.platform,
    internalDisplayName: mock.name,
    remark: mock.owner,
    tags: mock.tags,
    lifecycleStatus: 'active',
    resolvedPlatformProfile: {
      resolvedPlatformAccountUid: mock.uid,
      resolvedDisplayName: mock.name,
      resolvedAvatarUrl: mock.avatarUrl ?? null,
      resolvedProfileMetadata: {},
    },
    updatedAt: mock.lastSyncedAt,
    ...semantics,
  })
}

export function mapLegacyMockAccountToDetailRecord(mock: LegacyMockAccountRecord): AccountDetailRecord {
  const record = mapLegacyMockAccountToRecord(mock)

  return {
    ...record,
    connectionStatusReason: record.connectionStatus === 'expired' ? 'Mock 场景下未配置当前可用令牌。' : null,
    availabilityStatusReason: record.availabilityStatus === 'risk' ? 'Mock 场景下模拟为存在平台风控提醒。' : null,
    platformMetadata: {},
    currentCredential: {
      hasCredential: record.hasCurrentCredential,
      expiresAt: null,
      updatedAt: record.updatedAt,
      expiresAtLabel: null,
      updatedAtLabel: formatTimestamp(record.updatedAt, {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        hour12: false,
      }),
    },
    currentAccessSession: null,
    lastConnectedAt: record.connectionStatus === 'connected' ? record.updatedAt : null,
    lastConnectedAtLabel:
      record.connectionStatus === 'connected'
        ? formatTimestamp(record.updatedAt, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : null,
    lastVerifiedAt: record.updatedAt,
    lastVerifiedAtLabel: formatTimestamp(record.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    createdAt: record.updatedAt,
    createdAtLabel: formatTimestamp(record.updatedAt, {
      year: 'numeric',
      month: '2-digit',
      day: '2-digit',
      hour: '2-digit',
      minute: '2-digit',
      hour12: false,
    }),
    deletedAt: null,
    deletedAtLabel: null,
  }
}
