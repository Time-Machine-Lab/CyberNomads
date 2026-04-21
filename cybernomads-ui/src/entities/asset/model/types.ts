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
