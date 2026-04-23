export type AssetStatus = 'draft' | 'ready'

export interface AssetAttachmentRecord {
  id: string
  name: string
  kind: 'pdf' | 'image' | 'video' | 'link'
}

export interface AssetRecord {
  id: string
  name: string
  platform: string
  summary: string
  markdown: string
  status: AssetStatus
  updatedAt: string
  createdAt: string
  category: string
  tags: string[]
  targetLabels: string[]
  attachments: AssetAttachmentRecord[]
}

export interface SaveAssetInput {
  id?: string
  name: string
  platform: string
  summary: string
  markdown: string
  status: AssetStatus
  category?: string
  tags?: string[]
  targetLabels?: string[]
}

export interface ProductSummaryDto {
  productId: string
  name: string
  updatedAt: string
}

export interface ProductDetailDto extends ProductSummaryDto {
  contentMarkdown: string
  createdAt: string
}

export interface ListProductsResultDto {
  items: ProductSummaryDto[]
}

export interface CreateProductInput {
  name: string
  contentMarkdown: string
}

export type UpdateProductInput = CreateProductInput
