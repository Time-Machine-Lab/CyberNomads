export type DemoTrafficWorkLifecycleStatus = 'ready' | 'running' | 'ended' | 'archived' | 'deleted'

export type DemoTrafficWorkContextPreparationStatus = 'pending' | 'prepared' | 'failed'

export type DemoDecompositionStage =
  | 'created'
  | 'waiting'
  | 'draft'
  | 'confirmation'

export interface DemoProgress {
  percent: number
  label: string
  description: string
  updatedAt: string
}

export interface DemoTaskInputSource {
  type: string
  label: string
  acquisition: string
  missingBehavior: string
}

export interface DemoDraftTask {
  taskKey: string
  name: string
  goal: string
  expectedOutputs: string[]
  inputSources: DemoTaskInputSource[]
  dependsOn: string[]
  resourceNeeds: string[]
  strategyCoverage: string[]
  skillRefs: string[]
  reviewNotes: string[]
  x: number
  y: number
}

export interface DemoReviewIssue {
  category: string
  severity: 'info' | 'warning' | 'error'
  message: string
  taskKey?: string
  suggestion: string
}

export interface DemoDecompositionSnapshot {
  stage: DemoDecompositionStage
  stageLabel: string
  primaryAction: string
  trafficWork: {
    id: string
    name: string
    lifecycleStatus: DemoTrafficWorkLifecycleStatus
    lifecycleLabel: string
    contextPreparationStatus: DemoTrafficWorkContextPreparationStatus
    contextPreparationLabel: string
    productName: string
    strategyName: string
    accountLabel: string
  }
  run: {
    id: string
    status: string
    stage: string
    reviewConclusion: 'none' | 'pass' | 'fix_required' | 'failed'
    progress: DemoProgress
  }
  tasks: DemoDraftTask[]
  reviewIssues: DemoReviewIssue[]
  report: {
    summary: string
    strategyCoverage: string[]
    repairHistory: string[]
  }
}

const demoTasks: DemoDraftTask[] = [
  {
    taskKey: 'audience-signal-map',
    name: '目标人群信号整理',
    goal: '从产品和策略中整理出可用于 B 站搜索、评论筛选和私信判断的人群信号。',
    expectedOutputs: ['关键词组', '用户意图标签', '排除条件'],
    inputSources: [
      {
        type: 'product_content',
        label: '产品定位与卖点',
        acquisition: '读取当前工作区绑定产品快照',
        missingBehavior: 'blocking',
      },
      {
        type: 'strategy_content',
        label: '引流策略正文',
        acquisition: '读取当前工作区绑定策略快照',
        missingBehavior: 'blocking',
      },
    ],
    dependsOn: [],
    resourceNeeds: ['产品介绍文档', '策略对象绑定', 'B 站搜索 Skill'],
    strategyCoverage: ['定位目标用户', '识别高意向互动场景'],
    skillRefs: ['bilibili-web-api', 'cybernomads-task-execution'],
    reviewNotes: ['产出清晰，可以被后续搜索任务消费。'],
    x: 60,
    y: 170,
  },
  {
    taskKey: 'content-discovery',
    name: '相关内容发现',
    goal: '基于人群信号搜索近期相关视频和评论区，找到可参与互动的内容池。',
    expectedOutputs: ['候选视频列表', '评论区入口', '内容相关度说明'],
    inputSources: [
      {
        type: 'upstream_task',
        label: '目标人群信号整理结果',
        acquisition: '消费 audience-signal-map 任务产出',
        missingBehavior: 'blocking',
      },
      {
        type: 'platform_data',
        label: 'B 站公开搜索结果',
        acquisition: '通过 B 站 Web API Skill 查询',
        missingBehavior: 'degraded',
      },
    ],
    dependsOn: ['audience-signal-map'],
    resourceNeeds: ['B 站账号访问态', '搜索接口', '候选内容记录模板'],
    strategyCoverage: ['找到高意向内容场景', '降低无关互动成本'],
    skillRefs: ['bilibili-web-api'],
    reviewNotes: ['输入来源明确，外部平台数据缺失时可以降级。'],
    x: 410,
    y: 70,
  },
  {
    taskKey: 'comment-engagement',
    name: '评论互动执行',
    goal: '在候选内容中选择高相关评论区，生成并执行低打扰互动。',
    expectedOutputs: ['评论记录', '互动对象列表', '执行异常摘要'],
    inputSources: [
      {
        type: 'upstream_task',
        label: '候选视频和评论区入口',
        acquisition: '消费 content-discovery 任务产出',
        missingBehavior: 'blocking',
      },
      {
        type: 'user_material',
        label: '品牌语气要求',
        acquisition: '读取产品材料中的表达边界',
        missingBehavior: 'ask_user',
      },
    ],
    dependsOn: ['content-discovery'],
    resourceNeeds: ['账号绑定', '评论发布工具', '风险表达规则'],
    strategyCoverage: ['执行轻量触达', '保留可追踪互动记录'],
    skillRefs: ['bilibili-web-api', 'cybernomads-task-execution'],
    reviewNotes: ['Review 曾要求补充缺失材料行为，Repair 后已改为 ask_user。'],
    x: 760,
    y: 170,
  },
  {
    taskKey: 'lead-follow-up',
    name: '高意向线索跟进',
    goal: '根据互动反馈筛选高意向用户，准备后续私信或人工接管建议。',
    expectedOutputs: ['高意向用户清单', '跟进建议', '下一轮策略反馈'],
    inputSources: [
      {
        type: 'upstream_task',
        label: '互动对象与评论反馈',
        acquisition: '消费 comment-engagement 任务产出',
        missingBehavior: 'skip',
      },
      {
        type: 'runtime_tool',
        label: '任务执行输出记录',
        acquisition: '读取任务输出摘要',
        missingBehavior: 'degraded',
      },
    ],
    dependsOn: ['comment-engagement'],
    resourceNeeds: ['输出记录读取工具', '线索分级规则'],
    strategyCoverage: ['沉淀潜在线索', '反馈下一轮增长策略'],
    skillRefs: ['cybernomads-task-execution'],
    reviewNotes: ['该任务不会阻塞主流程，适合作为后续跟进任务。'],
    x: 1110,
    y: 70,
  },
]

export const taskDecompositionDemoSnapshots: DemoDecompositionSnapshot[] = [
  {
    stage: 'created',
    stageLabel: '创建完成',
    primaryAction: '开始拆分',
    trafficWork: {
      id: 'tw-demo-launch-001',
      name: '新品冷启动 B 站引流',
      lifecycleStatus: 'ready',
      lifecycleLabel: '已就绪',
      contextPreparationStatus: 'pending',
      contextPreparationLabel: '准备中',
      productName: 'Cybernomads 产品顾问',
      strategyName: '低预算内容评论引流策略',
      accountLabel: 'B 站主账号 / 内容运营号',
    },
    run: {
      id: 'dr-demo-001',
      status: 'running',
      stage: 'context_ready',
      reviewConclusion: 'none',
      progress: {
        percent: 12,
        label: '工作区已创建',
        description: '引流工作状态保持 ready，任务拆分中心开始读取产品、策略和对象绑定。',
        updatedAt: '18:30:02',
      },
    },
    tasks: [],
    reviewIssues: [],
    report: {
      summary: '还没有生成任务草案。',
      strategyCoverage: [],
      repairHistory: [],
    },
  },
  {
    stage: 'waiting',
    stageLabel: '等待拆分',
    primaryAction: '查看草案',
    trafficWork: {
      id: 'tw-demo-launch-001',
      name: '新品冷启动 B 站引流',
      lifecycleStatus: 'ready',
      lifecycleLabel: '已就绪',
      contextPreparationStatus: 'pending',
      contextPreparationLabel: '准备中',
      productName: 'Cybernomads 产品顾问',
      strategyName: '低预算内容评论引流策略',
      accountLabel: 'B 站主账号 / 内容运营号',
    },
    run: {
      id: 'dr-demo-001',
      status: 'running',
      stage: 'reviewing',
      reviewConclusion: 'fix_required',
      progress: {
        percent: 58,
        label: 'Agent Review 中',
        description: 'Review Agent 正在检查任务粒度、输入来源、依赖关系、资源准备和可运行性。',
        updatedAt: '18:30:18',
      },
    },
    tasks: demoTasks.slice(0, 2),
    reviewIssues: [
      {
        category: '输入来源',
        severity: 'warning',
        taskKey: 'comment-engagement',
        message: '评论互动任务需要声明品牌语气材料缺失时的行为。',
        suggestion: '将缺失行为改为 ask_user，避免在材料不足时直接执行。',
      },
      {
        category: '资源准备',
        severity: 'warning',
        taskKey: 'content-discovery',
        message: '相关内容发现任务需要明确使用哪个平台数据来源。',
        suggestion: '声明 B 站 Web API Skill，并标记平台数据缺失时可降级。',
      },
    ],
    report: {
      summary: '任务草案已经生成，Review 正在要求补充输入来源和资源准备说明。',
      strategyCoverage: ['定位目标用户', '找到高意向内容场景'],
      repairHistory: [],
    },
  },
  {
    stage: 'draft',
    stageLabel: '草案可确认',
    primaryAction: '确认方案',
    trafficWork: {
      id: 'tw-demo-launch-001',
      name: '新品冷启动 B 站引流',
      lifecycleStatus: 'ready',
      lifecycleLabel: '已就绪',
      contextPreparationStatus: 'pending',
      contextPreparationLabel: '准备中',
      productName: 'Cybernomads 产品顾问',
      strategyName: '低预算内容评论引流策略',
      accountLabel: 'B 站主账号 / 内容运营号',
    },
    run: {
      id: 'dr-demo-001',
      status: 'waiting_user_confirmation',
      stage: 'waiting_user_confirmation',
      reviewConclusion: 'pass',
      progress: {
        percent: 90,
        label: '等待用户确认',
        description: '任务草案已通过 Review。正式任务尚未落库，用户可以确认或反馈后重拆。',
        updatedAt: '18:31:04',
      },
    },
    tasks: demoTasks,
    reviewIssues: [
      {
        category: '质量门禁',
        severity: 'info',
        message: 'Review 已通过，所有任务都有明确目标、输入来源、预期产出和依赖声明。',
        suggestion: '确认后由系统编排正式写入任务集。',
      },
    ],
    report: {
      summary: '本次拆分形成 4 个任务，覆盖从用户信号整理到线索跟进的完整引流闭环。',
      strategyCoverage: ['定位目标用户', '找到高意向内容场景', '执行轻量触达', '沉淀潜在线索'],
      repairHistory: ['第 1 轮修正补充了外部平台数据的降级行为。', '第 2 轮修正补充了品牌语气材料缺失时的 ask_user 行为。'],
    },
  },
  {
    stage: 'confirmation',
    stageLabel: '已确认落库',
    primaryAction: '进入执行台',
    trafficWork: {
      id: 'tw-demo-launch-001',
      name: '新品冷启动 B 站引流',
      lifecycleStatus: 'ready',
      lifecycleLabel: '已就绪',
      contextPreparationStatus: 'prepared',
      contextPreparationLabel: '已准备',
      productName: 'Cybernomads 产品顾问',
      strategyName: '低预算内容评论引流策略',
      accountLabel: 'B 站主账号 / 内容运营号',
    },
    run: {
      id: 'dr-demo-001',
      status: 'committed',
      stage: 'prepared',
      reviewConclusion: 'pass',
      progress: {
        percent: 100,
        label: '任务已提交',
        description: '用户确认后，后端系统已将草案提交为正式任务集。OpenClaw 接下来只执行单个已确认任务。',
        updatedAt: '18:31:22',
      },
    },
    tasks: demoTasks,
    reviewIssues: [
      {
        category: '系统提交',
        severity: 'info',
        message: '正式任务集已由系统编排写入，Agent 没有直接落库。',
        suggestion: '现在可以进入执行台启动工作。',
      },
    ],
    report: {
      summary: '任务方案已确认，工作区上下文准备状态变为 prepared。',
      strategyCoverage: ['定位目标用户', '找到高意向内容场景', '执行轻量触达', '沉淀潜在线索'],
      repairHistory: ['确认快照已保存。', '任务文档和资源清单已归档。'],
    },
  },
]
