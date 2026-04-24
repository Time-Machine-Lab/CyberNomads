import type { AccountSummaryDto } from '@/entities/account/model/types'
import type { CurrentAgentServiceDto } from '@/entities/agent/model/types'
import type { ProductDetailDto, ProductSummaryDto } from '@/entities/asset/model/types'
import type { StrategyDetailDto, StrategySummaryDto } from '@/entities/strategy/model/types'
import type { TaskDetailDto, TaskOutputRecordDto, TaskSummaryDto } from '@/entities/task-run/model/types'
import type { TrafficWorkDetailDto, TrafficWorkSummaryDto } from '@/entities/workspace/model/types'

export const now = '2026-04-23T08:00:00.000Z'

export const agentService: CurrentAgentServiceDto = {
  agentServiceId: 'agent-service-openclaw',
  providerCode: 'openclaw',
  endpointUrl: 'http://localhost:5111',
  authenticationKind: 'token',
  hasCredential: true,
  connectionStatus: 'connected',
  connectionStatusReason: null,
  capabilityStatus: 'ready',
  capabilityStatusReason: null,
  isActive: true,
  isUsable: true,
  lastVerifiedAt: now,
  lastConnectedAt: now,
  capabilityPreparedAt: now,
  createdAt: now,
  updatedAt: now,
}

export const accountSummary: AccountSummaryDto = {
  accountId: 'account-bili-main',
  platform: 'bilibili',
  internalDisplayName: 'Bilibili Main',
  tags: ['primary'],
  lifecycleStatus: 'active',
  connectionStatus: 'connected',
  availabilityStatus: 'healthy',
  resolvedPlatformProfile: {
    resolvedPlatformAccountUid: 'bili-main',
    resolvedDisplayName: 'Bilibili Main',
    resolvedAvatarUrl: null,
    resolvedProfileMetadata: {},
  },
  hasCurrentCredential: true,
  updatedAt: now,
}

export const productSummary: ProductSummaryDto = {
  productId: 'product-launch',
  name: 'Launch Product',
  updatedAt: now,
}

export const productDetail: ProductDetailDto = {
  ...productSummary,
  contentMarkdown: '# Launch Product',
  createdAt: now,
}

export const strategySummary: StrategySummaryDto = {
  strategyId: 'strategy-growth',
  name: 'Growth Strategy',
  summary: 'Coordinate traffic acquisition.',
  tags: ['growth'],
  updatedAt: now,
}

export const strategyDetail: StrategyDetailDto = {
  ...strategySummary,
  contentMarkdown: '# Growth Strategy',
  placeholders: [
    {
      type: '账号',
      key: '账号A',
      defaultValue: 'CyberNomads',
    },
    {
      type: '风控时间',
      key: '冷却时长',
      defaultValue: '5秒',
    },
  ],
  createdAt: now,
}

export const trafficWorkDetail: TrafficWorkDetailDto = {
  trafficWorkId: 'traffic-work-launch',
  displayName: 'Launch Product / Growth Strategy',
  product: {
    productId: productSummary.productId,
    name: productSummary.name,
  },
  strategy: {
    strategyId: strategySummary.strategyId,
    name: strategySummary.name,
  },
  objectBindings: [
    {
      objectType: 'account',
      objectKey: 'primary-account',
      resourceId: accountSummary.accountId,
      resourceLabel: accountSummary.internalDisplayName,
    },
    {
      objectType: '账号',
      objectKey: '账号A',
      resourceId: 'CyberNomads',
      resourceLabel: 'CyberNomads',
    },
    {
      objectType: '风控时间',
      objectKey: '冷却时长',
      resourceId: '5秒',
      resourceLabel: '5秒',
    },
  ],
  lifecycleStatus: 'ready',
  lifecycleStatusReason: null,
  contextPreparationStatus: 'prepared',
  contextPreparationStatusReason: null,
  contextPreparedAt: now,
  lastStartedAt: null,
  endedAt: null,
  archivedAt: null,
  deletedAt: null,
  createdAt: now,
  updatedAt: now,
}

export const trafficWorkSummary: TrafficWorkSummaryDto = {
  trafficWorkId: trafficWorkDetail.trafficWorkId,
  displayName: trafficWorkDetail.displayName,
  product: trafficWorkDetail.product,
  strategy: trafficWorkDetail.strategy,
  objectBindingCount: trafficWorkDetail.objectBindings.length,
  lifecycleStatus: trafficWorkDetail.lifecycleStatus,
  contextPreparationStatus: trafficWorkDetail.contextPreparationStatus,
  updatedAt: trafficWorkDetail.updatedAt,
}

export const taskSummary: TaskSummaryDto = {
  taskId: 'task-research',
  trafficWorkId: trafficWorkDetail.trafficWorkId,
  name: 'Research target audience',
  status: 'ready',
  condition: {
    cron: null,
    relyOnTaskIds: [],
  },
  inputNeeds: [
    {
      name: 'product',
      description: 'Product context',
      source: 'traffic-work-context',
    },
  ],
  updatedAt: now,
}

export const taskDetail: TaskDetailDto = {
  ...taskSummary,
  instruction: 'Review the product context and produce a target audience brief.',
  documentRef: null,
  contextRef: 'traffic-work-context://traffic-work-launch',
  statusReason: null,
  createdAt: now,
}

export const outputRecord: TaskOutputRecordDto = {
  outputRecordId: 'output-brief',
  taskId: taskSummary.taskId,
  description: 'Initial brief created',
  dataLocation: 'task-output://task-research/output-brief',
  createdAt: now,
}
