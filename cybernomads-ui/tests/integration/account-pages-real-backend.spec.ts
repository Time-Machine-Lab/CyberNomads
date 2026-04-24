import { flushPromises, mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { mapAccountSummaryDtoToRecord } from '@/entities/account/model/mappers'
import type { AccountSummaryDto } from '@/entities/account/model/types'
import AccountCreatePage from '@/pages/accounts/create/ui/AccountCreatePage.vue'
import AccountDetailPage from '@/pages/accounts/detail/ui/AccountDetailPage.vue'
import AccountsListPage from '@/pages/accounts/list/ui/AccountsListPage.vue'

const apiBaseUrl = import.meta.env.VITE_BACKEND_SMOKE_BASE_URL?.trim()
const smokeEnabled =
  typeof apiBaseUrl === 'string' &&
  apiBaseUrl.length > 0

const smokeDescribe = smokeEnabled ? describe.sequential : describe.skip

async function mountWithRouter(
  path: string,
  component: object,
  routePath: string,
  extraRoutes: Array<{ path: string; component: object; meta?: Record<string, unknown> }> = [],
) {
  const router = createRouter({
    history: createMemoryHistory(),
    routes: [
      { path: routePath, component },
      { path: '/accounts', component: { template: '<div>accounts list</div>' } },
      ...extraRoutes,
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

async function resolveSmokeAccount() {
  const base = apiBaseUrl!
  const listResponse = await fetch(`${base}/accounts`)
  const list = (await listResponse.json()) as {
    items: AccountSummaryDto[]
  }

  const account = list.items[0]

  if (!account) {
    throw new Error('Smoke backend does not contain any account record for page validation.')
  }

  return account
}

smokeDescribe('account pages real backend smoke', () => {
  let accountId = ''
  let currentDisplayName = ''
  let expectedListStateLabel = ''
  let expectedPlatformLabel = ''

  beforeAll(async () => {
    const account = await resolveSmokeAccount()
    accountId = account.accountId
    currentDisplayName = account.internalDisplayName
    const mappedAccount = mapAccountSummaryDtoToRecord(account)
    expectedListStateLabel = mappedAccount.state.label
    expectedPlatformLabel = mappedAccount.platformView.label
  })

  it('renders list page from real backend account summaries', async () => {
    const { wrapper } = await mountWithRouter('/accounts', AccountsListPage, '/accounts', [
      { path: '/accounts/new', component: { template: '<div>create route</div>' } },
      { path: '/accounts/:accountId', component: { template: '<div>detail route</div>' } },
    ])

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain(currentDisplayName)
    })

    expect(wrapper.text()).toContain(expectedListStateLabel)
    expect(wrapper.text()).toContain(expectedPlatformLabel)
    expect(wrapper.text()).toContain('新增账号')
  })

  it('creates an account through the create page and redirects to detail', async () => {
    const uniqueName = `Smoke Create ${Date.now()}`
    const { wrapper, router } = await mountWithRouter('/accounts/new', AccountCreatePage, '/accounts/new', [
      { path: '/accounts/:accountId', component: { template: '<div>detail route</div>' } },
    ])

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('新增账号')
    })

    await wrapper.get('[data-testid="create-internal-name"]').setValue(uniqueName)
    await wrapper.get('[data-testid="create-tags"]').setValue('smoke, create')
    await wrapper.get('[data-testid="create-submit"]').trigger('submit')
    await flushPromises()

    await vi.waitFor(() => {
      expect(String(router.currentRoute.value.path)).toMatch(/^\/accounts\/.+/)
    })

    const createdAccountId = String(router.currentRoute.value.params.accountId)
    const createdDetail = (await fetch(`${apiBaseUrl}/accounts/${createdAccountId}`).then((response) =>
      response.json(),
    )) as { internalDisplayName: string; connectionStatus: string }

    expect(createdDetail.internalDisplayName).toBe(uniqueName)
    expect(createdDetail.connectionStatus).toBe('not_logged_in')
  })

  it('saves detail form and verifies a manual token through the real backend', async () => {
    const { wrapper } = await mountWithRouter(
      `/accounts/${accountId}`,
      AccountDetailPage,
      '/accounts/:accountId',
    )

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('账户配置')
      expect(wrapper.text()).toContain(currentDisplayName)
    })

    await wrapper.get('[data-testid="detail-internal-name"]').setValue('Smoke Detail Updated')
    await wrapper.get('[data-testid="detail-remark"]').setValue('updated remark')
    await wrapper.get('[data-testid="detail-save-profile"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('基础资料已保存')
    })

    const savedDetail = (await fetch(`${apiBaseUrl}/accounts/${accountId}`).then((response) =>
      response.json(),
    )) as { internalDisplayName: string; remark: string | null }

    expect(savedDetail.internalDisplayName).toBe('Smoke Detail Updated')
    expect(savedDetail.remark).toBe('updated remark')

    await wrapper.get('[data-testid="detail-token-input"]').setValue('smoke-detail-token')
    await wrapper.get('[data-testid="detail-verify-connection"]').trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('连接验证成功')
    })

    const verifiedDetail = (await fetch(`${apiBaseUrl}/accounts/${accountId}`).then((response) =>
      response.json(),
    )) as { connectionStatus: string; currentCredential: { hasCredential: boolean } }

    expect(verifiedDetail.connectionStatus).toBe('connected')
    expect(verifiedDetail.currentCredential.hasCredential).toBe(true)
  })
})
