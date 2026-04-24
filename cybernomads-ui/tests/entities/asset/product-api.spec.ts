import { beforeEach, describe, expect, it, vi } from 'vitest'

import {
  createAsset,
  deleteAsset,
  getAssetById,
  listAssets,
  saveAsset,
  updateAsset,
} from '@/entities/asset/api/asset-service'
import {
  mapProductDetailDtoToAssetRecord,
  mapProductSummaryDtoToAssetRecord,
} from '@/entities/asset/model/mappers'

function createJsonResponse(payload: unknown, status = 200) {
  return new Response(JSON.stringify(payload), {
    status,
    headers: {
      'Content-Type': 'application/json',
    },
  })
}

function createNoContentResponse(status = 204) {
  return new Response(null, { status })
}

function createSaveInput(id?: string) {
  return {
    id,
    name: '联调产品',
    platform: 'Bilibili',
    summary: 'UI 摘要不会提交给产品 API',
    markdown: '# 联调产品\n\n完整产品内容。',
    status: 'ready' as const,
    category: '联调',
    tags: ['不提交'],
    targetLabels: ['不提交'],
  }
}

describe('asset product API integration', () => {
  beforeEach(() => {
    vi.restoreAllMocks()
  })

  it('maps product summary dto to asset record without requiring markdown content', () => {
    const record = mapProductSummaryDtoToAssetRecord({
      productId: 'product-1',
      name: '后端产品',
      updatedAt: '2026-04-23T08:00:00.000Z',
    })

    expect(record.id).toBe('product-1')
    expect(record.name).toBe('后端产品')
    expect(record.markdown).toBe('')
    expect(record.updatedAt).toBe('2026-04-23T08:00:00.000Z')
  })

  it('maps product detail dto to asset record with full markdown context', () => {
    const record = mapProductDetailDtoToAssetRecord({
      productId: 'product-detail',
      name: '详情产品',
      contentMarkdown: '# 详情产品\n\n这是一段完整产品上下文。',
      createdAt: '2026-04-22T08:00:00.000Z',
      updatedAt: '2026-04-23T08:00:00.000Z',
    })

    expect(record.id).toBe('product-detail')
    expect(record.markdown).toContain('完整产品上下文')
    expect(record.summary).toBe('这是一段完整产品上下文。')
  })

  it('lists products through the real product API source', async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      createJsonResponse({
        items: [
          {
            productId: 'product-list',
            name: '列表产品',
            updatedAt: '2026-04-23T08:00:00.000Z',
          },
        ],
      }),
    )
    vi.stubGlobal('fetch', fetchMock)

    const result = await listAssets({ source: 'real' })

    expect(new URL(String(fetchMock.mock.calls[0]?.[0])).pathname).toBe('/api/products')
    expect(fetchMock.mock.calls[0]?.[1]).toEqual(
      expect.objectContaining({
        body: undefined,
      }),
    )
    expect(result[0]?.id).toBe('product-list')
  })

  it('loads product detail and converts 404 to null', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(
        createJsonResponse({
          productId: 'product-detail',
          name: '详情产品',
          contentMarkdown: '# 详情产品',
          createdAt: '2026-04-22T08:00:00.000Z',
          updatedAt: '2026-04-23T08:00:00.000Z',
        }),
      )
      .mockResolvedValueOnce(createJsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(getAssetById('product-detail', { source: 'real' })).resolves.toMatchObject({
      id: 'product-detail',
      markdown: '# 详情产品',
    })
    await expect(getAssetById('missing-product', { source: 'real' })).resolves.toBeNull()
  })

  it('creates and updates products with contract-only request bodies', async () => {
    const fetchMock = vi.fn().mockImplementation((_url: URL, init?: RequestInit) => {
      const body = JSON.parse(String(init?.body)) as Record<string, unknown>

      return Promise.resolve(
        createJsonResponse({
          productId: body.name === '联调产品' ? 'product-created' : 'product-updated',
          name: body.name,
          contentMarkdown: body.contentMarkdown,
          createdAt: '2026-04-22T08:00:00.000Z',
          updatedAt: '2026-04-23T08:00:00.000Z',
        }),
      )
    })
    vi.stubGlobal('fetch', fetchMock)

    await createAsset(createSaveInput(), { source: 'real' })
    await updateAsset('product-created', createSaveInput('product-created'), { source: 'real' })
    await saveAsset(createSaveInput('product-saved'), { source: 'real' })

    const createInit = fetchMock.mock.calls[0]?.[1] as RequestInit
    const updateUrl = fetchMock.mock.calls[1]?.[0] as URL
    const updateInit = fetchMock.mock.calls[1]?.[1] as RequestInit

    expect(createInit.method).toBe('POST')
    expect(JSON.parse(String(createInit.body))).toEqual({
      name: '联调产品',
      contentMarkdown: '# 联调产品\n\n完整产品内容。',
    })
    expect(updateUrl.pathname).toBe('/api/products/product-created')
    expect(updateInit.method).toBe('PUT')
    expect(JSON.parse(String(updateInit.body))).toEqual({
      name: '联调产品',
      contentMarkdown: '# 联调产品\n\n完整产品内容。',
    })
  })

  it('deletes products through the documented delete contract and handles 404 as stale state', async () => {
    const fetchMock = vi
      .fn()
      .mockResolvedValueOnce(createNoContentResponse())
      .mockResolvedValueOnce(createJsonResponse({ message: 'not found' }, 404))
    vi.stubGlobal('fetch', fetchMock)

    await expect(deleteAsset('product-delete', { source: 'real' })).resolves.toBe('deleted')
    await expect(deleteAsset('product-missing', { source: 'real' })).resolves.toBe('missing')

    const deleteUrl = fetchMock.mock.calls[0]?.[0] as URL
    const deleteInit = fetchMock.mock.calls[0]?.[1] as RequestInit

    expect(deleteUrl.pathname).toBe('/api/products/product-delete')
    expect(deleteInit.method).toBe('DELETE')
    expect(deleteInit.body).toBeUndefined()
  })
})
