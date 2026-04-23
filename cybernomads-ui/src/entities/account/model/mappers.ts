import type {
  AccountConnectionAttemptDetailDto,
  AccountConnectionAttemptDetailRecord,
  AccountDetailDto,
  AccountDetailRecord,
  AccountPlatformColor,
  AccountPlatformView,
  AccountRecord,
  AccountStateTone,
  AccountStateView,
  AccountSummaryDto,
  ActiveTokenSummaryDto,
  ActiveTokenSummaryRecord,
  AvailabilityStatus,
  ConnectionAttemptLogsRecord,
  ConnectionAttemptLogsResponseDto,
  LatestConnectionAttemptSummaryDto,
  LatestConnectionAttemptSummaryRecord,
  LegacyMockAccountRecord,
  LifecycleStatus,
  LoginStatus,
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
  loginStatus: LoginStatus
  availabilityStatus: AvailabilityStatus
  hasActiveToken: boolean
  isConsumable: boolean
}): AccountStateView {
  if (input.lifecycleStatus === 'deleted') {
    return {
      label: '已删除',
      detail: '账号已逻辑删除，暂不可被消费。',
      tone: 'muted',
      signal: 'muted',
    }
  }

  if (input.lifecycleStatus === 'disabled') {
    return {
      label: '已停用',
      detail: '账号已停用，需要先恢复生命周期状态。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.loginStatus === 'connecting') {
    return {
      label: '连接中',
      detail: '已有待处理令牌，等待解析或校验完成。',
      tone: 'neutral',
      signal: 'primary',
    }
  }

  if (input.loginStatus === 'not_logged_in') {
    return {
      label: '未登录',
      detail: '当前账号还没有可用令牌。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.loginStatus === 'login_failed') {
    return {
      label: '校验失败',
      detail: '最近一次令牌校验未通过。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.loginStatus === 'expired') {
    return {
      label: '令牌过期',
      detail: '当前令牌已过期，需要重新接入。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (!input.hasActiveToken) {
    return {
      label: '未登录',
      detail: '当前账号还没有可用令牌。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.availabilityStatus === 'offline') {
    return {
      label: '离线',
      detail: '最近一次可用性检查未通过。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.availabilityStatus === 'restricted') {
    return {
      label: '受限',
      detail: '平台侧已限制当前账号能力。',
      tone: 'danger',
      signal: 'danger',
    }
  }

  if (input.availabilityStatus === 'risk') {
    return {
      label: '风险',
      detail: '最近一次检查提示账号存在风险。',
      tone: 'warning',
      signal: 'warning',
    }
  }

  if (input.availabilityStatus === 'unknown') {
    return {
      label: '待校验',
      detail: '令牌已接入，但尚未完成可用性检查。',
      tone: 'neutral',
      signal: 'primary',
    }
  }

  if (input.isConsumable) {
    return {
      label: '可用',
      detail: '账号和令牌状态均满足消费条件。',
      tone: 'healthy',
      signal: 'primary',
    }
  }

  return {
    label: '待处理',
    detail: '当前状态组合不可消费，请检查详情。',
    tone: 'neutral',
    signal: 'muted',
  }
}

function mapResolvedPlatformProfile(
  dto: ResolvedPlatformProfileDto,
): ResolvedPlatformProfileRecord {
  return {
    ...dto,
  }
}

function mapActiveToken(dto: ActiveTokenSummaryDto): ActiveTokenSummaryRecord {
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

function resolveAttemptState(
  attemptStatus: AccountConnectionAttemptDetailDto['attemptStatus'],
): { label: string; tone: AccountStateTone } {
  if (attemptStatus === 'pending_resolution') return { label: '待解析', tone: 'neutral' }
  if (attemptStatus === 'ready_for_validation') return { label: '待校验', tone: 'warning' }
  if (attemptStatus === 'validating') return { label: '校验中', tone: 'neutral' }
  if (attemptStatus === 'validation_succeeded') return { label: '已生效', tone: 'healthy' }
  if (attemptStatus === 'validation_failed') return { label: '校验失败', tone: 'danger' }
  if (attemptStatus === 'expired') return { label: '已过期', tone: 'warning' }
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

function mapLatestConnectionAttempt(
  dto: LatestConnectionAttemptSummaryDto,
): LatestConnectionAttemptSummaryRecord {
  const state = resolveAttemptState(dto.attemptStatus)

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
    validatedAtLabel: formatTimestamp(dto.validatedAt, {
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
  loginStatus: LoginStatus
  availabilityStatus: AvailabilityStatus
  resolvedPlatformProfile: ResolvedPlatformProfileRecord
  hasActiveToken: boolean
  isConsumable: boolean
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
    loginStatus: input.loginStatus,
    availabilityStatus: input.availabilityStatus,
    resolvedPlatformProfile: input.resolvedPlatformProfile,
    hasActiveToken: input.hasActiveToken,
    isConsumable: input.isConsumable,
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
    loginStatus: dto.loginStatus,
    availabilityStatus: dto.availabilityStatus,
    resolvedPlatformProfile: mapResolvedPlatformProfile(dto.resolvedPlatformProfile),
    hasActiveToken: dto.hasActiveToken,
    isConsumable: dto.isConsumable,
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
    loginStatus: dto.loginStatus,
    availabilityStatus: dto.availabilityStatus,
    resolvedPlatformProfile: mapResolvedPlatformProfile(dto.resolvedPlatformProfile),
    hasActiveToken: dto.activeToken.hasToken,
    isConsumable: dto.isConsumable,
    updatedAt: dto.updatedAt,
  })

  return {
    ...base,
    loginStatusReason: dto.loginStatusReason,
    availabilityStatusReason: dto.availabilityStatusReason,
    platformMetadata: dto.platformMetadata,
    activeToken: mapActiveToken(dto.activeToken),
    latestConnectionAttempt: dto.latestConnectionAttempt
      ? mapLatestConnectionAttempt(dto.latestConnectionAttempt)
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
    lastValidatedAt: dto.lastValidatedAt,
    lastValidatedAtLabel: formatTimestamp(dto.lastValidatedAt, {
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

export function mapAccountConnectionAttemptDetailDtoToRecord(
  dto: AccountConnectionAttemptDetailDto,
): AccountConnectionAttemptDetailRecord {
  const state = resolveAttemptState(dto.attemptStatus)

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
    validatedAtLabel: formatTimestamp(dto.validatedAt, {
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

export function mapConnectionAttemptLogsResponseDtoToRecord(
  dto: ConnectionAttemptLogsResponseDto,
): ConnectionAttemptLogsRecord {
  return {
    accountId: dto.accountId,
    attemptId: dto.attemptId,
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
          loginStatus: 'connected' as const,
          availabilityStatus: 'healthy' as const,
          hasActiveToken: true,
          isConsumable: true,
        }
      : mock.status === 'needs-auth'
        ? {
            loginStatus: 'expired' as const,
            availabilityStatus: 'unknown' as const,
            hasActiveToken: false,
            isConsumable: false,
          }
        : {
            loginStatus: 'connected' as const,
            availabilityStatus: 'risk' as const,
            hasActiveToken: true,
            isConsumable: false,
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
    loginStatusReason: record.loginStatus === 'expired' ? 'Mock 场景下未配置当前可用令牌。' : null,
    availabilityStatusReason: record.availabilityStatus === 'risk' ? 'Mock 场景下模拟为存在平台风控提醒。' : null,
    platformMetadata: {},
    activeToken: {
      hasToken: record.hasActiveToken,
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
    latestConnectionAttempt: null,
    lastConnectedAt: record.loginStatus === 'connected' ? record.updatedAt : null,
    lastConnectedAtLabel:
      record.loginStatus === 'connected'
        ? formatTimestamp(record.updatedAt, {
            year: 'numeric',
            month: '2-digit',
            day: '2-digit',
            hour: '2-digit',
            minute: '2-digit',
            hour12: false,
          })
        : null,
    lastValidatedAt: record.updatedAt,
    lastValidatedAtLabel: formatTimestamp(record.updatedAt, {
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
