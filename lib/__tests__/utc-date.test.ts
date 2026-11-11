import { describe, expect, it } from 'vitest'
import { utcDate } from '../utc-date'

describe('utcDate', () => {
  it('reads a zone-less stamp as UTC', () => {
    expect(utcDate('2026-11-11T16:44:00.123456').toISOString()).toBe(
      '2026-11-11T16:44:00.123Z'
    )
  })

  it('leaves a stamp that names its zone alone', () => {
    expect(utcDate('2026-11-11T16:44:00Z').getTime()).toBe(
      Date.UTC(2026, 10, 11, 16, 44)
    )
    expect(utcDate('2026-11-11T10:44:00-06:00').getTime()).toBe(
      Date.UTC(2026, 10, 11, 16, 44)
    )
  })
})
