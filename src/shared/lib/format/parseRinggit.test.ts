import { describe, expect, it } from 'vitest'

import { formatRinggit } from './formatRinggit'
import { parseRinggit } from './parseRinggit'

describe('parseRinggit', () => {
  it('reads whole ringgit and up to two decimals as cents', () => {
    expect(parseRinggit('240')).toBe(24000)
    expect(parseRinggit('240.5')).toBe(24050)
    expect(parseRinggit('240.50')).toBe(24050)
    expect(parseRinggit('0.29')).toBe(29)
    expect(parseRinggit('0')).toBe(0)
  })

  it('ignores "RM", spaces and thousands commas', () => {
    expect(parseRinggit('RM 240.50')).toBe(24050)
    expect(parseRinggit('rm240')).toBe(24000)
    expect(parseRinggit(' RM 1,200.5 ')).toBe(120050)
    expect(parseRinggit('1 200')).toBe(120000)
  })

  it('reads an empty field, or just "RM", as no amount', () => {
    expect(parseRinggit('')).toBeNull()
    expect(parseRinggit('   ')).toBeNull()
    expect(parseRinggit('RM ')).toBeNull()
  })

  it('keeps a minus sign, so the database can refuse the amount', () => {
    expect(parseRinggit('-240')).toBe(-24000)
    expect(parseRinggit('RM -0.50')).toBe(-50)
    expect(parseRinggit('-0')).toBe(0)
  })

  it('calls anything else invalid', () => {
    for (const text of ['240.555', '240.', '.5', '12a', 'abc', '1.2.3', '--5', '+5', 'RM-']) {
      expect(parseRinggit(text)).toBe('invalid')
    }
    expect(parseRinggit('9'.repeat(20))).toBe('invalid')
  })

  it('reads back what formatRinggit writes', () => {
    for (const cents of [0, 5, 24000, 24050, 120050, 123456789]) {
      expect(parseRinggit(formatRinggit(cents))).toBe(cents)
      expect(parseRinggit(formatRinggit(cents, { symbol: false }))).toBe(cents)
    }
  })
})
