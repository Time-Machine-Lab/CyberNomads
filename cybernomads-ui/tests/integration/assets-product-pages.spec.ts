import { flushPromises, mount } from '@vue/test-utils'
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import type { AssetRecord } from '@/entities/asset/model/types'
import AssetEditorPage from '@/pages/assets/editor/ui/AssetEditorPage.vue'
import AssetsListPage from '@/pages/assets/list/ui/AssetsListPage.vue'

const serviceMocks = vi.hoisted(() => ({
  listAssets: vi.fn(),
  getAssetById: vi.fn(),
  saveAsset: vi.fn(),
  deleteAsset: vi.fn(),
}))

vi.mock('@/entities/asset/api/asset-service', () => serviceMocks)

function createAsset(overrides: Partial<AssetRecord> = {}): AssetRecord {
  return {
    id: 'product-1',
    name: '后端产品资产',
    platform: 'Product',
    summary: '来自产品 API 的摘要。',
    markdown: '# 后端产品资产\n\n完整内容。',
    status: 'ready',
    updatedAt: '2026-04-23T08:00:00.000Z',
    createdAt: '2026-04-22T08:00:00.000Z',
    category: '产品内容',
    tags: ['产品'],
    targetLabels: ['产品上下文'],
    attachments: [],
    ...overrides,
  }
}

async function mountWithRouter(path: string, component: object, routePath: string) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: routePath, component },
      { path: '/assets', component: { template: '<div>assets route</div>' } },
      { path: '/assets/new', component: { template: '<div>new route</div>' } },
    ],
  })

  await router.push(path)
  await router.isReady()

  const wrapper = mount(component, {
    global: {
      plugins: [router],
    },
  })

  await flushPromises()

  return { wrapper, router }
}

describe('assets product pages', () => {
  beforeEach(() => {
    vi.clearAllMocks()
    serviceMocks.listAssets.mockResolvedValue([createAsset()])
    serviceMocks.getAssetById.mockResolvedValue(createAsset())
    serviceMocks.saveAsset.mockResolvedValue(createAsset())
    serviceMocks.deleteAsset.mockResolvedValue('deleted')
  })

  it('renders product summaries on the assets list page through the entity API boundary', async () => {
    const { wrapper } = await mountWithRouter('/assets', AssetsListPage, '/assets')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="assets-grid"]').text()).toContain('后端产品资产')
    })

    expect(serviceMocks.listAssets).toHaveBeenCalledTimes(1)
    expect(wrapper.text()).toContain('来自产品 API 的摘要。')
  })

  it('renders an empty state when the product list is empty', async () => {
    serviceMocks.listAssets.mockResolvedValueOnce([])

    const { wrapper } = await mountWithRouter('/assets', AssetsListPage, '/assets')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="assets-empty-state"]').text()).toContain('还没有产品资产')
    })
  })

  it('renders a recoverable error state when list loading fails', async () => {
    serviceMocks.listAssets.mockRejectedValueOnce(new Error('backend unavailable'))

    const { wrapper } = await mountWithRouter('/assets', AssetsListPage, '/assets')

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="assets-error-state"]').text()).toContain('加载失败')
    })
  })

  it('deletes an asset from the overflow menu without triggering editor navigation', async () => {
    const { wrapper, router } = await mountWithRouter('/assets', AssetsListPage, '/assets')

    await wrapper.get('[data-testid="asset-menu-trigger-product-1"]').trigger('click')
    await wrapper.get('[data-testid="asset-delete-action-product-1"]').trigger('click')
    await wrapper.get('[data-testid="asset-delete-confirm-product-1"]').trigger('click')
    await flushPromises()

    expect(serviceMocks.deleteAsset).toHaveBeenCalledWith('product-1')
    expect(router.currentRoute.value.path).toBe('/assets')
    expect(wrapper.find('[data-testid="assets-grid"]').exists()).toBe(false)
    expect(wrapper.get('[data-testid="assets-action-feedback"]').text()).toContain('已删除')
  })

  it('keeps the asset visible when delete fails', async () => {
    serviceMocks.deleteAsset.mockRejectedValueOnce(new Error('delete failed'))

    const { wrapper } = await mountWithRouter('/assets', AssetsListPage, '/assets')

    await wrapper.get('[data-testid="asset-menu-trigger-product-1"]').trigger('click')
    await wrapper.get('[data-testid="asset-delete-action-product-1"]').trigger('click')
    await wrapper.get('[data-testid="asset-delete-confirm-product-1"]').trigger('click')
    await flushPromises()

    expect(wrapper.get('[data-testid="assets-grid"]').text()).toContain('后端产品资产')
    expect(wrapper.get('[data-testid="assets-action-feedback"]').text()).toContain('删除')
  })

  it('loads full product detail into the editor', async () => {
    const { wrapper } = await mountWithRouter(
      '/assets/product-1/edit',
      AssetEditorPage,
      '/assets/:assetId/edit',
    )

    await vi.waitFor(() => {
      expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('完整内容')
    })

    expect(serviceMocks.getAssetById).toHaveBeenCalledWith('product-1')
    expect((wrapper.get('input[required]').element as HTMLInputElement).value).toBe('后端产品资产')
  })

  it('renders a back link and removes unsupported target metadata from the editor header', async () => {
    const { wrapper } = await mountWithRouter(
      '/assets/product-1/edit',
      AssetEditorPage,
      '/assets/:assetId/edit',
    )

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="asset-editor-back-link"]').text()).toContain('返回资产列表')
    })

    expect(wrapper.text()).not.toContain('目标节点')
  })

  it('renders not-found state for a missing product detail', async () => {
    serviceMocks.getAssetById.mockResolvedValueOnce(null)

    const { wrapper } = await mountWithRouter(
      '/assets/missing/edit',
      AssetEditorPage,
      '/assets/:assetId/edit',
    )

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="asset-editor-not-found-state"]').text()).toContain(
        '未找到产品资产',
      )
    })
  })

  it('prevents invalid saves and preserves input when saving fails', async () => {
    serviceMocks.saveAsset.mockRejectedValueOnce(new Error('save failed'))

    const { wrapper } = await mountWithRouter('/assets/new', AssetEditorPage, '/assets/new')

    await wrapper.get('textarea').setValue('')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交资产'))!
      .trigger('click')

    expect(wrapper.get('[data-testid="asset-editor-alert"]').text()).toContain('产品标题')

    await wrapper.get('input[required]').setValue('失败保留测试产品')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交资产'))!
      .trigger('click')

    expect(wrapper.get('[data-testid="asset-editor-alert"]').text()).toContain('Markdown')

    await wrapper.get('textarea').setValue('# 保留内容\n\n保存失败后仍在。')
    await wrapper
      .findAll('button')
      .find((button) => button.text().includes('提交资产'))!
      .trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.get('[data-testid="asset-editor-alert"]').text()).toContain('保存失败')
    })
    expect((wrapper.get('textarea').element as HTMLTextAreaElement).value).toContain('保存失败后仍在')
  })

  it('shows a success message after creating a product', async () => {
    vi.useFakeTimers()

    try {
      const { wrapper, router } = await mountWithRouter('/assets/new', AssetEditorPage, '/assets/new')

      await wrapper.get('input[required]').setValue('联调产品资产')
      await wrapper.get('textarea').setValue('# 联调产品资产\n\n用于验证创建成功提示。')
      await wrapper
        .findAll('button')
        .find((button) => button.text().includes('提交资产'))!
        .trigger('click')
      await flushPromises()

      expect(wrapper.get('[data-testid="asset-editor-alert"]').text()).toContain('产品创建成功')

      await vi.advanceTimersByTimeAsync(900)
      await flushPromises()

      expect(router.currentRoute.value.path).toBe('/assets')
    } finally {
      vi.useRealTimers()
    }
  })
})
