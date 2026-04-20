export type ClassValue =
  | string
  | false
  | null
  | undefined
  | Record<string, boolean>
  | ClassValue[]

export function cx(...values: ClassValue[]) {
  const tokens: string[] = []

  const visit = (value: ClassValue) => {
    if (!value) {
      return
    }

    if (typeof value === 'string') {
      tokens.push(value)
      return
    }

    if (Array.isArray(value)) {
      value.forEach(visit)
      return
    }

    for (const [key, enabled] of Object.entries(value)) {
      if (enabled) {
        tokens.push(key)
      }
    }
  }

  values.forEach(visit)

  return tokens.join(' ')
}
