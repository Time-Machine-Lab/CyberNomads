import {
  mapProductDetailDtoToAssetRecord,
  mapProductSummaryDtoToAssetRecord,
} from '@/entities/asset/model/mappers'
import type {
  AssetRecord,
  CreateProductInput,
  ListProductsResultDto,
  ProductDetailDto,
  SaveAssetInput,
  UpdateProductInput,
} from '@/entities/asset/model/types'
import { HttpClientError, requestJson } from '@/shared/api/http-client'

type AssetDataSource = 'mock' | 'real'

export interface AssetRequestOptions {
  source?: AssetDataSource
}

const PRODUCT_API_ROOT = '/products'

export function isRealProductApiEnabled() {
  return true
}

function mapSaveInputToProductRequest(input: SaveAssetInput): CreateProductInput | UpdateProductInput {
  return {
    name: input.name,
    contentMarkdown: input.markdown,
  }
}

export async function listAssets(_options: AssetRequestOptions = {}): Promise<AssetRecord[]> {
  void _options

  const result = await requestJson<ListProductsResultDto>(PRODUCT_API_ROOT)
  return result.items.map(mapProductSummaryDtoToAssetRecord)
}

export async function getAssetById(
  id: string,
  _options: AssetRequestOptions = {},
): Promise<AssetRecord | null> {
  void _options

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
  _options: AssetRequestOptions = {},
): Promise<AssetRecord> {
  void _options

  const dto = await requestJson<ProductDetailDto>(PRODUCT_API_ROOT, {
    method: 'POST',
    body: mapSaveInputToProductRequest(input),
  })

  return mapProductDetailDtoToAssetRecord(dto)
}

export async function updateAsset(
  id: string,
  input: SaveAssetInput,
  _options: AssetRequestOptions = {},
): Promise<AssetRecord> {
  void _options

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
