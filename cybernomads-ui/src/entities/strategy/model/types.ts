export type StrategyPlaceholderType = 'string' | 'int'

export interface StrategyStringPlaceholderDto {
  type: 'string'
  key: string
  defaultValue: string
}

export interface StrategyIntPlaceholderDto {
  type: 'int'
  key: string
  defaultValue: number
}

export type StrategyPlaceholderDto = StrategyStringPlaceholderDto | StrategyIntPlaceholderDto

export interface StrategySummaryDto {
  strategyId: string
  name: string
  summary: string
  tags: string[]
  updatedAt: string
}

export interface StrategyDetailDto extends StrategySummaryDto {
  contentMarkdown: string
  placeholders: StrategyPlaceholderDto[]
  createdAt: string
}

export interface ListStrategiesResultDto {
  items: StrategySummaryDto[]
}

export interface CreateStrategyInput {
  name: string
  summary?: string
  tags?: string[]
  contentMarkdown: string
}

export interface UpdateStrategyInput {
  name: string
  summary?: string
  tags?: string[]
  contentMarkdown: string
}

export interface SaveStrategyInput extends CreateStrategyInput {
  id?: string
}

export interface StrategyPlaceholderRecord {
  type: StrategyPlaceholderType
  key: string
  defaultValue: string | number
  displayDefaultValue: string
  declaration: string
}

export interface StrategyRecord {
  id: string
  name: string
  summary: string
  tags: string[]
  updatedAt: string
  updatedAtLabel: string
}

export interface StrategyDetailRecord extends StrategyRecord {
  contentMarkdown: string
  placeholders: StrategyPlaceholderRecord[]
  createdAt: string
  createdAtLabel: string
}
