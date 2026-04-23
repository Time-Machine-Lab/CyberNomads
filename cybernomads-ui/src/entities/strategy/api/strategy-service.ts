import {
  mapStrategyDetailDtoToRecord,
  mapStrategySummaryDtoToRecord,
} from '@/entities/strategy/model/mappers'
import type {
  CreateStrategyInput,
  ListStrategiesResultDto,
  SaveStrategyInput,
  StrategyDetailDto,
  StrategyDetailRecord,
  StrategyRecord,
  UpdateStrategyInput,
} from '@/entities/strategy/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

type StrategyDataSource = 'mock' | 'real'

export interface StrategyRequestOptions {
  source?: StrategyDataSource
}

const STRATEGY_API_ROOT = '/strategies'

export function isRealStrategyApiEnabled() {
  return true
}

export async function listStrategies(
  _options: StrategyRequestOptions = {},
): Promise<StrategyRecord[]> {
  void _options

  const result = await requestJson<ListStrategiesResultDto>(STRATEGY_API_ROOT)
  return result.items.map(mapStrategySummaryDtoToRecord)
}

export async function getStrategyById(
  id: string,
  _options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord | null> {
  void _options

  try {
    const dto = await requestJson<StrategyDetailDto>(`${STRATEGY_API_ROOT}/${encodeURIComponent(id)}`)
    return mapStrategyDetailDtoToRecord(dto)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function createStrategy(
  input: CreateStrategyInput,
  _options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord> {
  void _options

  const dto = await requestJson<StrategyDetailDto>(STRATEGY_API_ROOT, {
    method: 'POST',
    body: input,
  })

  return mapStrategyDetailDtoToRecord(dto)
}

export async function updateStrategy(
  id: string,
  input: UpdateStrategyInput,
  _options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord> {
  void _options

  const dto = await requestJson<StrategyDetailDto>(`${STRATEGY_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  })

  return mapStrategyDetailDtoToRecord(dto)
}

export async function deleteStrategy(
  id: string,
  _options: StrategyRequestOptions = {},
): Promise<void> {
  void _options

  await requestJson(`${STRATEGY_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'DELETE',
  })
}

export async function saveStrategy(
  input: SaveStrategyInput,
  options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord> {
  if (input.id) {
    return updateStrategy(
      input.id,
      {
        name: input.name,
        summary: input.summary,
        tags: input.tags,
        contentMarkdown: input.contentMarkdown,
      },
      options,
    )
  }

  return createStrategy(input, options)
}
