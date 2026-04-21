function parsePositiveInteger(value: string | undefined, fallback: number) {
  const parsed = Number(value)

  if (!Number.isInteger(parsed) || parsed <= 0) {
    return fallback
  }

  return parsed
}

function parseBooleanFlag(value: string | undefined, fallback: boolean) {
  if (value === undefined) {
    return fallback
  }

  return value === 'true'
}

export const env = {
  apiBaseUrl: import.meta.env.VITE_API_BASE_URL?.trim() || '/api',
  pollingIntervalMs: parsePositiveInteger(import.meta.env.VITE_POLLING_INTERVAL_MS, 4000),
  useMockApi: import.meta.env.VITE_USE_MOCK_API !== 'false',
  useRealAccountApi: parseBooleanFlag(import.meta.env.VITE_USE_REAL_ACCOUNT_API, false),
  mockScenario: import.meta.env.VITE_MOCK_SCENARIO?.trim() || 'running',
} as const
