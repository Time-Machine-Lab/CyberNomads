import { describe, expect, it } from 'vitest'

import { cx } from '@/shared/lib/cx'

describe('cx', () => {
  it('joins truthy values into a single class string', () => {
    expect(cx('surface-card', ['is-active'], { 'is-running': true, muted: false })).toBe(
      'surface-card is-active is-running',
    )
  })
})
