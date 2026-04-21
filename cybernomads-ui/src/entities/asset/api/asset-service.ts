import type { AssetRecord, SaveAssetInput } from '@/entities/asset/model/types'
import { env } from '@/shared/config/env'
import { getAssetData, listAssetsData, saveAssetData } from '@/shared/mocks/runtime'

function assertMockOnly() {
  if (!env.useMockApi) {
    throw new Error('Real asset APIs are not wired yet. Enable mock mode to continue.')
  }
}

export async function listAssets(): Promise<AssetRecord[]> {
  assertMockOnly()
  return listAssetsData()
}

export async function getAssetById(id: string): Promise<AssetRecord | null> {
  assertMockOnly()
  return getAssetData(id)
}

export async function saveAsset(input: SaveAssetInput): Promise<AssetRecord> {
  assertMockOnly()
  return saveAssetData(input)
}
