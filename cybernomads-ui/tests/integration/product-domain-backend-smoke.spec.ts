import { describe, expect, it } from 'vitest'

const apiBaseUrl = import.meta.env.VITE_BACKEND_SMOKE_BASE_URL?.trim()
const smokeDescribe = apiBaseUrl ? describe.sequential : describe.skip

async function getJson<T>(path: string) {
  const response = await fetch(`${apiBaseUrl}${path}`)
  expect(response.ok).toBe(true)
  return (await response.json()) as T
}

smokeDescribe('product-domain backend smoke', () => {
  it('reads the MVP product-domain endpoints from a running backend', async () => {
    const [agentStatus, accounts, products, strategies, trafficWorks, tasks] = await Promise.all([
      getJson<{ hasCurrentService: boolean; isUsable: boolean }>('/agent-services/current/status'),
      getJson<{ items: unknown[] }>('/accounts'),
      getJson<{ items: unknown[] }>('/products'),
      getJson<{ items: unknown[] }>('/strategies'),
      getJson<{ items: Array<{ trafficWorkId: string }> }>('/traffic-works'),
      getJson<{ items: unknown[] }>('/tasks'),
    ])

    expect(typeof agentStatus.hasCurrentService).toBe('boolean')
    expect(typeof agentStatus.isUsable).toBe('boolean')
    expect(Array.isArray(accounts.items)).toBe(true)
    expect(Array.isArray(products.items)).toBe(true)
    expect(Array.isArray(strategies.items)).toBe(true)
    expect(Array.isArray(trafficWorks.items)).toBe(true)
    expect(Array.isArray(tasks.items)).toBe(true)
  })
})
