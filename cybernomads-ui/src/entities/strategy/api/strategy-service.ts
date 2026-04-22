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
import { env } from '@/shared/config/env'
import { getStrategyData, listStrategiesData, saveStrategyData } from '@/shared/mocks/runtime'

type StrategyDataSource = 'mock' | 'real'

export interface StrategyRequestOptions {
  source?: StrategyDataSource
}

const STRATEGY_API_ROOT = '/strategies'

export function isRealStrategyApiEnabled() {
  return env.useRealStrategyApi
}

function resolveSource(source?: StrategyDataSource): StrategyDataSource {
  return source ?? (env.useRealStrategyApi ? 'real' : 'mock')
}

function assertRealStrategyApi(source: StrategyDataSource) {
  if (source === 'real') {
    return
  }

  throw new Error('当前未启用策略模块真实后端，请开启 VITE_USE_REAL_STRATEGY_API 后重试。')
}

export async function listStrategies(
  options: StrategyRequestOptions = {},
): Promise<StrategyRecord[]> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    const result = listStrategiesData()
    return result.items.map(mapStrategySummaryDtoToRecord)
  }

  const result = await requestJson<ListStrategiesResultDto>(STRATEGY_API_ROOT)
  return result.items.map(mapStrategySummaryDtoToRecord)
}

export async function getStrategyById(
  id: string,
  options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord | null> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    const dto = getStrategyData(id)
    return dto ? mapStrategyDetailDtoToRecord(dto) : null
  }

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
  options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return mapStrategyDetailDtoToRecord(saveStrategyData(input))
  }

  const dto = await requestJson<StrategyDetailDto>(STRATEGY_API_ROOT, {
    method: 'POST',
    body: input,
  })

  return mapStrategyDetailDtoToRecord(dto)
}

export async function updateStrategy(
  id: string,
  input: UpdateStrategyInput,
  options: StrategyRequestOptions = {},
): Promise<StrategyDetailRecord> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return mapStrategyDetailDtoToRecord(
      saveStrategyData({
        ...input,
        id,
      }),
    )
  }

  assertRealStrategyApi(source)

  const dto = await requestJson<StrategyDetailDto>(`${STRATEGY_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: input,
  })

  return mapStrategyDetailDtoToRecord(dto)
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
