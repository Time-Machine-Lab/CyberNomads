import type { AssetRecord, ProductDetailDto, ProductSummaryDto } from '@/entities/asset/model/types'

function normalizeMarkdownSummary(contentMarkdown?: string) {
  const firstContentLine = (contentMarkdown ?? '')
    .split('\n')
    .map((line) => line.trim())
    .find((line) => line && !line.startsWith('#'))

  return firstContentLine?.slice(0, 120) ?? '暂无摘要'
}

function createProductDisplayDefaults(productId: string) {
  return {
    platform: 'Product',
    status: 'ready' as const,
    category: '产品内容',
    tags: ['产品'],
    targetLabels: ['产品上下文'],
    attachments: [],
    createdAt: '',
    summary: '暂无摘要',
    markdown: '',
    id: productId,
  }
}

export function mapProductSummaryDtoToAssetRecord(dto: ProductSummaryDto): AssetRecord {
  return {
    ...createProductDisplayDefaults(dto.productId),
    name: dto.name,
    updatedAt: dto.updatedAt,
  }
}

export function mapProductDetailDtoToAssetRecord(dto: ProductDetailDto): AssetRecord {
  return {
    ...createProductDisplayDefaults(dto.productId),
    name: dto.name,
    summary: normalizeMarkdownSummary(dto.contentMarkdown),
    markdown: dto.contentMarkdown,
    createdAt: dto.createdAt,
    updatedAt: dto.updatedAt,
  }
}
