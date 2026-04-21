import { flushPromises, mount } from '@vue/test-utils'
import { beforeAll, describe, expect, it, vi } from 'vitest'
import { createMemoryHistory, createRouter } from 'vue-router'

import { mapAccountSummaryDtoToRecord } from '@/entities/account/model/mappers'
import type { AccountSummaryDto } from '@/entities/account/model/types'
import AccountDetailPage from '@/pages/accounts/detail/ui/AccountDetailPage.vue'
import AccountsListPage from '@/pages/accounts/list/ui/AccountsListPage.vue'

const apiBaseUrl = import.meta.env.VITE_API_BASE_URL?.trim()
const smokeEnabled =
  import.meta.env.VITE_USE_REAL_ACCOUNT_API === 'true' &&
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

  const account = list.items.find((item) => item.platformAccountUid === 'account-bili-main') ?? list.items[0]

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
    currentDisplayName = account.displayName
    const mappedAccount = mapAccountSummaryDtoToRecord(account)
    expectedListStateLabel = mappedAccount.state.label
    expectedPlatformLabel = mappedAccount.platformView.label
  })

  it('renders list page from real backend account summaries', async () => {
    const { wrapper } = await mountWithRouter('/accounts', AccountsListPage, '/accounts', [
      { path: '/accounts/:accountId', component: { template: '<div>detail route</div>' } },
    ])

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain(currentDisplayName)
    })

    expect(wrapper.text()).toContain(expectedListStateLabel)
    expect(wrapper.text()).toContain(expectedPlatformLabel)
  })

  it('saves detail form, validates availability, deletes and restores through real backend', async () => {
    const { wrapper } = await mountWithRouter(
      `/accounts/${accountId}`,
      AccountDetailPage,
      '/accounts/:accountId',
    )

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('账户配置')
      expect(wrapper.text()).toContain(currentDisplayName)
    })

    const editableInputs = wrapper.findAll('input[type="text"]')
    await editableInputs[0]!.setValue('Smoke Detail Updated')
    await editableInputs[1]!.setValue('updated remark')

    const primaryButtons = wrapper.findAll('button.account-primary-button')
    await primaryButtons[0]!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('基础资料已保存')
    })

    const savedDetail = (await fetch(`${apiBaseUrl}/accounts/${accountId}`).then((response) =>
      response.json(),
    )) as { displayName: string; remark: string | null }

    expect(savedDetail.displayName).toBe('Smoke Detail Updated')
    expect(savedDetail.remark).toBe('updated remark')

    const textareas = wrapper.findAll('textarea')
    await textareas[1]!.setValue('smoke-detail-token')
    await primaryButtons[1]!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Stub verification succeeded.')
    })

    const validateButton = wrapper
      .findAll('button.account-secondary-button')
      .find((button) => button.text().includes('验证连接'))

    expect(validateButton).toBeTruthy()
    await validateButton!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('Stub availability check succeeded.')
    })

    let lifecycleButton = wrapper
      .findAll('button.account-secondary-button')
      .find((button) => button.text().includes('逻辑删除账号'))

    expect(lifecycleButton).toBeTruthy()
    await lifecycleButton!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('账号已逻辑删除')
    })

    const deletedDetail = (await fetch(`${apiBaseUrl}/accounts/${accountId}`).then((response) =>
      response.json(),
    )) as { lifecycleStatus: string }

    expect(deletedDetail.lifecycleStatus).toBe('deleted')

    lifecycleButton = wrapper
      .findAll('button.account-secondary-button')
      .find((button) => button.text().includes('恢复账号'))

    expect(lifecycleButton).toBeTruthy()
    await lifecycleButton!.trigger('click')
    await flushPromises()

    await vi.waitFor(() => {
      expect(wrapper.text()).toContain('账号已恢复为可管理状态')
    })

    const restoredDetail = (await fetch(`${apiBaseUrl}/accounts/${accountId}`).then((response) =>
      response.json(),
    )) as { lifecycleStatus: string }

    expect(restoredDetail.lifecycleStatus).toBe('active')
  })
})
