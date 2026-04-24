import { ref } from 'vue'

import type { AccountStatus, LegacyMockAccountRecord } from '@/entities/account/model/types'
import type {
  AgentNodeConfigRecord,
  AgentNodeRecord,
  OpenClawSetupFormInput,
} from '@/entities/agent/model/types'
import type { ConsoleOverviewRecord, ConsoleSetupState } from '@/entities/console/model/types'
import type { AssetAttachmentRecord, AssetRecord, SaveAssetInput } from '@/entities/asset/model/types'
import type { InterventionRecord } from '@/entities/intervention-record/model/types'
import type { ExecutionLogEntry, TaskRunRecord } from '@/entities/task-run/model/types'
import { parseStrategyPlaceholdersFromMarkdown } from '@/entities/strategy/model/mappers'
import type {
  ListStrategiesResultDto,
  SaveStrategyInput,
  StrategyDetailDto,
  StrategySummaryDto,
} from '@/entities/strategy/model/types'
import type { CreateWorkspaceInput, WorkspaceRecord } from '@/entities/workspace/model/types'
import {
  referenceAccountBoardAvatarUrls,
  referenceTopbarAvatarUrl,
} from '@/shared/config/reference-ui'

export type MockScenarioId = 'setup' | 'baseline' | 'editing' | 'running' | 'failure'

export interface MockScenarioOption {
  id: MockScenarioId
  label: string
  description: string
}

interface MockDatabase {
  assets: AssetRecord[]
  strategies: StrategyDetailDto[]
  accounts: LegacyMockAccountRecord[]
  agentNodes: AgentNodeRecord[]
  workspaces: WorkspaceRecord[]
  taskRuns: TaskRunRecord[]
  executionLogs: ExecutionLogEntry[]
  interventionRecords: InterventionRecord[]
}

const scenarioOptions: MockScenarioOption[] = [
  { id: 'setup', label: 'Setup', description: '首启态：无活动节点、无可用账号。' },
  { id: 'baseline', label: 'Baseline', description: '稳定列表态与配置态。' },
  { id: 'editing', label: 'Editing', description: '编辑中的资源与待启动工作区。' },
  { id: 'running', label: 'Running', description: '执行台激活、日志滚动、节点运行中。' },
  { id: 'failure', label: 'Failure', description: '认证失败、任务阻塞、异常诊断。' },
]

function clone<T>(value: T): T {
  if (typeof structuredClone === 'function') {
    try {
      return structuredClone(value)
    } catch {
      return JSON.parse(JSON.stringify(value))
    }
  }

  return JSON.parse(JSON.stringify(value))
}

function nowIso() {
  return new Date().toISOString()
}

function createId(prefix: string) {
  return `${prefix}-${Math.random().toString(36).slice(2, 9)}`
}

function createAttachment(id: string, name: string, kind: AssetAttachmentRecord['kind']) {
  return { id, name, kind }
}

function createBaseAssets(): AssetRecord[] {
  return [
    {
      id: 'asset-core-whitepaper',
      name: '核心白皮书 v2.4',
      platform: 'Bilibili',
      summary: '包含最新的行业分析和转化漏斗设计，适合高净值用户。',
      markdown:
        '# 核心白皮书 v2.4\n\n- 行业分析\n- 转化漏斗设计\n- 高净值用户引导路径\n',
      status: 'ready',
      updatedAt: '2026-04-20T10:00:00.000Z',
      createdAt: '2026-04-18T08:10:00.000Z',
      category: '高转化',
      tags: ['高转化'],
      targetLabels: ['高净值用户', '行业观察者'],
      attachments: [createAttachment('asset-a1', 'whitepaper_v2_4.pdf', 'pdf')],
    },
    {
      id: 'asset-telegram-community',
      name: 'Telegram 专属社群',
      platform: 'Telegram',
      summary: '私密交流群组入口链接，需验证身份后进入。',
      markdown: '# Telegram 专属社群\n\n- 社群入口链接\n- 身份验证流程\n- 自动欢迎脚本\n',
      status: 'ready',
      updatedAt: '2026-04-19T13:20:00.000Z',
      createdAt: '2026-04-17T12:20:00.000Z',
      category: '社群',
      tags: ['社群'],
      targetLabels: ['私域用户', '高粘性群体'],
      attachments: [createAttachment('asset-b1', 'telegram_community.link', 'link')],
    },
    {
      id: 'asset-demo-video',
      name: '平台操作演示视频',
      platform: 'Video',
      summary: '5分钟核心功能快速上手教程，提高激活率。',
      markdown: '# 平台操作演示视频\n\n- 核心功能讲解\n- 操作步骤演示\n- 激活率提升建议\n',
      status: 'draft',
      updatedAt: '2026-04-18T08:30:00.000Z',
      createdAt: '2026-04-12T15:42:00.000Z',
      category: '教程',
      tags: ['教程'],
      targetLabels: ['新用户', '待激活人群'],
      attachments: [createAttachment('asset-c1', 'platform_demo.mp4', 'video')],
    },
  ]
}

function createBaseStrategies(): StrategyDetailDto[] {
  return [
    {
      strategyId: 'strategy-high-frequency-comments',
      name: '高频评论截流',
      summary: '在目标竞品账号下高频发布带有诱饵的专业评论。',
      contentMarkdown:
        '# 高频评论截流\n\n## 系统提示词配置\n- 搜索竞品热视频\n- 分析评论区用户意图\n- 按节奏发布诱饵评论\n- 输出标题使用 {{产品:标题="默认标题"}}\n',
      placeholders: [
        {
          type: '产品',
          key: '标题',
          defaultValue: '默认标题',
        },
      ],
      createdAt: '2026-04-18T08:10:00.000Z',
      updatedAt: '2026-04-20T11:00:00.000Z',
      tags: ['截流'],
    },
    {
      strategyId: 'strategy-deep-dm',
      name: '深度内容私信',
      summary: '通过自然语义匹配，向潜在目标用户发送深度定制化私信。',
      contentMarkdown:
        '# 深度内容私信\n\n## 互动执行配置\n1. 抽取高潜评论\n2. 生成价值评论\n3. 发送深度私信\n4. 主账号使用 {{账号:主账号="账号A"}} 执行首轮私信\n',
      placeholders: [
        {
          type: '账号',
          key: '主账号',
          defaultValue: '账号A',
        },
      ],
      createdAt: '2026-04-17T12:20:00.000Z',
      updatedAt: '2026-04-20T09:15:00.000Z',
      tags: ['私信'],
    },
    {
      strategyId: 'strategy-natural-growth',
      name: '自然增长滴灌',
      summary: '围绕内容节奏和评论互动建立自然增长链路，降低风控触发概率。',
      contentMarkdown: '# 自然增长滴灌\n\n## 社区执行逻辑\n- 评论触点生成\n- 价值回复\n- 追问引导\n',
      placeholders: [],
      createdAt: '2026-04-15T15:42:00.000Z',
      updatedAt: '2026-04-18T14:00:00.000Z',
      tags: ['滴灌'],
    },
    {
      strategyId: 'strategy-flash-t1',
      name: '闪电战 T1',
      summary: '高风险高回报的快节奏趋势植入策略，适合活动型短视频流量争夺。',
      contentMarkdown:
        '# 闪电战 T1\n\n## 风险约束\n- 控制发布频率\n- 预热素材准备\n- 异常即暂停\n- 活动时间 {{时间:发布时间="18:30"}}\n',
      placeholders: [
        {
          type: '时间',
          key: '发布时间',
          defaultValue: '18:30',
        },
      ],
      createdAt: '2026-04-14T09:30:00.000Z',
      updatedAt: '2026-04-17T17:10:00.000Z',
      tags: ['活动'],
    },
    {
      strategyId: 'strategy-precision-private-message',
      name: '精准转化追击',
      summary: '利用跟进消息和意向评分做多轮转化承接，聚焦强意图线索。',
      contentMarkdown:
        '# 精准转化追击\n\n## 执行结构\n- 元数据清理\n- 关键词密度控制\n- 标签回写\n- CTA 文案使用 {{动作:按钮文案="立即预约"}}\n',
      placeholders: [
        {
          type: '动作',
          key: '按钮文案',
          defaultValue: '立即预约',
        },
      ],
      createdAt: '2026-04-12T15:42:00.000Z',
      updatedAt: '2026-04-16T12:30:00.000Z',
      tags: ['追击'],
    },
  ]
}

function createBaseAccounts(statusMap?: Partial<Record<string, AccountStatus>>): LegacyMockAccountRecord[] {
  const statusFor = (id: string, fallback: AccountStatus) => statusMap?.[id] ?? fallback

  return [
    {
      id: 'account-bili-main',
      name: 'Cyber_Nova',
      platform: 'B站',
      owner: '运营一组',
      uid: 'BL-99281A',
      avatarUrl: referenceAccountBoardAvatarUrls.cyberNova,
      tags: ['数码'],
      status: statusFor('account-bili-main', 'connected'),
      statusLabel: '健康',
      lastActiveLabel: '02:44:11 GMT',
      lastSyncedAt: '2026-04-20T12:10:00.000Z',
    },
    {
      id: 'account-red-risk',
      name: 'TechReview_01',
      platform: '小红书',
      owner: '内容增长组',
      uid: 'XH-44129C',
      avatarUrl: referenceAccountBoardAvatarUrls.techReview,
      tags: ['科技'],
      status: statusFor('account-red-risk', 'error'),
      statusLabel: '风控',
      lastActiveLabel: '14:22:05 GMT',
      lastSyncedAt: '2026-04-20T11:20:00.000Z',
    },
    {
      id: 'account-dy-shadow',
      name: 'Ghost_Node_7',
      platform: '抖音',
      owner: '转化组',
      uid: 'DY-1100XX',
      avatarUrl: referenceAccountBoardAvatarUrls.ghostNode,
      tags: ['生活'],
      status: statusFor('account-dy-shadow', 'needs-auth'),
      statusLabel: 'Token 过期',
      lastActiveLabel: '1天前',
      lastSyncedAt: '2026-04-19T08:00:00.000Z',
    },
    {
      id: 'account-twitter-news',
      name: 'Global_News_Bot',
      platform: 'Twitter',
      owner: '国际化小组',
      uid: 'TW-88421',
      tags: ['资讯'],
      status: statusFor('account-twitter-news', 'connected'),
      statusLabel: '健康',
      lastActiveLabel: '00:15:00 GMT',
      lastSyncedAt: '2026-04-20T11:55:00.000Z',
    },
  ]
}

function createOpenClawConfig(status: AgentNodeConfigRecord['diagnosticsStatus']): AgentNodeConfigRecord {
  return {
    installPath: '/opt/cybernomads/openclaw',
    gatewayUrl: 'wss://gateway.eu-central.cybernomads.net:8443',
    authToken: 'sk-oc-981273981273912873',
    parallelLimit: 8,
    diagnosticsStatus: status,
    diagnosticsLogs: [
      '[SYS] 正在初始化诊断模块... O.K.',
      '[SYS] 加载核心参数集... O.K.',
      '[SYS] 验证安装路径... VALID',
      '[SYS] 解析网关地址... RESOLVED',
      '[SYS] 准备安全套接字层...',
      '[SYS] 等待握手请求...',
    ],
  }
}

function createActiveAgents(configStatus: AgentNodeConfigRecord['diagnosticsStatus']): AgentNodeRecord[] {
  return [
    {
      id: 'agent-openclaw-01',
      name: 'OpenClaw V1.2',
      type: 'openclaw',
      endpoint: 'http://localhost:5111',
      status: 'active',
      capabilityStatus: 'ready',
      notes: '所有核心节点运行正常。准备执行调度。',
      roleLabel: 'MASTER',
      versionLabel: 'v2.4.0 Online',
      badgeLabel: 'MASTER',
      latencyMs: 12,
      avatarUrl: referenceTopbarAvatarUrl,
      config: createOpenClawConfig(configStatus),
    },
    {
      id: 'agent-codex-01',
      name: 'Codex Agent',
      type: 'codex',
      endpoint: 'http://localhost:6010',
      status: 'idle',
      capabilityStatus: 'pending',
      notes: '优化的代码生成和协议分析引擎，适用于复杂系统调试和自动化脚本编写。',
      roleLabel: 'STANDBY',
      versionLabel: 'v5.4',
      latencyMs: 21,
    },
    {
      id: 'agent-bridge-01',
      name: 'Claude-3.5 Bridge',
      type: 'bridge',
      endpoint: '',
      status: 'missing',
      capabilityStatus: 'missing',
      notes: '通用语言模型桥接器。提供灵活的自然语言处理和广泛的上下文理解能力。',
      roleLabel: 'OFFLINE',
      versionLabel: 'bridge',
      latencyMs: 0,
    },
  ]
}

function createMissingAgent(): AgentNodeRecord {
  return {
    id: 'agent-openclaw-missing',
    name: 'OpenClaw Primary Node',
    type: 'openclaw',
    endpoint: '',
    status: 'missing',
    capabilityStatus: 'missing',
    notes: '未检测到活动代理，请先配置一个可用节点。',
    roleLabel: 'OFFLINE',
    versionLabel: 'v0.0',
    badgeLabel: 'SETUP',
    latencyMs: 0,
    config: createOpenClawConfig('offline'),
  }
}

function createConsoleCandidateAgents(): AgentNodeRecord[] {
  return [
    {
      id: 'agent-openclaw-setup',
      name: 'OpenClaw',
      type: 'openclaw',
      endpoint: '',
      status: 'missing',
      capabilityStatus: 'missing',
      notes: '专为高精度自主操作和复杂系统集成而设计。具有卓越的多步推理能力。',
      roleLabel: '推荐',
      badgeLabel: '推荐',
      config: createOpenClawConfig('offline'),
    },
    {
      id: 'agent-codex-setup',
      name: 'Codex Agent',
      type: 'codex',
      endpoint: '',
      status: 'idle',
      capabilityStatus: 'pending',
      notes: '优化的代码生成和协议分析引擎。适用于深度系统调试和自动化脚本编写。',
      roleLabel: '待机',
      versionLabel: 'v5.4',
      latencyMs: 21,
    },
    {
      id: 'agent-bridge-setup',
      name: 'Claude/GPT Bridge',
      type: 'bridge',
      endpoint: '',
      status: 'missing',
      capabilityStatus: 'missing',
      notes: '通用语言模型桥接器。提供灵活的自然语言处理和广泛的上下文理解能力。',
      roleLabel: '离线',
      versionLabel: 'bridge',
      latencyMs: 0,
    },
  ]
}

function createBaseWorkspaces(
  statuses?: Record<string, Partial<WorkspaceRecord>>,
): WorkspaceRecord[] {
  return [
    {
      id: 'workspace-nova-launch',
      name: 'B站科技团队',
      summary: '用于新品冷启动阶段的高频评论截流与线索筛选。',
      status: 'running',
      statusLabel: '运行中',
      assetId: 'asset-core-whitepaper',
      strategyId: 'strategy-high-frequency-comments',
      accountIds: ['account-bili-main'],
      taskIds: [
        'task-keyword-scan',
        'task-comment-extract',
        'task-profile-tagging',
        'task-data-cleanup',
        'task-lead-alert',
      ],
      lastRunAt: '2026-04-20T12:05:00.000Z',
      nextRunAt: '2026-04-20T14:00:00.000Z',
      assignedAgentLabels: ['12', 'A', 'X', '+4'],
      themeColor: 'cyan',
      ...statuses?.['workspace-nova-launch'],
    },
    {
      id: 'workspace-red-seeding',
      name: '小红书种草',
      summary: '适配内容种草与笔记互动，但当前未绑定活跃资产。',
      status: 'draft',
      statusLabel: '已停止',
      assetId: 'asset-telegram-community',
      strategyId: 'strategy-natural-growth',
      accountIds: ['account-red-risk'],
      taskIds: [],
      lastRunAt: '2026-04-20T09:05:00.000Z',
      nextRunAt: '2026-04-20T16:00:00.000Z',
      assignedAgentLabels: ['5'],
      themeColor: 'blue',
      ...statuses?.['workspace-red-seeding'],
    },
    {
      id: 'workspace-douyin-ops',
      name: '抖音爆款运营',
      summary: '面向活动型内容的趋势植入与话题预热工作区。',
      status: 'attention',
      statusLabel: '已完成',
      assetId: 'asset-demo-video',
      strategyId: 'strategy-flash-t1',
      accountIds: ['account-dy-shadow'],
      taskIds: [],
      lastRunAt: '2026-04-20T08:25:00.000Z',
      nextRunAt: '2026-04-20T18:00:00.000Z',
      assignedAgentLabels: ['8', 'D'],
      highlightBanner: '待人工确认',
      themeColor: 'lime',
      ...statuses?.['workspace-douyin-ops'],
    },
  ]
}

function createRunningTasks(workspaceId = 'workspace-nova-launch'): TaskRunRecord[] {
  return [
    {
      id: 'task-keyword-scan',
      workspaceId,
      name: 'B站关键词搜索',
      summary: '执行全站关键词检索，提取相关度前 50 的视频链接及基础数据指标。',
      status: 'completed',
      statusLabel: '已完成',
      progress: 100,
      lastRunAt: '2026-04-20T12:15:00.000Z',
      nextRunAt: '2026-04-20T14:00:00.000Z',
      code: 'task1',
      x: 80,
      y: 80,
      accent: 'cyan',
      note: '下次运行：14:00:00',
    },
    {
      id: 'task-comment-extract',
      workspaceId,
      name: '评论区线索提取',
      summary: '深入视频评论区，基于情感分析模型提取潜在客户意向及互动线索。',
      status: 'running',
      statusLabel: '执行中',
      progress: 48,
      lastRunAt: '2026-04-20T12:15:30.000Z',
      nextRunAt: '2026-04-20T12:30:00.000Z',
      code: 'task2',
      x: 500,
      y: 230,
      accent: 'cyan',
      note: 'Running…',
    },
    {
      id: 'task-profile-tagging',
      workspaceId,
      name: '线索聚合与报告',
      summary: '汇总所有提取线索，格式化输出为结构化数据集，并生成初步分析摘要。',
      status: 'queued',
      statusLabel: '待机中',
      progress: 0,
      lastRunAt: '2026-04-20T11:50:00.000Z',
      nextRunAt: '2026-04-20T12:45:00.000Z',
      code: 'task3',
      x: 920,
      y: 90,
      accent: 'blue',
      note: '等待上游数据',
    },
    {
      id: 'task-data-cleanup',
      workspaceId,
      name: '数据清洗与过滤',
      summary: '过滤无效线索，清洗脏数据并进行基础标签化处理。',
      status: 'completed',
      statusLabel: '待机中',
      progress: 100,
      lastRunAt: '2026-04-20T10:00:00.000Z',
      nextRunAt: '2026-04-20T14:00:00.000Z',
      code: 'task4',
      x: 80,
      y: 520,
      accent: 'blue',
      note: '等待下一轮执行',
    },
    {
      id: 'task-lead-alert',
      workspaceId,
      name: '意向客户预警',
      summary: '实时监控高优意向客户线索，触发预警并推送到指定企业通讯通道。',
      status: 'attention',
      statusLabel: '人工确认',
      progress: 52,
      lastRunAt: '2026-04-20T11:30:00.000Z',
      nextRunAt: '2026-04-20T12:30:00.000Z',
      code: 'task5',
      x: 500,
      y: 520,
      accent: 'lime',
      note: '收到人工暂停指令',
    },
  ]
}

function createCompletedTasks(workspaceId = 'workspace-nova-launch') {
  return createRunningTasks(workspaceId).map((task) => ({
    ...task,
    status: task.status === 'attention' ? 'completed' : task.status,
    statusLabel: '已完成',
    progress: 100,
    note: '等待下一次批次',
  }))
}

function createLogs(
  workspaceId: string,
  variant: 'baseline' | 'running' | 'failure',
): ExecutionLogEntry[] {
  if (variant === 'failure') {
    return [
      {
        id: 'log-1',
        workspaceId,
        level: 'system',
        sourceLabel: 'INFO',
        message: 'Navigated to search URL.',
        createdAt: '2026-04-20T10:42:01.000Z',
      },
      {
        id: 'log-2',
        workspaceId,
        level: 'system',
        sourceLabel: 'INFO',
        message: 'Entered search query.',
        createdAt: '2026-04-20T10:42:03.000Z',
      },
      {
        id: 'log-3',
        workspaceId,
        level: 'warning',
        sourceLabel: 'WARN',
        message: 'DOM structure altered, retrying selector.',
        createdAt: '2026-04-20T10:42:04.000Z',
      },
      {
        id: 'log-4',
        workspaceId,
        level: 'warning',
        sourceLabel: 'ERROR',
        message: 'CAPTCHA detected on element #verify-modal.',
        createdAt: '2026-04-20T10:42:06.000Z',
      },
      {
        id: 'log-5',
        workspaceId,
        level: 'warning',
        sourceLabel: 'CRITICAL',
        message: 'Suspending task execution. Requesting user intervention.',
        createdAt: '2026-04-20T10:42:06.500Z',
      },
    ]
  }

  if (variant === 'running') {
    return [
      {
        id: 'log-1',
        workspaceId,
        level: 'system',
        sourceLabel: '系统',
        message: '正在初始化任务...',
        createdAt: '2026-04-20T12:10:05.000Z',
      },
      {
        id: 'log-2',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 01',
        message: '开始执行全站关键词检索...',
        createdAt: '2026-04-20T12:10:08.000Z',
      },
      {
        id: 'log-3',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 01',
        message: '任务完成，提取50条视频链接。',
        createdAt: '2026-04-20T12:15:22.000Z',
      },
      {
        id: 'log-4',
        workspaceId,
        level: 'system',
        sourceLabel: '系统',
        message: '触发下游节点：评论区线索提取',
        createdAt: '2026-04-20T12:15:25.000Z',
      },
      {
        id: 'log-5',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 02',
        message: '加载情感分析模型...',
        createdAt: '2026-04-20T12:15:30.000Z',
      },
      {
        id: 'log-6',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 02',
        message: '正在处理第 1/50 个视频评论区...',
        createdAt: '2026-04-20T12:16:01.000Z',
      },
      {
        id: 'log-7',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 02',
        message: '发现高优意向线索，已记录。',
        createdAt: '2026-04-20T12:16:45.000Z',
      },
      {
        id: 'log-8',
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent 02',
        message: '正在处理第 2/50 个视频评论区...',
        createdAt: '2026-04-20T12:17:12.000Z',
      },
    ]
  }

  return [
    {
      id: 'log-1',
      workspaceId,
      level: 'system',
      sourceLabel: '系统',
      message: '正在初始化任务…',
      createdAt: '2026-04-20T12:10:05.000Z',
    },
    {
      id: 'log-2',
      workspaceId,
      level: 'agent',
      sourceLabel: 'Agent 01',
      message: '开始执行全站关键词检索…',
      createdAt: '2026-04-20T12:10:08.000Z',
    },
    {
      id: 'log-3',
      workspaceId,
      level: 'system',
      sourceLabel: '系统',
      message: '当前执行批次已完成，工作区已回到待命状态。',
      createdAt: '2026-04-20T12:18:22.000Z',
    },
  ]
}

function createInterventions(workspaceId = 'workspace-nova-launch'): InterventionRecord[] {
  return [
    {
      id: 'intervention-1',
      workspaceId,
      taskId: 'task-comment-extract',
      command: '已收到高优线索，是否立即推送？',
      response: '等待用户进一步确认。',
      actor: 'Agent 02 (NLU)',
      createdAt: '2026-04-20T12:25:00.000Z',
      severity: 'info',
    },
    {
      id: 'intervention-2',
      workspaceId,
      taskId: 'task-comment-extract',
      command: '暂缓推送，等待汇总报告。',
      response: '已暂停自动推送，并将当前高优线索写入人工复核队列。',
      actor: 'User',
      createdAt: '2026-04-20T12:20:00.000Z',
      severity: 'info',
    },
    {
      id: 'intervention-3',
      workspaceId,
      taskId: 'task-lead-alert',
      command: '暂缓推送，等待汇总报告。',
      response: '已暂停自动推送，并将当前高优线索写入人工复核队列。',
      actor: 'User',
      createdAt: '2026-04-20T12:26:00.000Z',
      severity: 'warning',
    },
  ]
}

function createScenarioDatabase(id: MockScenarioId): MockDatabase {
  if (id === 'setup') {
    return {
      assets: createBaseAssets().slice(0, 2),
      strategies: createBaseStrategies().slice(0, 2),
      accounts: [],
      agentNodes: [createMissingAgent()],
      workspaces: [],
      taskRuns: [],
      executionLogs: [],
      interventionRecords: [],
    }
  }

  if (id === 'editing') {
    const workspaces = createBaseWorkspaces({
      'workspace-nova-launch': {
        status: 'draft',
        statusLabel: '待启动',
      },
    }).slice(0, 1)

    workspaces[0].name = '增长编排工作区'
    workspaces[0].summary = '绑定一套资产、策略与执行账号，创建后直接进入执行视图。'
    workspaces[0].taskIds = []

    return {
      assets: createBaseAssets(),
      strategies: createBaseStrategies(),
      accounts: createBaseAccounts({
        'account-red-risk': 'connected',
        'account-dy-shadow': 'connected',
      }),
      agentNodes: createActiveAgents('awaiting'),
      workspaces,
      taskRuns: [],
      executionLogs: [],
      interventionRecords: [],
    }
  }

  if (id === 'running') {
    return {
      assets: createBaseAssets(),
      strategies: createBaseStrategies(),
      accounts: createBaseAccounts({
        'account-red-risk': 'connected',
      }),
      agentNodes: createActiveAgents('connected'),
      workspaces: createBaseWorkspaces(),
      taskRuns: createRunningTasks(),
      executionLogs: createLogs('workspace-nova-launch', 'running'),
      interventionRecords: createInterventions(),
    }
  }

  if (id === 'failure') {
    return {
      assets: createBaseAssets(),
      strategies: createBaseStrategies(),
      accounts: createBaseAccounts(),
      agentNodes: createActiveAgents('offline').map((node) =>
        node.type === 'openclaw'
          ? {
              ...node,
              status: 'idle',
              capabilityStatus: 'pending',
              notes: '节点在线但认证链路异常，需要重新校验连接。',
            }
          : node,
      ),
      workspaces: createBaseWorkspaces({
        'workspace-nova-launch': {
          status: 'attention',
          statusLabel: '等待干预',
        },
      }),
      taskRuns: createRunningTasks().map((task) =>
        task.id === 'task-comment-extract'
          ? {
              ...task,
              status: 'attention',
              statusLabel: 'Paused for Intervention',
              progress: 52,
              note: '验证码触发，等待人工干预',
            }
          : task,
      ),
      executionLogs: createLogs('workspace-nova-launch', 'failure'),
      interventionRecords: createInterventions(),
    }
  }

  return {
    assets: createBaseAssets(),
    strategies: createBaseStrategies(),
    accounts: createBaseAccounts(),
    agentNodes: createActiveAgents('awaiting'),
    workspaces: createBaseWorkspaces({
      'workspace-nova-launch': {
        status: 'ready',
        statusLabel: '待命',
      },
    }),
    taskRuns: createCompletedTasks(),
    executionLogs: createLogs('workspace-nova-launch', 'baseline'),
    interventionRecords: createInterventions(),
  }
}

function normalizeScenario(value: string): MockScenarioId {
  const found = scenarioOptions.find((option) => option.id === value)
  return found ? found.id : 'baseline'
}

export const mockScenarioId = ref<MockScenarioId>(normalizeScenario('baseline'))

let database = createScenarioDatabase(mockScenarioId.value)
let consoleSetupState: ConsoleSetupState = 'not_configured'
let sessionOpenClawNode: AgentNodeRecord | null = null

function getLiveAgentNodes() {
  if (consoleSetupState !== 'not_configured') {
    const nodes = createActiveAgents(sessionOpenClawNode?.config?.diagnosticsStatus ?? 'connected')

    if (sessionOpenClawNode) {
      nodes[0] = clone(sessionOpenClawNode)
    }

    return nodes
  }

  return createConsoleCandidateAgents()
}

export function getMockScenarioOptions() {
  return scenarioOptions
}

export function setMockScenario(next: MockScenarioId) {
  mockScenarioId.value = next
  database = createScenarioDatabase(next)
}

export function resetMockRuntime() {
  database = createScenarioDatabase(mockScenarioId.value)
  consoleSetupState = 'not_configured'
  sessionOpenClawNode = null
}

export function snapshotMockDatabase() {
  return clone(database)
}

export function getConsoleOverviewData(): ConsoleOverviewRecord {
  const nodes = getLiveAgentNodes()

  if (consoleSetupState !== 'not_configured') {
    return clone({
      state: consoleSetupState,
      statusLabel: '在线',
      statusTone: 'secondary',
      actionLabel: '查看配置',
      description: '所有核心节点运行正常。准备执行调度。',
      networkLatencyLabel: '网络延迟: 12ms',
      connectionStatus: 'connected',
      capabilityStatus: consoleSetupState === 'prepare_failed' ? 'prepare_failed' : 'ready',
      hasCurrentService: true,
      isUsable: true,
      currentService: {
        agentServiceId: nodes[0]?.id ?? 'agent-openclaw-01',
        providerCode: 'openclaw',
        endpointUrl: nodes[0]?.endpoint ?? 'http://localhost:5111',
        authenticationKind: 'token',
        hasCredential: true,
        connectionStatus: 'connected',
        connectionStatusReason: null,
        capabilityStatus: consoleSetupState === 'prepare_failed' ? 'prepare_failed' : 'ready',
        capabilityStatusReason: null,
        isActive: true,
        isUsable: true,
        lastVerifiedAt: nowIso(),
        lastConnectedAt: nowIso(),
        capabilityPreparedAt: consoleSetupState === 'prepare_failed' ? null : nowIso(),
        createdAt: nowIso(),
        updatedAt: nowIso(),
      },
      warning: null,
      nodes,
    })
  }

  return clone({
    state: 'not_configured',
    statusLabel: '未配置',
    statusTone: 'error',
    actionLabel: '配置 OpenClaw',
    description: '神经架构目前处于待机状态。请配置并初始化一个代理节点以开始编排任务和处理数据流。',
    connectionStatus: 'not_configured',
    capabilityStatus: 'not_ready',
    hasCurrentService: false,
    isUsable: false,
    currentService: null,
    warning: null,
    nodes,
  })
}

export function listAssetsData() {
  return clone(database.assets)
}

export function getAssetData(id: string) {
  return clone(database.assets.find((asset) => asset.id === id) ?? null)
}

export function saveAssetData(input: SaveAssetInput) {
  const existing = input.id ? database.assets.find((item) => item.id === input.id) : null
  const record: AssetRecord = {
    id: input.id ?? createId('asset'),
    name: input.name,
    platform: input.platform,
    summary: input.summary,
    markdown: input.markdown,
    status: input.status,
    updatedAt: nowIso(),
    createdAt: existing?.createdAt ?? nowIso(),
    category: input.category ?? existing?.category ?? '本地草稿',
    tags: input.tags ?? existing?.tags ?? ['草稿'],
    targetLabels: input.targetLabels ?? existing?.targetLabels ?? ['新增目标'],
    attachments: existing?.attachments ?? [],
  }

  const index = database.assets.findIndex((item) => item.id === record.id)
  if (index >= 0) {
    database.assets[index] = record
  } else {
    database.assets.unshift(record)
  }

  return clone(record)
}

function mapStrategyDetailToSummary(strategy: StrategyDetailDto): StrategySummaryDto {
  return {
    strategyId: strategy.strategyId,
    name: strategy.name,
    summary: strategy.summary,
    tags: strategy.tags,
    updatedAt: strategy.updatedAt,
  }
}

export function listStrategiesData(): ListStrategiesResultDto {
  return clone({
    items: database.strategies.map(mapStrategyDetailToSummary),
  })
}

export function getStrategyData(id: string): StrategyDetailDto | null {
  return clone(database.strategies.find((strategy) => strategy.strategyId === id) ?? null)
}

export function saveStrategyData(input: SaveStrategyInput): StrategyDetailDto {
  const existing = input.id ? database.strategies.find((item) => item.strategyId === input.id) : null
  const timestamp = nowIso()
  const record: StrategyDetailDto = {
    strategyId: input.id ?? createId('strategy'),
    name: input.name,
    summary: input.summary?.trim() || existing?.summary || '暂无摘要',
    contentMarkdown: input.contentMarkdown,
    placeholders: parseStrategyPlaceholdersFromMarkdown(input.contentMarkdown),
    createdAt: existing?.createdAt ?? timestamp,
    updatedAt: timestamp,
    tags: input.tags ?? existing?.tags ?? ['草稿'],
  }

  const index = database.strategies.findIndex((item) => item.strategyId === record.strategyId)
  if (index >= 0) {
    database.strategies[index] = record
  } else {
    database.strategies.unshift(record)
  }

  return clone(record)
}

export function listAccountsData() {
  return clone(database.accounts)
}

export function getAccountData(id: string) {
  return clone(database.accounts.find((account) => account.id === id) ?? null)
}

function resolveAccountStatusLabel(status: AccountStatus) {
  if (status === 'connected') return '健康'
  if (status === 'needs-auth') return '待授权'
  return '风控'
}

export function updateAccountStatusData(id: string, status: AccountStatus) {
  const account = database.accounts.find((item) => item.id === id)

  if (!account) {
    return null
  }

  account.status = status
  account.statusLabel = resolveAccountStatusLabel(status)
  account.lastSyncedAt = nowIso()
  account.lastActiveLabel = '刚刚'
  return clone(account)
}

export function listAgentNodesData() {
  return clone(getLiveAgentNodes())
}

export function saveOpenClawConfigData(input: OpenClawSetupFormInput) {
  const existing = sessionOpenClawNode ?? getLiveAgentNodes().find((item) => item.type === 'openclaw')
  const config: AgentNodeConfigRecord = {
    installPath: existing?.config?.installPath ?? '/opt/cybernomads/openclaw',
    gatewayUrl: input.endpointUrl,
    authToken: input.secret,
    parallelLimit: existing?.config?.parallelLimit ?? 8,
    diagnosticsStatus: 'connected',
    diagnosticsLogs: [
      '[SYS] 正在初始化握手序列…',
      '[SYS] Establishing secure socket… O.K.',
      '[AUTH] Token validated successfully.',
      '[DATA] Profile sync complete.',
      '[SYS] Heartbeat ping… OK (24ms)',
    ],
  }

  const record: AgentNodeRecord = {
    id: existing?.id ?? 'agent-openclaw-01',
    name: 'OpenClaw Service',
    type: 'openclaw',
    endpoint: input.endpointUrl,
    status: 'active',
    capabilityStatus: 'ready',
    notes: 'OpenClaw current Agent service is configured.',
    roleLabel: 'MASTER',
    versionLabel: 'v2.4.0 Online',
    badgeLabel: 'MASTER',
    latencyMs: 12,
    avatarUrl: referenceTopbarAvatarUrl,
    config,
  }

  consoleSetupState = 'ready'
  sessionOpenClawNode = clone(record)

  const index = database.agentNodes.findIndex((item) => item.type === 'openclaw')
  if (index >= 0) {
    database.agentNodes[index] = record
  } else {
    database.agentNodes.unshift(record)
  }

  return clone(record)
}

export function listWorkspacesData() {
  return clone(database.workspaces)
}

export function getWorkspaceData(id: string) {
  return clone(database.workspaces.find((workspace) => workspace.id === id) ?? null)
}

export function getWorkspaceExecutionData(workspaceId: string) {
  const workspace = database.workspaces.find((item) => item.id === workspaceId)

  if (!workspace) {
    return null
  }

  return clone({
    workspace,
    tasks: database.taskRuns.filter((task) => task.workspaceId === workspaceId),
    logs: database.executionLogs
      .filter((entry) => entry.workspaceId === workspaceId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  })
}

export function createWorkspaceData(input: CreateWorkspaceInput) {
  const workspaceId = createId('workspace')
  const tasks: TaskRunRecord[] = createRunningTasks(workspaceId).map((task, index) => ({
    ...task,
    id: createId(`task-${index + 1}`),
    workspaceId,
    progress: index === 1 ? 22 : task.progress,
  }))

  const asset = database.assets.find((item) => item.id === input.assetId)
  const strategy = database.strategies.find((item) => item.strategyId === input.strategyId)

  const workspace: WorkspaceRecord = {
    id: workspaceId,
    name: input.name,
    summary: input.summary,
    status: 'running',
    statusLabel: '运行中',
    assetId: input.assetId,
    strategyId: input.strategyId,
    accountIds: input.objectBindings.map((binding) => binding.resourceId),
    taskIds: tasks.map((task) => task.id),
    lastRunAt: nowIso(),
    nextRunAt: nowIso(),
    assignedAgentLabels: ['N', 'A', 'V'],
    themeColor: 'cyan',
    highlightBanner: `${asset?.name ?? '新资产'} · ${strategy?.name ?? '新策略'}`,
    objectBindingCount: input.objectBindings.length,
    objectBindings: input.objectBindings,
  }

  database.workspaces.unshift(workspace)
  database.taskRuns.unshift(...tasks)
  database.executionLogs.unshift({
    id: createId('log'),
    workspaceId,
    level: 'system',
    sourceLabel: '系统',
    message: `工作区 ${input.name} 已创建，并已进入执行视图。`,
    createdAt: nowIso(),
  })

  return clone(workspace)
}

export function tickWorkspaceExecutionData(workspaceId: string) {
  const workspace = database.workspaces.find((item) => item.id === workspaceId)

  if (!workspace) {
    return null
  }

  const tasks = database.taskRuns.filter((task) => task.workspaceId === workspaceId)
  const activeTask = tasks.find((task) => task.status === 'running')

  if (activeTask) {
    activeTask.progress = Math.min(activeTask.progress + 16, 100)
    activeTask.lastRunAt = nowIso()

    if (activeTask.progress >= 100) {
      activeTask.status = 'completed'
      activeTask.statusLabel = '已完成'
      activeTask.note = '系统正在准备下一步任务'
      database.executionLogs.unshift({
        id: createId('log'),
        workspaceId,
        level: 'agent',
        sourceLabel: 'Agent',
        message: `${activeTask.name} 已完成，系统正在准备下一步任务。`,
        createdAt: nowIso(),
      })
    }
  }

  const nextTask = tasks.find((task) => task.status === 'queued')
  if ((!activeTask || activeTask.progress >= 100) && nextTask) {
    nextTask.status = 'running'
    nextTask.statusLabel = '执行中'
    nextTask.progress = nextTask.progress > 0 ? nextTask.progress : 12
    nextTask.lastRunAt = nowIso()
    nextTask.note = '已从待机切换为执行中'
    database.executionLogs.unshift({
      id: createId('log'),
      workspaceId,
      level: 'system',
      sourceLabel: '系统',
      message: `${nextTask.name} 已进入运行中状态。`,
      createdAt: nowIso(),
    })
  }

  const stillRunning = tasks.some((task) => task.status === 'running' || task.status === 'queued')
  workspace.status = stillRunning ? 'running' : 'ready'
  workspace.statusLabel = stillRunning ? '运行中' : '待命'
  workspace.lastRunAt = nowIso()

  if (!stillRunning) {
    database.executionLogs.unshift({
      id: createId('log'),
      workspaceId,
      level: 'system',
      sourceLabel: '系统',
      message: '当前执行批次已经完成，工作区回到待命状态。',
      createdAt: nowIso(),
    })
  }

  return getWorkspaceExecutionData(workspaceId)
}

export function getInterventionContextData(workspaceId: string, taskId: string) {
  const workspace = database.workspaces.find((item) => item.id === workspaceId)
  const task = database.taskRuns.find((item) => item.id === taskId && item.workspaceId === workspaceId)

  if (!workspace || !task) {
    return null
  }

  return clone({
    workspace,
    task,
    records: database.interventionRecords
      .filter((record) => record.workspaceId === workspaceId && record.taskId === taskId)
      .sort((left, right) => right.createdAt.localeCompare(left.createdAt)),
  })
}

export function sendInterventionCommandData(workspaceId: string, taskId: string, command: string) {
  const record: InterventionRecord = {
    id: createId('intervention'),
    workspaceId,
    taskId,
    command,
    response: `已接收指令：「${command}」。后续执行会按新的优先级处理。`,
    actor: 'User',
    createdAt: nowIso(),
    severity: 'info',
  }

  database.interventionRecords.unshift(record)
  database.executionLogs.unshift({
    id: createId('log'),
    workspaceId,
    level: 'agent',
    sourceLabel: 'Intervention',
    message: `收到任务干预指令：${command}`,
    createdAt: nowIso(),
  })

  const task = database.taskRuns.find((item) => item.id === taskId)
  if (task && task.status !== 'completed') {
    task.status = 'running'
    task.statusLabel = '执行中'
    task.progress = Math.max(task.progress, 18)
    task.note = '人工干预已生效'
  }

  return clone(record)
}
