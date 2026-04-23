import type { AssetRecord, SaveAssetInput } from '@/entities/asset/model/types'
import {
  mapProductDetailDtoToAssetRecord,
  mapProductSummaryDtoToAssetRecord,
} from '@/entities/asset/model/mappers'
import type {
  CreateProductInput,
  ListProductsResultDto,
  ProductDetailDto,
  UpdateProductInput,
} from '@/entities/asset/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'
import { env } from '@/shared/config/env'
import { getAssetData, listAssetsData, saveAssetData } from '@/shared/mocks/runtime'

type AssetDataSource = 'mock' | 'real'

export interface AssetRequestOptions {
  source?: AssetDataSource
}

const PRODUCT_API_ROOT = '/products'

export function isRealProductApiEnabled() {
  return env.useRealProductApi
}

function resolveSource(source?: AssetDataSource): AssetDataSource {
  return source ?? (env.useRealProductApi ? 'real' : 'mock')
}

function mapSaveInputToProductRequest(input: SaveAssetInput): CreateProductInput | UpdateProductInput {
  return {
    name: input.name,
    contentMarkdown: input.markdown,
  }
}

export async function listAssets(options: AssetRequestOptions = {}): Promise<AssetRecord[]> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return listAssetsData()
  }

  const result = await requestJson<ListProductsResultDto>(PRODUCT_API_ROOT)
  return result.items.map(mapProductSummaryDtoToAssetRecord)
}

export async function getAssetById(
  id: string,
  options: AssetRequestOptions = {},
): Promise<AssetRecord | null> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return getAssetData(id)
  }

  try {
    const dto = await requestJson<ProductDetailDto>(`${PRODUCT_API_ROOT}/${encodeURIComponent(id)}`)
    return mapProductDetailDtoToAssetRecord(dto)
  } catch (error) {
    if (error instanceof HttpClientError && error.status === 404) {
      return null
    }

    throw error
  }
}

export async function createAsset(
  input: SaveAssetInput,
  options: AssetRequestOptions = {},
): Promise<AssetRecord> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return saveAssetData(input)
  }

  const dto = await requestJson<ProductDetailDto>(PRODUCT_API_ROOT, {
    method: 'POST',
    body: mapSaveInputToProductRequest(input),
  })

  return mapProductDetailDtoToAssetRecord(dto)
}

export async function updateAsset(
  id: string,
  input: SaveAssetInput,
  options: AssetRequestOptions = {},
): Promise<AssetRecord> {
  const source = resolveSource(options.source)

  if (source === 'mock') {
    return saveAssetData({
      ...input,
      id,
    })
  }

  const dto = await requestJson<ProductDetailDto>(`${PRODUCT_API_ROOT}/${encodeURIComponent(id)}`, {
    method: 'PUT',
    body: mapSaveInputToProductRequest(input),
  })

  return mapProductDetailDtoToAssetRecord(dto)
}

export async function saveAsset(
  input: SaveAssetInput,
  options: AssetRequestOptions = {},
): Promise<AssetRecord> {
  if (input.id) {
    return updateAsset(input.id, input, options)
  }

  return createAsset(input, options)
}
