const apiBaseUrl = process.env.CYBERNOMADS_API_BASE_URL?.trim() || 'http://127.0.0.1:3000/api'

const products = [
  {
    name: 'AI 剪辑实战营',
    contentMarkdown: `# AI 剪辑实战营

## 产品定位
- 面向想做 B 站内容、短视频混剪、AI 自动化创作的入门与进阶用户
- 解决脚本不会写、素材不会找、剪辑效率低、账号起号慢的问题

## 核心卖点
- 7 天上手 AI 选题、脚本、配音、剪辑全流程
- 提供可直接套用的 B 站视频模板与提示词模板
- 配套社群答疑与作业点评

## 交付内容
- 录播课程 24 节
- 直播答疑 4 次
- 剪辑工程模板 12 套
- B 站选题库与脚本提示词包

## 适合人群
- 新手 UP 主
- 自媒体运营
- 想做副业接单的剪辑师
`,
  },
  {
    name: 'B 站爆款选题库会员',
    contentMarkdown: `# B 站爆款选题库会员

## 产品定位
- 面向想稳定输出 B 站内容的个人创作者与内容团队

## 核心卖点
- 每周更新热点拆解与选题建议
- 按分区提供标题、封面、评论区互动脚本
- 附带数据复盘模板

## 交付内容
- 每周选题周报
- 热门视频拆解文档
- 标题封面模板
- 评论区钩子模板
`,
  },
  {
    name: '求职简历优化服务',
    contentMarkdown: `# 求职简历优化服务

## 产品定位
- 面向校招生、转行求职者、互联网岗位面试人群

## 核心卖点
- 1 对 1 简历重构
- 岗位 JD 拆解与关键词匹配
- 附赠项目经历表达模板

## 交付内容
- 简历诊断报告
- 优化后简历一版
- 面试自我介绍模板
- 重点岗位投递建议
`,
  },
  {
    name: '雅思口语冲刺班',
    contentMarkdown: `# 雅思口语冲刺班

## 产品定位
- 面向 2-6 周内需要提分的雅思考生

## 核心卖点
- 高频题库素材
- 分话题表达模板
- 陪练与纠音反馈

## 交付内容
- 高频口语题库
- 口语素材包
- 模考与点评
- 纠音打卡群
`,
  },
  {
    name: '减脂饮食陪跑营',
    contentMarkdown: `# 减脂饮食陪跑营

## 产品定位
- 面向想通过饮食管理和低门槛运动完成减脂的上班族

## 核心卖点
- 7 天可执行食谱
- 卡路里管理模板
- 陪跑监督与反馈

## 交付内容
- 饮食计划表
- 购物清单
- 打卡表
- 陪跑群答疑
`,
  },
  {
    name: '摄影调色入门课',
    contentMarkdown: `# 摄影调色入门课

## 产品定位
- 面向摄影爱好者、Vlogger 和刚开始接触 Lightroom 的新手

## 核心卖点
- 从拍摄思路到后期调色的完整入门链路
- 提供可直接导入的预设与案例素材

## 交付内容
- 录播课程
- 练习原片
- 调色预设
- 作业点评
`,
  },
]

const strategies = [
  {
    name: 'B站评论区关键词截流',
    summary: '在对标热视频评论区布局高相关钩子评论，引导精准用户进入私域或详情页。',
    tags: ['B站', '评论区', '截流'],
    contentMarkdown: `# B站评论区关键词截流

## 目标
- 围绕 {{产品:主推商品="AI 剪辑实战营"}} 获取精准意向用户
- 优先在 {{分区:目标分区="知识区"}} 与 {{分区:目标分区="知识区"}} 的热视频下承接流量

## 执行配置
- 主执行账号：{{账号:主账号="B站主号A"}}
- 备用账号：{{账号:备用账号="B站小号B"}}
- 评论钩子口令：{{评论口令:触发关键词="想要模板"}}
- 福利诱饵：{{福利:赠品名称="B站选题模板包"}}
- 核心卖点：{{卖点:核心卖点="7天学会 AI 自动化剪辑"}}
- 评论冷却：{{风控时间:冷却时长="8分钟"}}

## 操作步骤
1. 搜索目标关键词，筛选近 7 天高热视频
2. 优先选择评论区讨论度高、用户有明确问题的视频
3. 使用主账号发布专业评论，植入福利诱饵与行动口令
4. 若评论沉底，则由备用账号做一轮追问抬升互动
5. 对触发 {{评论口令:触发关键词="想要模板"}} 的用户统一引导到承接页

## 话术基线
- 不直接硬广，先回答问题，再补一句“我把 {{福利:赠品名称="B站选题模板包"}} 整理好了”
- 结尾统一使用 {{行动:收口动作="评论区扣 1 领取"}} 作为行动指令
`,
  },
  {
    name: 'B站教程视频资料包引流',
    summary: '用教程型视频内容承接搜索流量，通过资料包领取完成转化。',
    tags: ['B站', '教程', '资料包'],
    contentMarkdown: `# B站教程视频资料包引流

## 内容定位
- 核心视频主题：{{选题:核心选题="AI剪辑入门教程"}}
- 主推商品：{{产品:主推商品="AI 剪辑实战营"}}
- 视频福利：{{福利:赠品名称="新手剪辑资料包"}}

## 执行对象
- 发布账号：{{账号:主账号="B站教程号A"}}
- 出镜人设：{{人设:账号人设="效率型剪辑老师"}}
- 黄金发布时间：{{发布时间:黄金时段="20:30"}}

## 视频结构
1. 开头 10 秒抛出常见痛点
2. 中段演示 1 个可立刻复制的方法
3. 结尾通过 {{福利:赠品名称="新手剪辑资料包"}} 激发评论与私信

## 转化动作
- 结尾口播：{{行动:收口动作="评论区回复 资料，自动发领取方式"}}
- 置顶评论关键词：{{评论口令:触发关键词="资料"}}
- 私信承接文案中的核心利益点固定为 {{卖点:核心卖点="从选题到成片全流程可复制"}}
`,
  },
  {
    name: 'B站搜索流标题封面对标',
    summary: '基于搜索流和同类爆款内容做标题封面对标，提升点击率后再承接商品转化。',
    tags: ['B站', '搜索流', '标题封面'],
    contentMarkdown: `# B站搜索流标题封面对标

## 输入参数
- 主推商品：{{产品:主推商品="B 站爆款选题库会员"}}
- 对标视频链接：{{视频:对标视频链接="https://www.bilibili.com/video/BV1xx411c7mD"}}
- 核心关键词：{{关键词:搜索关键词="B站选题"}}
- 账号：{{账号:主账号="B站运营号A"}}

## 执行原则
- 标题围绕 {{关键词:搜索关键词="B站选题"}} 的检索意图展开
- 封面必须突出 {{卖点:核心卖点="直接拿来用的爆款题库"}}
- 前 3 秒口播明确“谁适合看”和“能拿走什么”

## 收口动作
- 置顶评论用 {{评论口令:触发关键词="题库"}} 引导领取试读
- 视频简介中自然植入 {{行动:收口动作="私信我领本周热点拆解"}}
- 发布后由 {{账号:辅助互动号="B站小号运营B"}} 在评论区补一轮用户视角反馈
`,
  },
  {
    name: 'B站求职案例拆解转化',
    summary: '通过真实简历案例拆解获取求职人群流量，再承接简历优化服务。',
    tags: ['B站', '求职', '案例拆解'],
    contentMarkdown: `# B站求职案例拆解转化

## 主推商品
- 商品名称：{{产品:主推商品="求职简历优化服务"}}
- 核心利益点：{{卖点:核心卖点="简历诊断+重写+投递建议"}}

## 目标用户
- 用户标签：{{人群:目标人群="校招生与转行求职者"}}
- 内容场景：{{场景:案例场景="简历被筛掉的真实原因"}}

## 账号配置
- 主账号：{{账号:主账号="B站求职号A"}}
- 评论辅助号：{{账号:辅助互动号="B站小号求职B"}}
- 发布时间：{{发布时间:黄金时段="19:30"}}

## 承接动作
- 视频结尾引导词：{{行动:收口动作="评论区留言 简历，送你一份诊断清单"}}
- 评论关键词：{{评论口令:触发关键词="简历"}}
- 福利名称：{{福利:赠品名称="简历诊断清单"}}
`,
  },
  {
    name: 'B站雅思口语高频题引流',
    summary: '用高频题和口语素材视频获取备考用户，再承接口语冲刺班。',
    tags: ['B站', '雅思', '教育'],
    contentMarkdown: `# B站雅思口语高频题引流

## 参数配置
- 主推商品：{{产品:主推商品="雅思口语冲刺班"}}
- 话题方向：{{选题:核心选题="雅思口语高频题"}}
- 福利名称：{{福利:赠品名称="口语高频素材包"}}
- 账号：{{账号:主账号="B站雅思老师A"}}
- 发布时间：{{发布时间:黄金时段="21:00"}}

## 内容打法
1. 用高频题开场制造相关性
2. 中段给出 1 组高分表达模板
3. 结尾强调 {{卖点:核心卖点="短期提分需要高频反馈与陪练"}}

## 互动承接
- 评论口令：{{评论口令:触发关键词="口语"}}
- 统一回复动作：{{行动:收口动作="留言 口语，发你素材包"}}
- 私信第一句固定提到 {{福利:赠品名称="口语高频素材包"}}
`,
  },
  {
    name: 'B站减脂打卡陪跑引流',
    summary: '围绕真实打卡内容建立信任，再把意向用户转到减脂饮食陪跑营。',
    tags: ['B站', '减脂', '陪跑'],
    contentMarkdown: `# B站减脂打卡陪跑引流

## 核心参数
- 主推商品：{{产品:主推商品="减脂饮食陪跑营"}}
- 主账号：{{账号:主账号="B站健康号A"}}
- 对外人设：{{人设:账号人设="真实减脂陪跑教练"}}
- 持续周期：{{周期:更新周期="14天"}}

## 内容结构
- 每日展示 1 个真实饮食与体重反馈
- 每 3 天复盘一次最常见失败原因
- 反复强化 {{卖点:核心卖点="低门槛执行，比节食更能坚持"}}

## 承接配置
- 评论关键词：{{评论口令:触发关键词="食谱"}}
- 福利诱饵：{{福利:赠品名称="7天减脂食谱"}}
- 收口动作：{{行动:收口动作="评论区回复 食谱 领取"}}
- 评论冷却：{{风控时间:冷却时长="10分钟"}}
`,
  },
  {
    name: 'B站摄影调色案例承接',
    summary: '通过前后对比案例视频和素材练习包，引导摄影调色课程转化。',
    tags: ['B站', '摄影', '调色'],
    contentMarkdown: `# B站摄影调色案例承接

## 基础配置
- 主推商品：{{产品:主推商品="摄影调色入门课"}}
- 主账号：{{账号:主账号="B站摄影号A"}}
- 案例主题：{{案例:案例主题="阴天照片调出电影感"}}
- 福利名称：{{福利:赠品名称="调色练习原片包"}}

## 视频脚本
1. 开场展示 before / after 对比
2. 中段拆解 3 个关键参数
3. 结尾强调 {{卖点:核心卖点="从不会调到能稳定复刻案例"}}

## 转化动作
- 评论关键词：{{评论口令:触发关键词="原片"}}
- 置顶评论收口：{{行动:收口动作="回复 原片，领取练习素材"}}
- 备用互动账号：{{账号:辅助互动号="B站摄影小号B"}}
`,
  },
]

async function request(path, init = {}) {
  const response = await fetch(`${apiBaseUrl}${path}`, {
    ...init,
    headers: {
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  })

  if (!response.ok) {
    const text = await response.text()
    throw new Error(`${init.method || 'GET'} ${path} failed: ${response.status} ${text}`)
  }

  if (response.status === 204) {
    return null
  }

  return response.json()
}

async function seedCollection({ listPath, createPath, items, label, getName }) {
  const existing = await request(listPath)
  const existingNames = new Set((existing.items || []).map(getName))
  let createdCount = 0
  let skippedCount = 0

  for (const item of items) {
    const name = getName(item)

    if (existingNames.has(name)) {
      skippedCount += 1
      console.log(`[skip] ${label}: ${name}`)
      continue
    }

    const created = await request(createPath, {
      method: 'POST',
      body: JSON.stringify(item),
    })
    createdCount += 1
    console.log(`[create] ${label}: ${name} -> ${created.productId || created.strategyId}`)
  }

  return { createdCount, skippedCount }
}

async function main() {
  console.log(`Seeding demo data to ${apiBaseUrl}`)

  const productResult = await seedCollection({
    listPath: '/products',
    createPath: '/products',
    items: products,
    label: 'product',
    getName: (item) => item.name,
  })

  const strategyResult = await seedCollection({
    listPath: '/strategies',
    createPath: '/strategies',
    items: strategies,
    label: 'strategy',
    getName: (item) => item.name,
  })

  console.log('')
  console.log(`Products created: ${productResult.createdCount}, skipped: ${productResult.skippedCount}`)
  console.log(`Strategies created: ${strategyResult.createdCount}, skipped: ${strategyResult.skippedCount}`)
}

main().catch((error) => {
  console.error(error)
  process.exitCode = 1
})
