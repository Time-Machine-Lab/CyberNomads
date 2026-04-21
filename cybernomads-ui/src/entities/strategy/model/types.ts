export type StrategyStatus = 'draft' | 'deployed'

export interface StrategyRecord {
  id: string
  name: string
  summary: string
  markdown: string
  moduleCount: number
  status: StrategyStatus
  updatedAt: string
  platform: string
  category: string
  tags: string[]
  successRate: number
  difficulty: '低' | '中' | '高' | '专家'
}

export interface SaveStrategyInput {
  id?: string
  name: string
  summary: string
  markdown: string
  moduleCount: number
  status: StrategyStatus
  platform?: string
  category?: string
  tags?: string[]
  successRate?: number
  difficulty?: StrategyRecord['difficulty']
}
