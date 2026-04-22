import type {
  StrategyDetailDto,
  StrategyDetailRecord,
  StrategyPlaceholderDto,
  StrategyPlaceholderRecord,
  StrategyRecord,
  StrategySummaryDto,
} from '@/entities/strategy/model/types'

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

function normalizeSummary(summary: string | null | undefined, contentMarkdown?: string) {
  const trimmedSummary = summary?.trim()

  if (trimmedSummary) {
    return trimmedSummary
  }

  const markdownLines = (contentMarkdown ?? '')
    .split('\n')
    .map((line) => line.trim())
    .filter(Boolean)
  const firstContentLine = markdownLines.find((line) => !line.startsWith('#'))

  return firstContentLine?.slice(0, 120) ?? '暂无摘要'
}

function normalizeTags(tags: string[] | null | undefined) {
  return (tags ?? []).map((tag) => tag.trim()).filter(Boolean)
}

function formatPlaceholderDefaultValue(placeholder: StrategyPlaceholderDto) {
  if (placeholder.type === 'int') {
    return String(placeholder.defaultValue)
  }

  return placeholder.defaultValue
}

export function buildPlaceholderDeclaration(placeholder: StrategyPlaceholderDto) {
  const defaultValue =
    placeholder.type === 'int'
      ? placeholder.defaultValue
      : JSON.stringify(placeholder.defaultValue)

  return `{{${placeholder.type}:${placeholder.key}=${defaultValue}}}`
}

export function mapStrategyPlaceholderDtoToRecord(
  placeholder: StrategyPlaceholderDto,
): StrategyPlaceholderRecord {
  return {
    ...placeholder,
    displayDefaultValue: formatPlaceholderDefaultValue(placeholder),
    declaration: buildPlaceholderDeclaration(placeholder),
  }
}

export function mapStrategySummaryDtoToRecord(dto: StrategySummaryDto): StrategyRecord {
  return {
    id: dto.strategyId,
    name: dto.name,
    summary: normalizeSummary(dto.summary),
    tags: normalizeTags(dto.tags),
    updatedAt: dto.updatedAt,
    updatedAtLabel: formatTimestamp(dto.updatedAt) ?? '未更新',
  }
}

export function mapStrategyDetailDtoToRecord(dto: StrategyDetailDto): StrategyDetailRecord {
  const summaryRecord = mapStrategySummaryDtoToRecord(dto)

  return {
    ...summaryRecord,
    summary: normalizeSummary(dto.summary, dto.contentMarkdown),
    contentMarkdown: dto.contentMarkdown,
    placeholders: dto.placeholders.map(mapStrategyPlaceholderDtoToRecord),
    createdAt: dto.createdAt,
    createdAtLabel: formatTimestamp(dto.createdAt) ?? '未知',
  }
}

export function parseStrategyPlaceholdersFromMarkdown(contentMarkdown: string): StrategyPlaceholderDto[] {
  const matches = contentMarkdown.matchAll(/\{\{(string|int):([a-zA-Z_][\w.-]*)=("(?:[^"\\]|\\.)*"|-?\d+)\}\}/g)
  const placeholders: StrategyPlaceholderDto[] = []

  for (const match of matches) {
    const [, type, key, rawDefaultValue] = match

    if (type === 'int') {
      const value = Number(rawDefaultValue)

      if (Number.isInteger(value)) {
        placeholders.push({
          type: 'int',
          key,
          defaultValue: value,
        })
      }

      continue
    }

    try {
      placeholders.push({
        type: 'string',
        key,
        defaultValue: JSON.parse(rawDefaultValue),
      })
    } catch {
      continue
    }
  }

  return placeholders
}
