import { env } from '@/shared/config/env'

export class HttpClientError extends Error {
  readonly payload?: unknown
  readonly status: number

  constructor(message: string, status: number, payload?: unknown) {
    super(message)
    this.name = 'HttpClientError'
    this.status = status
    this.payload = payload
  }
}

export interface RequestJsonOptions extends Omit<RequestInit, 'body'> {
  body?: BodyInit | null | Record<string, unknown>
  query?: Record<string, string | number | boolean | null | undefined>
}

function resolveBaseUrl() {
  if (env.apiBaseUrl.startsWith('http://') || env.apiBaseUrl.startsWith('https://')) {
    return env.apiBaseUrl
  }

  const normalizedPath = env.apiBaseUrl.startsWith('/') ? env.apiBaseUrl : `/${env.apiBaseUrl}`

  return `${window.location.origin}${normalizedPath}`
}

function createUrl(path: string, query?: RequestJsonOptions['query']) {
  const normalizedPath = path.startsWith('/') ? path.slice(1) : path
  const url = new URL(normalizedPath, `${resolveBaseUrl().replace(/\/$/, '')}/`)

  if (query) {
    for (const [key, value] of Object.entries(query)) {
      if (value === undefined || value === null) {
        continue
      }

      url.searchParams.set(key, String(value))
    }
  }

  return url
}

function normalizeBody(body: RequestJsonOptions['body']) {
  if (!body || body instanceof FormData || body instanceof URLSearchParams || typeof body === 'string') {
    return body
  }

  return JSON.stringify(body)
}

export async function requestJson<T>(path: string, options: RequestJsonOptions = {}) {
  const { body, headers, query, ...rest } = options
  const response = await fetch(createUrl(path, query), {
    ...rest,
    body: normalizeBody(body),
    headers: {
      'Content-Type':
        body && !(body instanceof FormData) && !(body instanceof URLSearchParams)
          ? 'application/json'
          : '',
      ...headers,
    },
  })

  const contentType = response.headers.get('content-type') ?? ''
  const payload = contentType.includes('application/json')
    ? await response.json()
    : await response.text()

  if (!response.ok) {
    throw new HttpClientError(`Request failed with status ${response.status}`, response.status, payload)
  }

  return payload as T
}
